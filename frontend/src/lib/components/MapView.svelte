<script lang="ts">
	import 'maplibre-gl/dist/maplibre-gl.css';
	import { onMount } from 'svelte';
	import type { Map, StyleSpecification } from 'maplibre-gl';
	import { uiState } from '#lib/agent/ui-state.svelte.js';

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
	const basemaps = {
		OSM: osm,
		Positron: 'https://tiles.openfreemap.org/styles/positron',
		Bright: 'https://tiles.openfreemap.org/styles/bright'
	};
	type Basemap = keyof typeof basemaps;

	let container: HTMLDivElement;
	let map = $state.raw<Map>();
	let basemap = $state<Basemap>('Positron');
	// flyTo は先に進行中の移動を止め、そのとき同期的に moveend が出る. その途中位置で新しい目的地を上書きしないため
	let flying = false;

	onMount(() => {
		let disposed = false;
		// maplibre / deck.gl はブラウザ専用なので SSR で読み込まないよう動的 import する
		Promise.all([import('maplibre-gl'), import('@deck.gl/mapbox')]).then(
			([{ Map }, { MapboxOverlay }]) => {
				if (disposed) return;
				const { longitude, latitude, zoom } = uiState.mapView;
				const m = new Map({
					container,
					style: basemaps[basemap],
					center: [longitude, latitude],
					zoom
				});
				m.addControl(new MapboxOverlay({ layers: [] }));
				m.on('moveend', () => {
					if (flying) return;
					const { lng, lat } = m.getCenter();
					uiState.mapView = { longitude: lng, latitude: lat, zoom: m.getZoom() };
				});
				map = m;
			}
		);
		return () => {
			disposed = true;
			map?.remove();
		};
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
	{#each Object.keys(basemaps) as Basemap[] as name (name)}
		<button
			class="btn join-item btn-sm"
			class:btn-primary={basemap === name}
			aria-pressed={basemap === name}
			onclick={() => {
				basemap = name;
				map?.setStyle(basemaps[name]);
			}}>{name}</button
		>
	{/each}
</div>
