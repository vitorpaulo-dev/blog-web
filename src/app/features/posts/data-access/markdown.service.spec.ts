import { TestBed } from '@angular/core/testing';
import { SecurityContext } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Marked } from 'marked';
import { vi } from 'vitest';
import { MarkdownService } from './markdown.service';

const { mermaidInitialize, mermaidRun } = vi.hoisted(() => ({
	mermaidInitialize: vi.fn(),
	mermaidRun: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('mermaid', () => ({
	default: {
		initialize: mermaidInitialize,
		run: mermaidRun,
	},
}));

const UNSAFE_HTML =
	'<h2 id="keep">Title</h2>' +
	'<img src="post/banner/a.png" onerror="alert(1)">' +
	'<script>alert(2)</script>' +
	'<div class="mermaid" data-mermaid="Z3JhcGg="></div>';

const MERMAID_SOURCE = 'flowchart TB\n    A --> B';

describe('MarkdownService', () => {
	let service: MarkdownService;
	let sanitizer: DomSanitizer;

	beforeEach(() => {
		TestBed.configureTestingModule({});
		service = TestBed.inject(MarkdownService);
		sanitizer = TestBed.inject(DomSanitizer);
		service.markdownRendererPromise = Promise.resolve({
			parse: async () => UNSAFE_HTML,
		} as unknown as Marked);
	});

	it('strips script and event handlers before trusting html in the browser', async () => {
		const result = await service.renderMarkdown('anything', true);

		expect(typeof result).not.toBe('string');

		const html = sanitizer.sanitize(SecurityContext.HTML, result as SafeHtml) ?? '';
		expect(html).not.toContain('onerror');
		expect(html).not.toContain('<script');
	});

	it('keeps markdown extension attributes in the browser sanitized output', async () => {
		const result = (await service.renderMarkdown('anything', true)) as SafeHtml;

		const html = sanitizer.sanitize(SecurityContext.HTML, result) ?? '';
		expect(html).toContain('data-mermaid="Z3JhcGg="');
		expect(html).toContain('class="mermaid"');
	});

	it('returns an untrusted plain string on the server so bindings sanitize it', async () => {
		const result = await service.renderMarkdown('anything', false);

		expect(typeof result).toBe('string');
		expect(result).toBe(UNSAFE_HTML);
	});
});

describe('MarkdownService rendered output', () => {
	let service: MarkdownService;
	let sanitizer: DomSanitizer;

	beforeEach(() => {
		TestBed.configureTestingModule({});
		service = TestBed.inject(MarkdownService);
		sanitizer = TestBed.inject(DomSanitizer);
	});

	it('renders blockquotes as blockquote elements without literal quotation marks', async () => {
		const html = (await service.renderMarkdown('> ABC123', false)) as string;

		expect(html).toContain('<blockquote>');
		expect(html).toContain('<p>ABC123</p>');
		expect(html).not.toContain('"ABC123"');
		expect(html).not.toContain('“ABC123”');
	});

	it('renders single-backtick content as inline code instead of bold text', async () => {
		const html = (await service.renderMarkdown('Set `const value = 1` now', false)) as string;

		expect(html).toContain('<code>const value = 1</code>');
		expect(html).not.toContain('<strong>');
	});

	it('keeps inline code intact after browser sanitization', async () => {
		const result = (await service.renderMarkdown('Set `const value = 1` now', true)) as SafeHtml;
		const html = sanitizer.sanitize(SecurityContext.HTML, result) ?? '';

		expect(html).toContain('<code>const value = 1</code>');
		expect(html).not.toContain('<strong>');
	});

	it('highlights supported fenced code languages with shiki', async () => {
		const html = (await service.renderMarkdown('```typescript\nconst value = 1\n```', false)) as string;

		expect(html).toContain('class="shiki');
		expect(html).toMatch(/<span style="color:/);
	});

	it('falls back to plain text output for unsupported fenced code languages', async () => {
		const html = (await service.renderMarkdown('```unknownlang\nconst value = 1\n```', false)) as string;

		expect(html).toContain('class="shiki');
		expect(html).not.toMatch(/<span style="color:/);
		expect(html).toContain('const value = 1');
	});

	it('keeps mermaid fences as encoded source instead of highlighting them', async () => {
		const html = (await service.renderMarkdown('```mermaid\n' + MERMAID_SOURCE + '\n```', false)) as string;
		const encoded = /data-mermaid="([^"]+)"/.exec(html)?.[1];

		expect(html).toContain('class="mermaid"');
		expect(decodeURIComponent(encoded ?? '')).toBe(MERMAID_SOURCE);
	});
});

describe('MarkdownService renderMermaid', () => {
	let service: MarkdownService;

	beforeEach(() => {
		TestBed.configureTestingModule({});
		service = TestBed.inject(MarkdownService);
		mermaidInitialize.mockClear();
		mermaidRun.mockClear();
	});

	it('decodes the stored source into the mermaid element before running', async () => {
		const container = document.createElement('div');
		container.innerHTML = `<div class="mermaid" data-mermaid="${encodeURIComponent(MERMAID_SOURCE)}"></div>`;

		await service.renderMermaid(container);

		const node = container.querySelector<HTMLElement>('.mermaid');
		expect(node?.textContent).toBe(MERMAID_SOURCE);
		expect(mermaidRun).toHaveBeenCalledTimes(1);
	});

	it('skips initialization when the container has no mermaid elements', async () => {
		await service.renderMermaid(document.createElement('div'));

		expect(mermaidInitialize).not.toHaveBeenCalled();
		expect(mermaidRun).not.toHaveBeenCalled();
	});
});
