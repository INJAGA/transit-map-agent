import { error, json } from '@sveltejs/kit';
import { h3CountsApiH3CountsGet } from '#lib/server/api/sdk.gen.js';
import { backend } from '#lib/server/backend.js';
import type { RequestHandler } from './$types';

/** H3 セルごとの件数を backend から取って返す. ?resolution= で解像度を指定できる. */
export const GET: RequestHandler = async ({ fetch, url }) => {
	const resolution = url.searchParams.get('resolution');
	// Number() は '' を 0、'0xA' を 10 にしてしまうので、10進の整数だけ通す
	if (resolution !== null && !/^\d+$/.test(resolution)) error(400, 'resolution は整数で指定する');
	// 範囲チェックは backend がする. 422 などはそのステータスのまま返す
	const { data, response } = await h3CountsApiH3CountsGet({
		client: backend(fetch),
		query: resolution === null ? undefined : { resolution: Number(resolution) },
		// backend() は既定で throw するので、ステータスを返せるよう止める
		throwOnError: false
	});
	// response が無いのは backend に繋がらなかったとき
	if (!response?.ok) error(response?.status ?? 502, 'h3-counts の取得に失敗した');
	return json(data);
};
