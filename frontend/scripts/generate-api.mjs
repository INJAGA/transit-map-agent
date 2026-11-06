import { execFileSync } from 'node:child_process';
import { createClient } from '@hey-api/openapi-ts';

// Export directly from FastAPI so generation does not require a running server.
const schema = execFileSync(
	'uv',
	['run', 'python', '-c', 'import json; from main import app; print(json.dumps(app.openapi()))'],
	{ cwd: new URL('../../backend/', import.meta.url), encoding: 'utf8' }
);

await createClient({
	input: JSON.parse(schema),
	output: 'src/lib/server/api',
	plugins: ['@hey-api/typescript', '@hey-api/sdk', '@hey-api/client-fetch']
});
