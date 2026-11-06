import { healthApiHealthGet } from '#lib/server/api/sdk.gen.js';
import { backend } from '#lib/server/backend.js';
import type { PageServerLoad } from './$types';

export const load = (async ({ fetch }) => {
	try {
		const { data } = await healthApiHealthGet({
			client: backend(fetch),
			throwOnError: true,
			signal: AbortSignal.timeout(3000)
		});
		return { health: data };
	} catch {
		return { health: null };
	}
}) satisfies PageServerLoad;
