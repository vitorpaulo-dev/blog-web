export interface SitemapItem {
	slug: string;
	updatedAt: string;
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
