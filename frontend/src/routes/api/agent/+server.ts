import { BACKEND_URL } from '$app/env/private';
import type { RequestHandler } from './$types';

/** AG-UI のリクエストを backend に中継し、SSE をそのまま流す. */
export const POST: RequestHandler = async ({ request, fetch }) => {
	const res = await fetch(`${BACKEND_URL}/api/agent`, {
		method: 'POST',
		headers: {
			'content-type': 'application/json',
			accept: request.headers.get('accept') ?? 'text/event-stream'
		},
		body: await request.text(),
		// ブラウザが切断したら backend への通信も止める
		signal: request.signal
	});
	return new Response(res.body, {
		status: res.status,
		headers: { 'content-type': res.headers.get('content-type') ?? 'text/event-stream' }
	});
};
