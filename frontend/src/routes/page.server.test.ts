import { expect, expectTypeOf, test, vi } from 'vitest';
import { load } from './+page.server';
import type { PageServerLoadEvent } from './$types';

function event(fetch: typeof globalThis.fetch): PageServerLoadEvent {
	return { fetch } as PageServerLoadEvent;
}

test('SDK requests the health endpoint and returns its response', async () => {
	const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(Response.json({ status: 'ok' }));
	const result = await load(event(fetch));
	const request = new Request(fetch.mock.calls[0][0]);
	expect(new URL(request.url).pathname).toBe('/api/health');
	expect(request.method).toBe('GET');
	expect(result).toEqual({ health: { status: 'ok' } });
	expectTypeOf(result.health!.status).toEqualTypeOf<'ok'>();
});

test('connection failure leaves the page available', async () => {
	const fetch = vi.fn<typeof globalThis.fetch>().mockRejectedValue(new TypeError('fetch failed'));
	expect(await load(event(fetch))).toEqual({ health: null });
});

test('upstream HTTP failure leaves the page available', async () => {
	const fetch = vi
		.fn<typeof globalThis.fetch>()
		.mockResolvedValue(new Response(null, { status: 503 }));
	expect(await load(event(fetch))).toEqual({ health: null });
});

test('a stalled upstream request times out and leaves the page available', async () => {
	let aborted = false;
	const fetch = vi.fn<typeof globalThis.fetch>().mockImplementation((input) => {
		const request = new Request(input);
		return new Promise<Response>((resolve, reject) => {
			request.signal.addEventListener(
				'abort',
				() => {
					aborted = true;
					reject(request.signal.reason);
				},
				{ once: true }
			);
		});
	});
	expect(await load(event(fetch))).toEqual({ health: null });
	expect(aborted).toBe(true);
}, 5000);
