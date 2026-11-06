import { z } from 'zod';
import { basemapNames, uiState } from '../ui-state.svelte';
import { defineTool } from './types';

export const setBasemap = defineTool({
	name: 'set_basemap',
	description:
		'地図の背景 (ベースマップ) を切り替える. OSM: 標準の地図, Positron: 白っぽく淡い地図, Bright: 色の多い地図',
	schema: z.object({ basemap: z.enum(basemapNames).describe('ベースマップの名前') }),
	handler: ({ basemap }) => {
		const before = uiState.basemap;
		uiState.basemap = basemap;
		return `ベースマップを ${before} から ${basemap} に切り替えました`;
	}
});
