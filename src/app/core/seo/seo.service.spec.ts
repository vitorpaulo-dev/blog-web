import { TestBed } from '@angular/core/testing';
import { Meta, Title } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { signal } from '@angular/core';
import { SeoService } from './seo.service';
import { LanguageService } from '../i18n/language.service';
import { UploadService } from '../upload/upload.service';

const BASE = location.origin;

describe('SeoService', () => {
	let service: SeoService;
	let title: Title;
	let meta: Meta;
	let uploadServiceMock: { sign: ReturnType<typeof vi.fn> };
	let languageSignal: ReturnType<typeof signal<'ENGLISH' | 'PORTUGUESE'>>;

	const metaContent = (selector: string): string | null =>
		meta.getTag(selector)?.getAttribute('content') ?? null;

	const linkHref = (selector: string): string | null =>
		document.head.querySelector<HTMLLinkElement>(selector)?.getAttribute('href') ?? null;

	beforeEach(async () => {
		languageSignal = signal('ENGLISH');
		uploadServiceMock = { sign: vi.fn() };

		await TestBed.configureTestingModule({
			providers: [
				provideRouter([]),
				{
					provide: LanguageService,
					useValue: {
						language: languageSignal,
						setLanguage: vi.fn(),
						prefixed: (path: string) => path,
					},
				},
				{ provide: UploadService, useValue: uploadServiceMock },
			],
		}).compileComponents();

		service = TestBed.inject(SeoService);
		title = TestBed.inject(Title);
		meta = TestBed.inject(Meta);
	});

	afterEach(() => {
		document.head
			.querySelectorAll('link[rel="canonical"], link[rel="alternate"]')
			.forEach((link) => link.remove());
	});

	it('sets bare title for home and suffixed title otherwise', () => {
		service.setPageMeta({ home: true, description: 'Home description' });
		expect(title.getTitle()).toBe('vitorpaulo.dev');
		expect(metaContent('property="og:title"')).toBe('vitorpaulo.dev');

		service.setPageMeta({ title: 'Posts', description: 'Posts description' });
		expect(title.getTitle()).toBe('Posts - vitorpaulo.dev');
		expect(metaContent('property="og:title"')).toBe('Posts - vitorpaulo.dev');
	});

	it('sets description and author meta', () => {
		service.setPageMeta({ title: 'Posts', description: 'All posts' });

		expect(metaContent('name="description"')).toBe('All posts');
		expect(metaContent('name="author"')).toBe('Vitor Paulo');
	});

	it('sets canonical and hreflang links from the current route', () => {
		service.setPageMeta({ title: 'Posts', description: 'All posts' });

		expect(linkHref('link[rel="canonical"]')).toBe(`${BASE}/`);
		expect(linkHref('link[rel="alternate"][hreflang="en"]')).toBe(`${BASE}/`);
		expect(linkHref('link[rel="alternate"][hreflang="pt"]')).toBe(`${BASE}/pt/`);
		expect(linkHref('link[rel="alternate"][hreflang="x-default"]')).toBe(`${BASE}/`);
	});

	it('sets canonical to the /pt URL when language is Portuguese', () => {
		languageSignal.set('PORTUGUESE');

		service.setPageMeta({ title: 'Posts', description: 'All posts' });

		expect(linkHref('link[rel="canonical"]')).toBe(`${BASE}/pt/`);
		expect(linkHref('link[rel="alternate"][hreflang="en"]')).toBe(`${BASE}/`);
	});

	it('sets OG and Twitter tags with website type by default', () => {
		service.setPageMeta({ title: 'Posts', description: 'All posts' });

		expect(metaContent('property="og:site_name"')).toBe('vitorpaulo.dev');
		expect(metaContent('property="og:title"')).toBe('Posts - vitorpaulo.dev');
		expect(metaContent('property="og:description"')).toBe('All posts');
		expect(metaContent('property="og:type"')).toBe('website');
		expect(metaContent('property="og:url"')).toBe(`${BASE}/`);
		expect(metaContent('property="og:locale"')).toBe('en_US');
		expect(metaContent('name="twitter:card"')).toBe('summary_large_image');
		expect(metaContent('name="twitter:title"')).toBe('Posts - vitorpaulo.dev');
		expect(metaContent('name="twitter:description"')).toBe('All posts');
	});

	it('maps og:locale to pt_BR for Portuguese', () => {
		languageSignal.set('PORTUGUESE');

		service.setPageMeta({ title: 'Posts', description: 'All posts' });

		expect(metaContent('property="og:locale"')).toBe('pt_BR');
	});

	it('falls back to banner.png when no image is given', async () => {
		service.setPageMeta({ title: 'Posts', description: 'All posts' });
		await new Promise((resolve) => setTimeout(resolve, 0));

		expect(metaContent('property="og:image"')).toBe(`${BASE}/banner.png`);
		expect(metaContent('name="twitter:image"')).toBe(`${BASE}/banner.png`);
	});

	it('uses absolute image URLs directly without signing', async () => {
		service.setPageMeta({
			title: 'Post',
			description: 'Post description',
			image: 'https://cdn.example.com/banner.png',
		});
		await new Promise((resolve) => setTimeout(resolve, 0));

		expect(uploadServiceMock.sign).not.toHaveBeenCalled();
		expect(metaContent('property="og:image"')).toBe('https://cdn.example.com/banner.png');
	});

	it('signs raw R2 keys via UploadService', async () => {
		uploadServiceMock.sign = vi.fn().mockReturnValue(
			of({ 'post/banner/abc.png': 'https://signed.example.com/post/banner/abc.png' }),
		);

		service.setPageMeta({
			title: 'Post',
			description: 'Post description',
			image: 'post/banner/abc.png',
		});
		await new Promise((resolve) => setTimeout(resolve, 0));

		expect(uploadServiceMock.sign).toHaveBeenCalledWith(['post/banner/abc.png']);
		expect(metaContent('property="og:image"')).toBe('https://signed.example.com/post/banner/abc.png');
	});

	it('falls back to banner.png when signing returns nothing for the key', async () => {
		uploadServiceMock.sign = vi.fn().mockReturnValue(of({}));

		service.setPageMeta({
			title: 'Post',
			description: 'Post description',
			image: 'post/banner/abc.png',
		});
		await new Promise((resolve) => setTimeout(resolve, 0));

		expect(metaContent('property="og:image"')).toBe(`${BASE}/banner.png`);
	});

	it('sets article meta for article pages', () => {
		service.setPageMeta({
			title: 'My Post',
			description: 'Post description',
			ogType: 'article',
			publishedTime: '2026-01-15T00:00:00Z',
			modifiedTime: '2026-02-20T00:00:00Z',
			authorName: 'Vitor Paulo',
		});

		expect(metaContent('property="og:type"')).toBe('article');
		expect(metaContent('property="article:published_time"')).toBe('2026-01-15T00:00:00Z');
		expect(metaContent('property="article:modified_time"')).toBe('2026-02-20T00:00:00Z');
		expect(metaContent('property="article:author"')).toBe('Vitor Paulo');
	});

	it('adds and removes article tags', () => {
		service.setArticleTags(['Angular', 'TypeScript']);

		const tags = meta.getTags('property="article:tag"').map((el) => el.getAttribute('content'));
		expect(tags).toEqual(['Angular', 'TypeScript']);

		service.setArticleTags(['Rust']);

		const next = meta.getTags('property="article:tag"').map((el) => el.getAttribute('content'));
		expect(next).toEqual(['Rust']);
	});

	it('removes article meta when the next page sets website meta', () => {
		service.setPageMeta({
			title: 'My Post',
			description: 'Post description',
			ogType: 'article',
			publishedTime: '2026-01-15T00:00:00Z',
		});
		service.setArticleTags(['Angular']);

		service.setPageMeta({ title: 'Posts', description: 'All posts' });

		expect(meta.getTag('property="article:published_time"')).toBeNull();
		expect(meta.getTags('property="article:tag"').length).toBe(0);
	});
});
