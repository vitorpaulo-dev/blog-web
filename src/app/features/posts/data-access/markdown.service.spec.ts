import { TestBed } from '@angular/core/testing';
import { SecurityContext } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Marked } from 'marked';
import { MarkdownService } from './markdown.service';

const UNSAFE_HTML =
	'<h2 id="keep">Title</h2>' +
	'<img src="post/banner/a.png" onerror="alert(1)">' +
	'<script>alert(2)</script>' +
	'<div class="mermaid" data-mermaid="Z3JhcGg="></div>';

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
