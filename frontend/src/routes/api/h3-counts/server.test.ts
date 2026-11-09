import { expect, test, vi } from 'vitest';
import { GET } from './+server';
import type { RequestEvent } from './$types';

function call(query: string, fetch: typeof globalThis.fetch) {
	return GET({ fetch, url: new URL(`http://localhost/api/h3-counts${query}`) } as RequestEvent);
}

test('forwards resolution to the backend', async () => {
	const body = { cells: [{ h3: '872f596d5ffffff', count: 3 }], max_count: 3 };
	const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(Response.json(body));
	const res = await call('?resolution=7', fetch);
	expect(new URL(new Request(fetch.mock.calls[0][0]).url).search).toBe('?resolution=7');
	expect(await res.json()).toEqual(body);
});

test.each(['', 'abc', '0xA', ' 7'])(
	'rejects resolution=%j without calling the backend',
	async (r) => {
		const fetch = vi.fn<typeof globalThis.fetch>();
		await expect(call(`?resolution=${encodeURIComponent(r)}`, fetch)).rejects.toMatchObject({
			status: 400
		});
		expect(fetch).not.toHaveBeenCalled();
	}
);

test('passes the backend status through', async () => {
	const fetch = vi
		.fn<typeof globalThis.fetch>()
		.mockResolvedValue(Response.json({ detail: [] }, { status: 422 }));
	await expect(call('?resolution=11', fetch)).rejects.toMatchObject({ status: 422 });
});

test('connection failure becomes 502', async () => {
	const fetch = vi.fn<typeof globalThis.fetch>().mockRejectedValue(new TypeError('fetch failed'));
	await expect(call('?resolution=7', fetch)).rejects.toMatchObject({ status: 502 });
});
