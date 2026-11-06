import { BACKEND_URL } from '$app/env/private';
import { createClient } from './api/client';

/** Create a request-scoped client for server loads, actions and endpoints. */
export function backend(fetch: typeof globalThis.fetch) {
	return createClient({
		baseUrl: BACKEND_URL,
		fetch,
		throwOnError: true
	});
}
