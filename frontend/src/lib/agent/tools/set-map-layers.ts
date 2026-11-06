import { z } from 'zod';
import { uiState } from '../ui-state.svelte';
import { defineTool } from './types';

export const setMapLayers = defineTool({
	name: 'set_map_layers',
	description:
		'地図に重ねる静岡県の交通レイヤーの表示/非表示を切り替える. true で表示, false で非表示. 指定しなかったレイヤーは今のまま',
	schema: z.object({
		railways: z.boolean().optional().describe('鉄道の路線'),
		'bus-routes': z.boolean().optional().describe('バスルート'),
		'bus-stops': z.boolean().optional().describe('バス停')
	}),
	handler: (layers) => {
		// 変更前も返す. 次の呼び出しの UI ステートは変更後なので、無いとモデルが「元から同じ」と誤解する
		const before = JSON.stringify(uiState.mapLayers);
		Object.assign(uiState.mapLayers, layers);
		return `レイヤーを ${before} から ${JSON.stringify(uiState.mapLayers)} に変更しました`;
	}
});
