import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { DOCUMENT } from '@angular/common';
import { Router } from '@angular/router';
import { isPlatformServer } from '@angular/common';
import { map, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { LanguageService } from '../i18n/language.service';
import { UploadService } from '../upload/upload.service';

export type SeoOgType = 'website' | 'article';

export interface SeoPageMeta {
	title?: string;
	home?: boolean;
	description: string;
	ogType?: SeoOgType;
	image?: string | null;
	publishedTime?: string | null;
	modifiedTime?: string | null;
	authorName?: string | null;
}

const SITE_NAME = 'vitorpaulo.dev';
const TITLE_SUFFIX = ` - ${SITE_NAME}`;
const AUTHOR = 'Vitor Paulo';
const DEFAULT_IMAGE_PATH = '/banner.png';
const RAW_KEY_PATTERN = /^(?:post|project)\/(?:banner|logo|content)\/[\w.-]+$/;

const LOCALES: Record<string, string> = {
	ENGLISH: 'en_US',
	PORTUGUESE: 'pt_BR',
};

@Injectable({ providedIn: 'root' })
export class SeoService {
	private readonly title = inject(Title);
	private readonly meta = inject(Meta);
	private readonly document = inject(DOCUMENT);
	private readonly router = inject(Router);
	private readonly languageService = inject(LanguageService);
	private readonly uploadService = inject(UploadService);
	private readonly platformId = inject(PLATFORM_ID);

	private trackedArticleProperties = new Set<string>();

	setTitle(pageTitle?: string): void {
		this.title.setTitle(this.suffixedTitle(pageTitle, false));
	}

	setPageMeta(options: SeoPageMeta): void {
		this.removeTrackedTags();

		const pageTitle = this.suffixedTitle(options.title, options.home ?? false);
		const ogType = options.ogType ?? 'website';
		const { canonicalUrl, enUrl, ptUrl } = this.urls();

		this.title.setTitle(pageTitle);

		this.meta.updateTag({ name: 'description', content: options.description });
		this.meta.updateTag({ name: 'author', content: AUTHOR });

		this.setLink(canonicalUrl, [['rel', 'canonical']]);
		this.setLink(enUrl, [['rel', 'alternate'], ['hreflang', 'en']]);
		this.setLink(ptUrl, [['rel', 'alternate'], ['hreflang', 'pt']]);
		this.setLink(enUrl, [['rel', 'alternate'], ['hreflang', 'x-default']]);

		this.meta.updateTag({ property: 'og:site_name', content: SITE_NAME });
		this.meta.updateTag({ property: 'og:title', content: pageTitle });
		this.meta.updateTag({ property: 'og:description', content: options.description });
		this.meta.updateTag({ property: 'og:type', content: ogType });
		this.meta.updateTag({ property: 'og:url', content: canonicalUrl });
		this.meta.updateTag({ property: 'og:locale', content: LOCALES[this.languageService.language()] ?? 'en_US' });
		this.meta.updateTag({ name: 'twitter:card', content: 'summary_large_image' });
		this.meta.updateTag({ name: 'twitter:title', content: pageTitle });
		this.meta.updateTag({ name: 'twitter:description', content: options.description });

		this.resolveImage(options.image ?? null).subscribe((imageUrl) => {
			this.meta.updateTag({ property: 'og:image', content: imageUrl });
			this.meta.updateTag({ name: 'twitter:image', content: imageUrl });
		});

		if (ogType === 'article') {
			this.setArticleMeta(options);
		}
	}

	setArticleTags(tagNames: string[]): void {
		this.removeTrackedTags('article:tag');

		tagNames.forEach((name) => {
			this.trackedArticleProperties.add('article:tag');
			this.meta.addTag({ property: 'article:tag', content: name }, true);
		});
	}

	private setArticleMeta(options: SeoPageMeta): void {
		if (options.publishedTime) {
			this.trackedArticleProperties.add('article:published_time');
			this.meta.addTag({ property: 'article:published_time', content: options.publishedTime }, true);
		}

		if (options.modifiedTime) {
			this.trackedArticleProperties.add('article:modified_time');
			this.meta.addTag({ property: 'article:modified_time', content: options.modifiedTime }, true);
		}

		if (options.authorName) {
			this.trackedArticleProperties.add('article:author');
			this.meta.addTag({ property: 'article:author', content: options.authorName }, true);
		}
	}

	private removeTrackedTags(property?: string): void {
		const properties = property ? [property] : [...this.trackedArticleProperties];

		properties.forEach((tracked) => {
			this.meta.getTags(`property="${tracked}"`).forEach((element) => {
				if (element.isConnected) {
					this.meta.removeTagElement(element);
				}
			});
		});

		if (property) {
			this.trackedArticleProperties.delete(property);
		} else {
			this.trackedArticleProperties.clear();
		}
	}

	private setLink(href: string, attributes: string[][]): void {
		const selector = attributes.map(([name, value]) => `[${name}="${value}"]`).join('');

		const existing = this.document.head.querySelector(`link${selector}`);
		const link = existing ?? this.document.createElement('link');
		attributes.forEach(([name, value]) => link.setAttribute(name, value));
		link.setAttribute('href', href);

		if (!existing) {
			this.document.head.appendChild(link);
		}
	}

	private urls(): { canonicalUrl: string; enUrl: string; ptUrl: string } {
		const path = this.currentPath();
		const base = this.baseUrl();
		const enUrl = `${base}${path}`;
		const ptUrl = `${base}/pt${path}`;
		const canonicalUrl = this.languageService.language() === 'PORTUGUESE' ? ptUrl : enUrl;

		return { canonicalUrl, enUrl, ptUrl };
	}

	private baseUrl(): string {
		if (isPlatformServer(this.platformId)) {
			return environment.host;
		}

		return this.document.location.origin;
	}

	private currentPath(): string {
		const url = this.router.url.split('?')[0].split('#')[0];
		return url === '/pt' ? '/' : url.replace(/^\/pt(?=\/|$)/, '') || '/';
	}

	private suffixedTitle(pageTitle: string | undefined, home: boolean): string {
		if (home || !pageTitle) {
			return SITE_NAME;
		}

		return `${pageTitle}${TITLE_SUFFIX}`;
	}

	private resolveImage(image: string | null) {
		if (!image) {
			return of(`${this.baseUrl()}${DEFAULT_IMAGE_PATH}`);
		}

		if (/^https?:\/\//.test(image)) {
			return of(image);
		}

		if (RAW_KEY_PATTERN.test(image)) {
			return this.uploadService.sign([image]).pipe(
				map((urls) => urls[image] || `${this.baseUrl()}${DEFAULT_IMAGE_PATH}`),
			);
		}

		return of(`${this.baseUrl()}${DEFAULT_IMAGE_PATH}`);
	}
}
