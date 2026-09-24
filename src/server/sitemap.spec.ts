import { buildLocaleSitemap, buildSitemapIndex, escapeXml, lastModifiedDate } from './sitemap';

describe('buildSitemapIndex', () => {
	const siteUrl = 'https://vitorpaulo.dev';

	it('generates a sitemap index pointing to both locale sitemaps', () => {
		const xml = buildSitemapIndex(siteUrl, '2026-09-23T18:00:00.000Z');

		expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
		expect(xml).toContain('<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
		expect(xml).toContain('<loc>https://vitorpaulo.dev/en/sitemap.xml</loc>');
		expect(xml).toContain('<loc>https://vitorpaulo.dev/pt/sitemap.xml</loc>');
		expect(xml).toContain('<lastmod>2026-09-23T18:00:00.000Z</lastmod>');

		expect(xml).not.toContain('<urlset');
		expect(xml).not.toContain('<changefreq>');
		expect(xml).not.toContain('<priority>');
	});
});

describe('buildLocaleSitemap', () => {
	const siteUrl = 'https://vitorpaulo.dev';
	const posts = [
		{ slug: 'my-post', updatedAt: '2026-01-15T10:30:00Z' },
		{ slug: 'a<b>&"c\'', updatedAt: 'invalid-date' },
	];
	const projects = [{ slug: 'my-project', updatedAt: '2026-02-20T08:00:00Z' }];
	const sharedLastmod = '2026-03-01T12:00:00.000Z';

	it('generates EN urlset with static and content paths', () => {
		const xml = buildLocaleSitemap('en', siteUrl, posts, projects, sharedLastmod);

		expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
		expect(xml).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">');

		expect(xml).toContain('<loc>https://vitorpaulo.dev/</loc>');
		expect(xml).toContain('<loc>https://vitorpaulo.dev/post</loc>');
		expect(xml).toContain('<loc>https://vitorpaulo.dev/project</loc>');
		expect(xml).toContain('<loc>https://vitorpaulo.dev/post/my-post</loc>');
		expect(xml).toContain('<loc>https://vitorpaulo.dev/project/my-project</loc>');

		expect(xml).not.toContain('<loc>https://vitorpaulo.dev/pt');
		expect(xml).not.toContain('<changefreq>');
		expect(xml).not.toContain('<priority>');
	});

	it('generates PT urlset with prefixed paths', () => {
		const xml = buildLocaleSitemap('pt', siteUrl, posts, projects, sharedLastmod);

		expect(xml).toContain('<loc>https://vitorpaulo.dev/pt</loc>');
		expect(xml).toContain('<loc>https://vitorpaulo.dev/pt/post</loc>');
		expect(xml).toContain('<loc>https://vitorpaulo.dev/pt/project</loc>');
		expect(xml).toContain('<loc>https://vitorpaulo.dev/pt/post/my-post</loc>');
		expect(xml).toContain('<loc>https://vitorpaulo.dev/pt/project/my-project</loc>');
	});

	it('places xhtml alternates after lastmod in each url', () => {
		const xml = buildLocaleSitemap('en', siteUrl, posts, projects, sharedLastmod);

		const urlBlocks = xml.split('<url>').slice(1);
		expect(urlBlocks.length).toBe(6);

		for (const block of urlBlocks) {
			const lastmodIndex = block.indexOf('<lastmod>');
			const enIndex = block.indexOf('hreflang="en"');
			const ptIndex = block.indexOf('hreflang="pt"');
			const closeIndex = block.indexOf('</url>');

			expect(lastmodIndex).toBeGreaterThan(-1);
			expect(enIndex).toBeGreaterThan(lastmodIndex);
			expect(ptIndex).toBeGreaterThan(enIndex);
			expect(ptIndex).toBeLessThan(closeIndex);
		}
	});

	it('adds hreflang alternates for EN and PT urls', () => {
		const xml = buildLocaleSitemap('en', siteUrl, posts, projects, sharedLastmod);

		expect(xml).toContain('<xhtml:link rel="alternate" hreflang="en" href="https://vitorpaulo.dev/" />');
		expect(xml).toContain('<xhtml:link rel="alternate" hreflang="pt" href="https://vitorpaulo.dev/pt/" />');
		expect(xml).toContain('<xhtml:link rel="alternate" hreflang="en" href="https://vitorpaulo.dev/post/my-post" />');
		expect(xml).toContain('<xhtml:link rel="alternate" hreflang="pt" href="https://vitorpaulo.dev/pt/post/my-post" />');
	});

	it('uses full ISO lastmod from updatedAt and shared lastmod for static pages', () => {
		const xml = buildLocaleSitemap('en', siteUrl, posts, projects, sharedLastmod);

		expect(xml).toContain('<lastmod>2026-01-15T10:30:00.000Z</lastmod>');
		expect(xml).toContain('<lastmod>2026-02-20T08:00:00.000Z</lastmod>');

		const staticUrl = xml.split('<url>').find((chunk) => chunk.includes('<loc>https://vitorpaulo.dev/</loc>')) ?? '';
		expect(staticUrl).toContain(`<lastmod>${sharedLastmod}</lastmod>`);
	});

	it('falls back to shared lastmod for invalid updatedAt and escapes slugs', () => {
		const xml = buildLocaleSitemap('en', siteUrl, posts, projects, sharedLastmod);

		const escapedUrl = xml.split('<url>').find((chunk) => chunk.includes('a&lt;b')) ?? '';
		expect(escapedUrl).toContain('<loc>https://vitorpaulo.dev/post/a&lt;b&gt;&amp;&quot;c&apos;</loc>');
		expect(escapedUrl).toContain(`<lastmod>${sharedLastmod}</lastmod>`);
		expect(xml).not.toContain('a<b>');
	});

	it('renders empty-content fallback with only static pages', () => {
		const xml = buildLocaleSitemap('pt', siteUrl, [], [], sharedLastmod);

		const urlBlocks = xml.split('<url>').slice(1);
		expect(urlBlocks.length).toBe(3);

		expect(xml).toContain('<loc>https://vitorpaulo.dev/pt</loc>');
		expect(xml).toContain('<loc>https://vitorpaulo.dev/pt/post</loc>');
		expect(xml).toContain('<loc>https://vitorpaulo.dev/pt/project</loc>');

		for (const block of urlBlocks) {
			expect(block).toContain(`<lastmod>${sharedLastmod}</lastmod>`);
		}
	});
});

describe('lastModifiedDate', () => {
	it('formats updatedAt as full ISO-8601 with timezone', () => {
		expect(lastModifiedDate('2026-01-15T10:30:00Z')).toBe('2026-01-15T10:30:00.000Z');
	});

	it('returns fallback for invalid dates', () => {
		expect(lastModifiedDate('nope', '2026-03-01T12:00:00.000Z')).toBe('2026-03-01T12:00:00.000Z');
		expect(lastModifiedDate('nope')).toBe('');
	});
});

describe('escapeXml', () => {
	it('escapes all XML entities', () => {
		expect(escapeXml(`<a href="x">&'`)).toBe('&lt;a href=&quot;x&quot;&gt;&amp;&apos;');
	});
});
