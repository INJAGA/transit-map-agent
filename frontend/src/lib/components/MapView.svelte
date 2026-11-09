<script lang="ts">
	import 'maplibre-gl/dist/maplibre-gl.css';
	import { onMount } from 'svelte';
	import { prefersReducedMotion, Tween } from 'svelte/motion';
	import type { Map, StyleSpecification } from 'maplibre-gl';
	import type { MapboxOverlay } from '@deck.gl/mapbox';
	import type { PickingInfo } from '@deck.gl/core';
	import type { GeoJsonLayer as GeoJsonLayerType } from '@deck.gl/layers';
	import type { H3HexagonLayer as H3HexagonLayerType } from '@deck.gl/geo-layers';
	import type { H3Count, H3CountsResponse } from '#lib/server/api/types.gen.js';
	import type { Feature } from 'geojson';
	import { basemapNames, uiState } from '#lib/agent/ui-state.svelte.js';
	import { mapHolder } from '#lib/agent/tools/capture-map.js';
	import { transitLayers } from '#lib/transit-layers.js';

	const osm: StyleSpecification = {
		version: 8,
		sources: {
			osm: {
				type: 'raster',
				tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
				tileSize: 256,
				maxzoom: 19,
				attribution:
					'© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
			}
		},
		layers: [{ id: 'osm', type: 'raster', source: 'osm' }]
	};
	const basemaps: Record<(typeof basemapNames)[number], StyleSpecification | string> = {
		OSM: osm,
		Positron: 'https://tiles.openfreemap.org/styles/positron',
		Bright: 'https://tiles.openfreemap.org/styles/bright'
	};

	function tooltipText(layerId: string | undefined, p: NonNullable<Feature['properties']>) {
		if (layerId === 'railways') return `${p.name}\n${p.operator}（${p.type}）`;
		if (layerId === 'bus-routes') return `バスルート\n${p.operator}`;
		// 浜松駅は42系統あり、全部並べると画面の高さを超えるので先頭だけ出す
		const all = p.routes as { name: string; type: string }[];
		const routes = all.slice(0, 10).map((r) => `・${r.name}（${r.type}）`);
		if (all.length > 10) routes.push(`…ほか ${all.length - 10} 系統`);
		return [`${p.name}`, p.operator, ...routes].join('\n');
	}

	function h3TooltipText({ h3, count }: H3Count) {
		// H3 のセル ID は 16 進の2文字目が解像度
		return `H3 セル（resolution ${parseInt(h3[1], 16)}）\n${h3}\n件数: ${count.toLocaleString()}`;
	}

	function tooltip({ layer, object, x, y }: PickingInfo<Feature | H3Count>) {
		if (!object) return null;
		const text =
			'count' in object
				? h3TooltipText(object)
				: object.properties && tooltipText(layer?.id, object.properties);
		if (!text) return null;
		// deck.gl は常にマウスの右下に出すので、画面の右半分・下半分では左・上に出して画面外にはみ出さないようにする
		const dx = x > innerWidth / 2 ? '-100%' : '0';
		const dy = y > innerHeight / 2 ? '-100%' : '0';
		return {
			text,
			// 幅が画面の半分を超えると左右の出し分けでも収まらないので折り返す
			style: { transform: `translate(${x}px, ${y}px) translate(${dx}, ${dy})`, maxWidth: '50vw' }
		};
	}

	let container: HTMLDivElement;
	let overlay = $state.raw<MapboxOverlay>();
	let GeoJsonLayer = $state.raw<typeof GeoJsonLayerType>();
	let H3HexagonLayer = $state.raw<typeof H3HexagonLayerType>();
	let h3Counts = $state.raw<H3CountsResponse>();
	// 解像度の切り替えで、前のデータをフェードアウトさせながら新しいデータをフェードインする
	let h3Prev = $state.raw<H3CountsResponse>();
	const h3Fade = new Tween(1, { duration: () => (prefersReducedMotion.current ? 0 : 400) });
	// フェード中に届いた結果. 途中で切り替えると表示が跳ねるので、終わってから最新の1つだけ出す
	let h3Pending: H3CountsResponse | undefined;

	function showH3(data: H3CountsResponse) {
		if (h3Fade.current < 1) {
			h3Pending = data;
			return;
		}
		h3Prev = h3Counts;
		h3Counts = data;
		h3Fade.set(0, { duration: 0 });
		h3Fade.set(1).then(() => {
			const next = h3Pending;
			h3Pending = undefined;
			if (next) showH3(next);
		});
	}
	let map = $state.raw<Map>();
	// 今 map に載せているベースマップ. 同じものを setStyle し直さないため
	let basemap = uiState.basemap;
	// flyTo は先に進行中の移動を止め、そのとき同期的に moveend が出る. その途中位置で新しい目的地を上書きしないため
	let flying = false;

	onMount(() => {
		let disposed = false;
		// maplibre / deck.gl はブラウザ専用なので SSR で読み込まないよう動的 import する
		Promise.all([
			import('maplibre-gl'),
			import('@deck.gl/mapbox'),
			import('@deck.gl/layers'),
			// その場で名前を取り出すと tree-shaking が効き、使わない地形・タイル系レイヤー (約 600 KB) を落とさずに済む
			import('@deck.gl/geo-layers').then(({ H3HexagonLayer }) => ({ H3HexagonLayer }))
		]).then(([{ Map }, { MapboxOverlay }, layers, geoLayers]) => {
			if (disposed) return;
			const { longitude, latitude, zoom } = uiState.mapView;
			const m = new Map({
				container,
				style: basemaps[basemap],
				center: [longitude, latitude],
				zoom,
				canvasContextAttributes: { preserveDrawingBuffer: true },
				attributionControl: {
					customAttribution:
						'出典: <a href="https://nlftp.mlit.go.jp/ksj/">国土数値情報</a>（国土交通省）を加工して作成'
				}
			});
			// カーソル: 通常は矢印, ホバーできる地物の上は指, ドラッグ中はつかむ手.
			// deck.gl の canvas は pointer-events: none なので maplibre の canvas に付ける
			let hovering = false;
			let dragging = false;
			const updateCursor = () =>
				(m.getCanvas().style.cursor = dragging ? 'grabbing' : hovering ? 'pointer' : 'default');
			updateCursor();
			m.on('dragstart', () => ((dragging = true), updateCursor()));
			m.on('dragend', () => ((dragging = false), updateCursor()));
			overlay = new MapboxOverlay({
				// capture_map が好きなときに canvas を読めるよう、描画後もバッファを残す
				deviceProps: { webgl: { preserveDrawingBuffer: true } },
				getTooltip: tooltip,
				// 細い線でもホバーしやすくする
				pickingRadius: 4,
				onHover: ({ object }) => ((hovering = !!object), updateCursor())
			});
			m.addControl(overlay);
			m.on('moveend', () => {
				if (flying) return;
				const { lng, lat } = m.getCenter();
				uiState.mapView = { longitude: lng, latitude: lat, zoom: m.getZoom() };
			});
			GeoJsonLayer = layers.GeoJsonLayer;
			H3HexagonLayer = geoLayers.H3HexagonLayer;
			mapHolder.overlay = overlay;
			map = mapHolder.map = m;
		});
		return () => {
			disposed = true;
			map?.remove();
			mapHolder.map = mapHolder.overlay = undefined;
		};
	});

	// ズームに応じて H3 の解像度を変える. 拡大するほど細かく、zoom 14 以上で最も細かい 10 にする
	const h3Resolution = $derived(
		Math.min(10, Math.max(5, Math.round(uiState.mapView.zoom * 0.75 - 1)))
	);

	$effect(() => {
		const controller = new AbortController();
		// 取れなくても交通レイヤーは出せるので、失敗はコンソールに出すだけにする
		fetch(`/api/h3-counts?resolution=${h3Resolution}`, { signal: controller.signal })
			.then((res) => {
				if (!res.ok) throw new Error(`h3-counts: ${res.status}`);
				return res.json();
			})
			.then(showH3)
			.catch((e) => controller.signal.aborted || console.error(e));
		// 解像度が変わったら前の取得結果で上書きしないよう止める
		return () => controller.abort();
	});

	// 表示切り替えのたびにレイヤーを作り直すが、id と data が同じなので deck.gl はデータを読み直さない
	$effect(() => {
		const Layer = GeoJsonLayer;
		if (!overlay || !Layer) return;
		const Hex = H3HexagonLayer;
		const fade = h3Fade.current;
		const hexLayer = (id: string, h3: H3CountsResponse | undefined, opacity: number) =>
			Hex &&
			h3 &&
			new Hex<H3Count>({
				id,
				data: h3.cells,
				opacity,
				visible: opacity > 0,
				extruded: false,
				stroked: false,
				getHexagon: (d) => d.h3,
				// 消えていく側はホバーさせない
				pickable: id === 'h3-counts',
				autoHighlight: true,
				highlightColor: [250, 204, 21, 200],
				// 色の不透明度は一定にして下の地図を透かし、件数は red-200 → red-900 の色の濃さで表す
				getFillColor: (d) => {
					const t = d.count / Math.max(h3.max_count, 1);
					return [254 - 127 * t, 202 - 173 * t, 202 - 173 * t, 160];
				}
			});
		overlay.setProps({
			layers: [
				// 交通レイヤーの下に敷く. 件数が多いセルほど濃い赤にする
				hexLayer('h3-counts-prev', h3Prev, 1 - fade),
				hexLayer('h3-counts', h3Counts, fade),
				...transitLayers.map(
					({ id, color }) =>
						new Layer({
							id,
							data: `/data/${id}.geojson`,
							visible: uiState.mapLayers[id],
							pickable: true,
							autoHighlight: true,
							highlightColor: [250, 204, 21, 255],
							getLineColor: [...color, 200],
							getFillColor: [...color, 220],
							getLineWidth: id === 'railways' ? 3 : 2,
							lineWidthUnits: 'pixels',
							pointType: 'circle',
							getPointRadius: 4,
							pointRadiusUnits: 'pixels'
						})
				)
			]
		});
	});

	$effect(() => {
		const name = uiState.basemap;
		if (!map || name === basemap) return;
		basemap = name;
		map.setStyle(basemaps[name]);
	});

	// ツールなどで uiState が変わったら地図を動かす. 地図操作で変わった分は値が同じなので何もしない
	$effect(() => {
		const { longitude, latitude, zoom } = uiState.mapView;
		if (!map) return;
		const c = map.getCenter();
		if (c.lng !== longitude || c.lat !== latitude || map.getZoom() !== zoom) {
			flying = true;
			map.flyTo({ center: [longitude, latitude], zoom });
			flying = false;
		}
	});
</script>

<!-- maplibre の CSS が地図要素を position: relative にするので、fixed は外側の要素に付ける -->
<div class="fixed inset-0"><div bind:this={container} class="size-full"></div></div>

<div class="absolute top-4 right-4 join shadow">
	{#each basemapNames as name (name)}
		<button
			class="btn join-item btn-sm"
			class:btn-primary={uiState.basemap === name}
			aria-pressed={uiState.basemap === name}
			onclick={() => (uiState.basemap = name)}>{name}</button
		>
	{/each}
</div>

<ul class="menu absolute top-16 right-4 menu-sm rounded-box bg-base-100/90 shadow">
	{#each transitLayers as { id, label, icon } (id)}
		<li>
			<label>
				<input type="checkbox" class="checkbox checkbox-sm" bind:checked={uiState.mapLayers[id]} />
				<span class="{icon} size-5"></span>
				{label}
			</label>
		</li>
	{/each}
</ul>
