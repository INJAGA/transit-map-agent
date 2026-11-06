import { expect, it } from 'vitest';
import { uiState } from '../ui-state.svelte';
import { setMapLayers } from './set-map-layers';

it('指定したレイヤーだけ切り替え、変更前の値も返す', () => {
	uiState.mapLayers = { railways: true, 'bus-routes': true, 'bus-stops': true };
	const result = setMapLayers.handler({ 'bus-stops': false });
	expect(uiState.mapLayers).toEqual({ railways: true, 'bus-routes': true, 'bus-stops': false });
	expect(result).toContain('"bus-stops":true');
	expect(result).toContain('"bus-stops":false');
});
