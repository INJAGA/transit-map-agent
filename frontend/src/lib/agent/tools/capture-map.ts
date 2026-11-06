import type { MapboxOverlay } from '@deck.gl/mapbox';
import type { Map } from 'maplibre-gl';
import { z } from 'zod';
import { transitLayers } from '../../transit-layers';
import { defineTool } from './types';

/** MapView が地図を作ったら入れる. ツールから canvas を読むため. */
export const mapHolder: { map?: Map; overlay?: MapboxOverlay } = {};

export const captureMap = defineTool({
	name: 'capture_map',
	description:
		'今画面に表示している地図 (ベースマップと交通レイヤー) を画像にして見る. 地図に何が描かれているか答えるときに使う. 地図を変えるツールと同じ返答では呼ばず、その結果を受け取ってから呼ぶ (同時だと変更前の地図が写る). 交通レイヤーの凡例: ' +
		transitLayers.map((l) => `${l.label}=rgb(${l.color.join(',')}) の${l.shape}`).join(', '),
	schema: z.object({}),
	handler: async () => {
		const { map, overlay } = mapHolder;
		if (!map || !overlay) return '地図がまだ読み込まれていません';
		// 直前のツールで移動中・タイル読み込み中なら終わるまで待つ.
		// shortcut: deck.gl の GeoJSON 読み込みは待たない. 初回表示直後に欠けるなら overlay の onLoad も待つ
		// タイルが返ってこない・待機中に地図が破棄されると idle は来ないので、10秒で諦めて今の状態を撮る
		if (map.isMoving() || !map.areTilesLoaded())
			await Promise.race([map.once('idle'), new Promise((r) => setTimeout(r, 10_000))]);
		// ベースマップ (maplibre) と交通レイヤー (deck.gl) は別の canvas なので重ねて1枚にする.
		// interleaved で1枚にすると deck.gl 9.4 + maplibre 6 では描画が例外で止まる
		const base = map.getCanvas();
		const out = document.createElement('canvas');
		out.width = base.width;
		out.height = base.height;
		const ctx = out.getContext('2d')!;
		ctx.drawImage(base, 0, 0);
		ctx.drawImage(overlay.getCanvas()!, 0, 0, out.width, out.height);
		return out.toDataURL('image/jpeg', 0.8);
	}
});
