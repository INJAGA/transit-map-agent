import { z } from 'zod';
import { uiState } from '../ui-state.svelte';
import { defineTool } from './types';

export const setMapView = defineTool({
	name: 'set_map_view',
	description: '地図の表示中心の座標と拡大率を変更する. 指定しなかった項目は今のまま',
	schema: z.object({
		longitude: z.number().min(-180).max(180).optional().describe('中心の経度'),
		latitude: z.number().min(-85).max(85).optional().describe('中心の緯度'),
		zoom: z.number().min(0).max(22).optional().describe('拡大率 (0: 世界全体, 15: 街区程度)')
	}),
	handler: (view) => {
		// 移動前も返す. 次の呼び出しの UI ステートは移動後なので、無いとモデルが「元から同じ」と誤解する
		const before = JSON.stringify(uiState.mapView);
		Object.assign(uiState.mapView, view);
		return `地図を ${before} から ${JSON.stringify(uiState.mapView)} に移動しました`;
	}
});
