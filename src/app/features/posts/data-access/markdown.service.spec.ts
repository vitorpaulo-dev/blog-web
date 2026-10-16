import { TestBed } from '@angular/core/testing';
import { SecurityContext } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Marked } from 'marked';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { MarkdownService } from './markdown.service';
import { UploadService } from '../../../core/upload/upload.service';

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

const TRANSPARENT_PLACEHOLDER = 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=';

function uploadServiceMock(sign: ReturnType<typeof vi.fn>) {
	return { provide: UploadService, useValue: { sign } };
}

describe('MarkdownService', () => {
	let service: MarkdownService;
	let sanitizer: DomSanitizer;
	let sign: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		sign = vi.fn().mockReturnValue(of({ 'post/banner/a.png': 'https://cdn.example/banner/a.png' }));
		TestBed.configureTestingModule({ providers: [uploadServiceMock(sign)] });
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
		expect(result).toContain('src="https://cdn.example/banner/a.png"');
		expect(result).toContain('fetchpriority="high"');
		expect(result).toContain('<script>alert(2)</script>');
	});
});

describe('MarkdownService rendered output', () => {
	let service: MarkdownService;
	let sanitizer: DomSanitizer;

	beforeEach(() => {
		TestBed.configureTestingModule({
			providers: [uploadServiceMock(vi.fn().mockReturnValue(of({})))],
		});
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
		TestBed.configureTestingModule({
			providers: [uploadServiceMock(vi.fn().mockReturnValue(of({})))],
		});
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

describe('MarkdownService finalizeContentImages', () => {
	let service: MarkdownService;
	let sign: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		sign = vi.fn();
		TestBed.configureTestingModule({ providers: [uploadServiceMock(sign)] });
		service = TestBed.inject(MarkdownService);
	});

	it('replaces raw content keys with signed urls and escapes ampersands', async () => {
		sign.mockReturnValue(of({ 'post/content/a.png': 'https://cdn.example/a.png?X-Amz-S=1&t=2' }));

		const html = await service.finalizeContentImages('<p><img src="post/content/a.png" alt="A"></p>');

		expect(sign).toHaveBeenCalledWith(['post/content/a.png']);
		expect(html).toContain('src="https://cdn.example/a.png?X-Amz-S=1&amp;t=2"');
		expect(html).toContain('fetchpriority="high"');
		expect(html).not.toContain('loading=');
	});

	it('marks the first content image eager and every later image lazy', async () => {
		sign.mockReturnValue(of({
			'post/content/a.png': 'https://cdn.example/a.png',
			'project/content/b.png': 'https://cdn.example/b.png',
		}));

		const html = await service.finalizeContentImages(
			'<img src="post/content/a.png" alt="A"><img src="project/content/b.png" alt="B">',
		);

		const [first, second] = html.match(/<img[^>]*>/g) ?? [];

		expect(first).toContain('fetchpriority="high"');
		expect(first).not.toContain('loading=');
		expect(second).toContain('loading="lazy"');
		expect(second).not.toContain('fetchpriority=');
	});

	it('signs each distinct key once and normalizes later images to lazy', async () => {
		sign.mockReturnValue(of({ 'post/content/a.png': 'https://cdn.example/a.png' }));

		const html = await service.finalizeContentImages(
			'<img src="post/content/a.png"><img src="post/content/a.png"><img src="https://example.com/x.png">',
		);

		expect(sign).toHaveBeenCalledTimes(1);
		expect(sign).toHaveBeenCalledWith(['post/content/a.png']);
		expect(html).toContain('fetchpriority="high"');
		expect((html.match(/loading="lazy"/g) ?? []).length).toBe(2);
	});

	it('uses the transparent placeholder when signing returns no url', async () => {
		sign.mockReturnValue(of({ 'post/content/a.png': '', 'post/content/b.png': 'https://cdn.example/b.png' }));

		const html = await service.finalizeContentImages(
			'<img src="post/content/a.png"><img src="post/content/b.png">',
		);

		expect(html).toContain(`src="${TRANSPARENT_PLACEHOLDER}"`);
		expect(html).toContain('src="https://cdn.example/b.png"');
	});

	it('falls back to placeholders for every raw key when signing fails', async () => {
		sign.mockReturnValue(throwError(() => new Error('sign endpoint down')));

		const html = await service.finalizeContentImages(
			'<img src="post/content/a.png"><img src="project/logo/b.png">',
		);

		expect((html.match(new RegExp(TRANSPARENT_PLACEHOLDER, 'g')) ?? []).length).toBe(2);
		expect(html).not.toContain('post/content/a.png');
	});

	it('skips the sign call when no raw keys remain and still normalizes priority', async () => {
		sign.mockReturnValue(of({}));

		const html = await service.finalizeContentImages(
			'<img src="https://cdn.example/a.png"><img src="https://cdn.example/b.png">',
		);

		expect(sign).not.toHaveBeenCalled();
		expect(html).toContain('<img fetchpriority="high" src="https://cdn.example/a.png">');
		expect(html).toContain('<img loading="lazy" src="https://cdn.example/b.png">');
	});

	it('leaves html without images untouched', async () => {
		const html = await service.finalizeContentImages('<p>plain</p>');

		expect(sign).not.toHaveBeenCalled();
		expect(html).toBe('<p>plain</p>');
	});

	it('restoreServerHtml sanitizes, keeps signed urls intact and re-applies priority', async () => {
		sign.mockReturnValue(of({}));
		const sanitizer = TestBed.inject(DomSanitizer);

		const safe = await service.restoreServerHtml(
			'<img src="https://cdn.example/a.png?sig=1&t=2"><script>alert(1)</script><img src="https://cdn.example/b.png">',
		);

		const html = sanitizer.sanitize(SecurityContext.HTML, safe) ?? '';
		expect(html).toContain('sig=1&amp;t=2');
		expect(html).not.toContain('<script');
		expect(html).toContain('fetchpriority="high"');
		expect(html).toContain('loading="lazy"');
		expect(sign).not.toHaveBeenCalled();
	});
});
