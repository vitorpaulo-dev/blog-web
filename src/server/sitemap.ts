export interface SitemapItem {
	slug: string;
	updatedAt: string;
}

export interface SitemapInput {
	siteUrl: string;
	posts: SitemapItem[];
	projects: SitemapItem[];
}

export function escapeXml(value: string): string {
	return value
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&apos;');
}

export function lastModifiedDate(updatedAt: string): string {
	const date = new Date(updatedAt);
	return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10);
}

export function buildSitemap(input: SitemapInput): string {
	const urls: string[] = [];

	urls.push(
		entry({
			loc: `${input.siteUrl}/`,
			alternates: alternates(input.siteUrl, '/'),
			changefreq: 'daily',
			priority: '1.0',
		}),
	);

	urls.push(
		entry({
			loc: `${input.siteUrl}/post`,
			alternates: alternates(input.siteUrl, '/post'),
			changefreq: 'daily',
			priority: '0.9',
		}),
	);

	urls.push(
		entry({
			loc: `${input.siteUrl}/project`,
			alternates: alternates(input.siteUrl, '/project'),
			changefreq: 'daily',
			priority: '0.9',
		}),
	);

	for (const post of input.posts) {
		urls.push(
			entry({
				loc: `${input.siteUrl}/post/${post.slug}`,
				alternates: alternates(input.siteUrl, `/post/${post.slug}`),
				lastmod: lastModifiedDate(post.updatedAt),
				changefreq: 'monthly',
				priority: '0.8',
			}),
		);
	}

	for (const project of input.projects) {
		urls.push(
			entry({
				loc: `${input.siteUrl}/project/${project.slug}`,
				alternates: alternates(input.siteUrl, `/project/${project.slug}`),
				lastmod: lastModifiedDate(project.updatedAt),
				changefreq: 'monthly',
				priority: '0.8',
			}),
		);
	}

	return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls.join('\n')}\n</urlset>\n`;
}

function alternates(siteUrl: string, path: string): string {
	return [
		`    <xhtml:link rel="alternate" hreflang="en" href="${escapeXml(`${siteUrl}${path}`)}" />`,
		`    <xhtml:link rel="alternate" hreflang="pt" href="${escapeXml(`${siteUrl}/pt${path}`)}" />`,
	].join('\n');
}

function entry(options: {
	loc: string;
	alternates: string;
	lastmod?: string;
	changefreq: string;
	priority: string;
}): string {
	const lines = [
		'  <url>',
		`    <loc>${escapeXml(options.loc)}</loc>`,
		options.alternates,
	];

	if (options.lastmod) {
		lines.push(`    <lastmod>${escapeXml(options.lastmod)}</lastmod>`);
	}

	lines.push(
		`    <changefreq>${options.changefreq}</changefreq>`,
		`    <priority>${options.priority}</priority>`,
		'  </url>',
	);

	return lines.join('\n');
}
