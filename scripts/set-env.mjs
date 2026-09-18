import { writeFileSync } from 'node:fs';
import { config } from 'dotenv';

config();

const apiBase = process.env['API_BASE'] ?? '';
const turnstileSiteKey = process.env['TURNSTILE_SITE_KEY'] ?? '';
const clerkPublishableKey = process.env['CLERK_PUBLISHABLE_KEY'] ?? '';

const targets = [
	{ path: 'src/environments/environment.ts' },
];

for (const { path } of targets) {
	writeFileSync(
		path,
		`
			export const environment = {
			  apiBaseUrl: '${apiBase}',
			  turnstileSiteKey: '${turnstileSiteKey}',
				  clerkPublishableKey: '${clerkPublishableKey}',
			};
		`
	);
	console.log(`[set-env] wrote ${path}`);
}
