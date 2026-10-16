import { environment } from '../environments/environment';

export interface SitemapItem {
	slug: string;
	updatedAt: string;
}

export interface SitemapCache {
	posts: SitemapItem[];
	projects: SitemapItem[];
	fetchedAt: number;
}

const SITEMAP_TTL_MS = 60 * 60 * 1000;
const SITEMAP_PAGE_SIZE = 50;

interface SearchPageResponse {
	content: Array<{ slug: string; updatedAt: string }>;
	totalPages: number;
}

let sitemapCache: SitemapCache | null = null;

export function clearSitemapCache(): void {
	sitemapCache = null;
}

async function fetchSearchEntries(path: string): Promise<SitemapItem[]> {
	const items: SitemapItem[] = [];
	let totalPages = 1;
	let page = 0;

	while (page < totalPages) {
		const response = await fetch(`${environment.apiBaseUrl}${path}`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				query: {},
				page,
				size: SITEMAP_PAGE_SIZE,
				sort: 'createdAt',
				direction: 'DESC',
			}),
		});

		if (!response.ok) {
			throw new Error(`Search request failed with status ${response.status}`);
		}

		const data = (await response.json()) as SearchPageResponse;
		items.push(
			...(data.content ?? []).map((item) => ({
				slug: item.slug,
				updatedAt: item.updatedAt,
			})),
		);
		totalPages = data.totalPages ?? 1;
		page += 1;
	}

	return items;
}

export async function loadSitemapCache(): Promise<SitemapCache> {
	const now = Date.now();

	if (!sitemapCache || now - sitemapCache.fetchedAt > SITEMAP_TTL_MS) {
		try {
			const [posts, projects] = await Promise.all([
				fetchSearchEntries('/v1/post/search'),
				fetchSearchEntries('/v1/project/search'),
			]);

			sitemapCache = { posts, projects, fetchedAt: now };
		} catch (error) {
			console.warn('[sitemap] Failed to refresh sitemap entries from the API', error);
			sitemapCache = { posts: [], projects: [], fetchedAt: now };
		}
	}

	return sitemapCache;
}

export function sharedLastmod(cache: SitemapCache): string {
	let latest = '';

	for (const item of [...cache.posts, ...cache.projects]) {
		const date = new Date(item.updatedAt);
		if (Number.isNaN(date.getTime())) {
			continue;
		}
		if (!latest || date.getTime() > new Date(latest).getTime()) {
			latest = item.updatedAt;
		}
	}

	return latest ? lastModifiedDate(latest) : new Date(cache.fetchedAt).toISOString();
}

export type SitemapLocale = 'en' | 'pt';

export function escapeXml(value: string): string {
	return value
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&apos;');
}

export function lastModifiedDate(updatedAt: string, fallback?: string): string {
	const date = new Date(updatedAt);
	if (Number.isNaN(date.getTime())) {
		return fallback ?? '';
	}
	return date.toISOString();
}

export function buildSitemapIndex(siteUrl: string, lastmod: string): string {
	const entries = ['/en/sitemap.xml', '/pt/sitemap.xml']
		.map((path) =>
			[
				'  <sitemap>',
				`    <loc>${escapeXml(`${siteUrl}${path}`)}</loc>`,
				`    <lastmod>${escapeXml(lastmod)}</lastmod>`,
				'  </sitemap>',
			].join('\n'),
		)
		.join('\n');

	return `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</sitemapindex>\n`;
}

export function buildLocaleSitemap(
	locale: SitemapLocale,
	siteUrl: string,
	posts: SitemapItem[],
	projects: SitemapItem[],
	sharedLastmod: string,
): string {
	const prefix = locale === 'pt' ? '/pt' : '';

	const urls: string[] = [];

	for (const path of ['/', '/post', '/project']) {
		urls.push(buildEntry(homeAwareLoc(siteUrl, prefix, path), sharedLastmod, siteUrl, path));
	}

	for (const post of posts) {
		const path = `/post/${post.slug}`;
		urls.push(buildEntry(`${siteUrl}${prefix}${path}`, lastModifiedDate(post.updatedAt, sharedLastmod), siteUrl, path));
	}

	for (const project of projects) {
		const path = `/project/${project.slug}`;
		urls.push(buildEntry(`${siteUrl}${prefix}${path}`, lastModifiedDate(project.updatedAt, sharedLastmod), siteUrl, path));
	}

	return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls.join('\n')}\n</urlset>\n`;
}

function homeAwareLoc(siteUrl: string, prefix: string, path: string): string {
	const suffix = prefix && path === '/' ? '' : path;
	return `${siteUrl}${prefix}${suffix}`;
}

function buildEntry(loc: string, lastmod: string, siteUrl: string, path: string): string {
	return [
		'  <url>',
		`    <loc>${escapeXml(loc)}</loc>`,
		`    <lastmod>${escapeXml(lastmod)}</lastmod>`,
		`    <xhtml:link rel="alternate" hreflang="en" href="${escapeXml(`${siteUrl}${path}`)}" />`,
		`    <xhtml:link rel="alternate" hreflang="pt" href="${escapeXml(`${siteUrl}/pt${path}`)}" />`,
		'  </url>',
	].join('\n');
}
