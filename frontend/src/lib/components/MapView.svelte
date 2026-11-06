<script lang="ts">
	import 'maplibre-gl/dist/maplibre-gl.css';
	import { onMount } from 'svelte';
	import type { Map, StyleSpecification } from 'maplibre-gl';
	import type { MapboxOverlay } from '@deck.gl/mapbox';
	import type { PickingInfo } from '@deck.gl/core';
	import type { GeoJsonLayer as GeoJsonLayerType } from '@deck.gl/layers';
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

	function tooltip({ layer, object, x, y }: PickingInfo<Feature>) {
		const p = object?.properties;
		if (!p) return null;
		// deck.gl は常にマウスの右下に出すので、画面の右半分・下半分では左・上に出して画面外にはみ出さないようにする
		const dx = x > innerWidth / 2 ? '-100%' : '0';
		const dy = y > innerHeight / 2 ? '-100%' : '0';
		return {
			text: tooltipText(layer?.id, p),
			// 幅が画面の半分を超えると左右の出し分けでも収まらないので折り返す
			style: { transform: `translate(${x}px, ${y}px) translate(${dx}, ${dy})`, maxWidth: '50vw' }
		};
	}

	let container: HTMLDivElement;
	let overlay = $state.raw<MapboxOverlay>();
	let GeoJsonLayer = $state.raw<typeof GeoJsonLayerType>();
	let map = $state.raw<Map>();
	// 今 map に載せているベースマップ. 同じものを setStyle し直さないため
	let basemap = uiState.basemap;
	// flyTo は先に進行中の移動を止め、そのとき同期的に moveend が出る. その途中位置で新しい目的地を上書きしないため
	let flying = false;

	onMount(() => {
		let disposed = false;
		// maplibre / deck.gl はブラウザ専用なので SSR で読み込まないよう動的 import する
		Promise.all([import('maplibre-gl'), import('@deck.gl/mapbox'), import('@deck.gl/layers')]).then(
			([{ Map }, { MapboxOverlay }, layers]) => {
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
				mapHolder.overlay = overlay;
				map = mapHolder.map = m;
			}
		);
		return () => {
			disposed = true;
			map?.remove();
			mapHolder.map = mapHolder.overlay = undefined;
		};
	});

	// 表示切り替えのたびにレイヤーを作り直すが、id と data が同じなので deck.gl はデータを読み直さない
	$effect(() => {
		const Layer = GeoJsonLayer;
		if (!overlay || !Layer) return;
		overlay.setProps({
			layers: transitLayers.map(
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
