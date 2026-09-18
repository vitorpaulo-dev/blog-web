import { buildSitemap, escapeXml, lastModifiedDate } from './sitemap';

describe('buildSitemap', () => {
	const siteUrl = 'https://vitorpaulo.dev';

	it('generates static entries with alternates, changefreq and priority', () => {
		const xml = buildSitemap({ siteUrl, posts: [], projects: [] });

		expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
		expect(xml).toContain('xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"');
		expect(xml).toContain('xmlns:xhtml="http://www.w3.org/1999/xhtml"');

		expect(xml).toContain('<loc>https://vitorpaulo.dev/</loc>');
		expect(xml).toContain('<loc>https://vitorpaulo.dev/post</loc>');
		expect(xml).toContain('<loc>https://vitorpaulo.dev/project</loc>');

		expect(xml).toContain('<xhtml:link rel="alternate" hreflang="en" href="https://vitorpaulo.dev/" />');
		expect(xml).toContain('<xhtml:link rel="alternate" hreflang="pt" href="https://vitorpaulo.dev/pt/" />');
		expect(xml).toContain('<xhtml:link rel="alternate" hreflang="en" href="https://vitorpaulo.dev/post" />');
		expect(xml).toContain('<xhtml:link rel="alternate" hreflang="pt" href="https://vitorpaulo.dev/pt/post" />');

		expect(xml).toContain('<changefreq>daily</changefreq>');
		expect(xml).toContain('<priority>1.0</priority>');
		expect(xml).toContain('<priority>0.9</priority>');
	});

	it('adds post and project entries with alternates, lastmod and detail frequency', () => {
		const xml = buildSitemap({
			siteUrl,
			posts: [{ slug: 'my-post', updatedAt: '2026-01-15T10:30:00Z' }],
			projects: [{ slug: 'my-project', updatedAt: '2026-02-20T08:00:00Z' }],
		});

		expect(xml).toContain('<loc>https://vitorpaulo.dev/post/my-post</loc>');
		expect(xml).toContain('<xhtml:link rel="alternate" hreflang="en" href="https://vitorpaulo.dev/post/my-post" />');
		expect(xml).toContain('<xhtml:link rel="alternate" hreflang="pt" href="https://vitorpaulo.dev/pt/post/my-post" />');
		expect(xml).toContain('<lastmod>2026-01-15</lastmod>');

		expect(xml).toContain('<loc>https://vitorpaulo.dev/project/my-project</loc>');
		expect(xml).toContain('<xhtml:link rel="alternate" hreflang="pt" href="https://vitorpaulo.dev/pt/project/my-project" />');
		expect(xml).toContain('<lastmod>2026-02-20</lastmod>');

		expect(xml).toContain('<changefreq>monthly</changefreq>');
		expect(xml).toContain('<priority>0.8</priority>');
	});

	it('escapes XML-unsafe characters in slugs', () => {
		const xml = buildSitemap({
			siteUrl,
			posts: [{ slug: 'a<b>&"c"', updatedAt: '2026-01-01T00:00:00Z' }],
			projects: [],
		});

		expect(xml).toContain('<loc>https://vitorpaulo.dev/post/a&lt;b&gt;&amp;&quot;c&quot;</loc>');
		expect(xml).not.toContain('a<b>');
	});

	it('omits lastmod for invalid dates', () => {
		const xml = buildSitemap({
			siteUrl,
			posts: [{ slug: 'my-post', updatedAt: 'not-a-date' }],
			projects: [],
		});

		const entry = xml.split('<url>').find((chunk) => chunk.includes('my-post')) ?? '';
		expect(entry).not.toContain('<lastmod>');
	});
});

describe('lastModifiedDate', () => {
	it('formats updatedAt as YYYY-MM-DD', () => {
		expect(lastModifiedDate('2026-01-15T10:30:00Z')).toBe('2026-01-15');
	});

	it('returns empty string for invalid dates', () => {
		expect(lastModifiedDate('nope')).toBe('');
	});
});

describe('escapeXml', () => {
	it('escapes all XML entities', () => {
		expect(escapeXml(`<a href="x">&'`)).toBe('&lt;a href=&quot;x&quot;&gt;&amp;&apos;');
	});
});
