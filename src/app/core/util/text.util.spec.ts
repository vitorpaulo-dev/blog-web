import { describe, expect, it } from 'vitest';
import { extractToc, slugifyHeading, withHeadingIds } from './text.util';

describe('withHeadingIds', () => {
	it('injects slugified ids into h1/h2/h3 headings', () => {
		const html = '<h1>Getting Started</h1><h2>Setup Phase</h2><h3>Details</h3>';
		const result = withHeadingIds(html);

		expect(result).toContain('<h1 id="getting-started">Getting Started</h1>');
		expect(result).toContain('<h2 id="setup-phase">Setup Phase</h2>');
		expect(result).toContain('<h3 id="details">Details</h3>');
	});

	it('deduplicates repeated heading texts with numeric suffixes', () => {
		const html = '<h2>Setup</h2><h2>Setup</h2><h2>Setup</h2>';
		const result = withHeadingIds(html);

		expect(result).toContain('id="setup"');
		expect(result).toContain('id="setup-2"');
		expect(result).toContain('id="setup-3"');
	});

	it('slugifies unicode headings to ascii', () => {
		const html = '<h2>Aquisição & Configuração</h2>';
		const result = withHeadingIds(html);

		expect(result).toContain('id="aquisicao-configuracao"');
	});

	it('uses the fallback slug for symbols-only headings', () => {
		const html = '<h2>??? !!!</h2>';
		const result = withHeadingIds(html);

		expect(result).toContain('id="section"');
	});
});

describe('extractToc', () => {
	it('extracts heading items with id, text and level from ids-bearing HTML', () => {
		const html =
			'<h2 id="my-section">My <em>Section</em></h2><h3 id="nested-detail">Nested &amp; Detail</h3><h1 id="top">Top</h1>';
		const toc = extractToc(html);

		expect(toc).toEqual([
			{ id: 'my-section', text: 'My Section', level: 2 },
			{ id: 'nested-detail', text: 'Nested & Detail', level: 3 },
			{ id: 'top', text: 'Top', level: 1 },
		]);
	});

	it('returns empty for content without headings', () => {
		expect(extractToc('<p>No headings here</p>')).toEqual([]);
	});

	it('ignores duplicate ids', () => {
		const html = '<h2 id="dup">One</h2><h2 id="dup">Two</h2>';
		const toc = extractToc(html);

		expect(toc).toEqual([{ id: 'dup', text: 'One', level: 2 }]);
	});
});

describe('slugifyHeading', () => {
	it('normalizes accents and collapses separators', () => {
		expect(slugifyHeading('Héllo — World! 2026')).toBe('hello-world-2026');
	});

	it('falls back to "section" when nothing slugifiable remains', () => {
		expect(slugifyHeading('***')).toBe('section');
	});
});

