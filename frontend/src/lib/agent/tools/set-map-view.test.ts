import { expect, it } from 'vitest';
import { uiState } from '../ui-state.svelte';
import { setMapView } from './set-map-view';

it('指定した項目だけ変え、移動前の値も返す', () => {
	uiState.mapView = { longitude: 138, latitude: 35, zoom: 15 };
	const result = setMapView.handler({ zoom: 10 });
	expect(uiState.mapView).toEqual({ longitude: 138, latitude: 35, zoom: 10 });
	expect(result).toContain('"zoom":15');
	expect(result).toContain('"zoom":10');
});
