import {
	AfterViewInit,
	ChangeDetectionStrategy,
	Component,
	ElementRef,
	PLATFORM_ID,
	computed,
	effect,
	inject,
	signal,
	viewChild,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { LanguageService } from '../../../core/i18n/language.service';

@Component({
	selector: 'app-giscus',
	standalone: true,
	template: `<div #giscus></div>`,
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GiscusComponent implements AfterViewInit {
	private readonly giscusRef = viewChild.required<ElementRef<HTMLElement>>('giscus');
	private readonly platformId = inject(PLATFORM_ID);
	private readonly languageService = inject(LanguageService);

	private readonly giscusLanguage = computed(() =>
		this.languageService.language() === 'PORTUGUESE' ? 'pt' : 'en'
	);
	private readonly ready = signal(false);

	constructor() {
		effect(() => {
			const lang = this.giscusLanguage();
			const container = this.giscusRef()?.nativeElement;

			if (!this.ready() || !container || !isPlatformBrowser(this.platformId)) {
				return;
			}

			this.appendScript(container, lang);
		});
	}

	ngAfterViewInit(): void {
		this.ready.set(true);
	}

	private appendScript(container: HTMLElement, lang: string): void {
		container.replaceChildren();

		const script = document.createElement('script');

		Object.entries({
			src: 'https://giscus.app/client.js',
			'data-repo': 'vitorpaulo-dev/blog-workspace',
			'data-repo-id': 'R_kgDOUIe6Kg',
			'data-category': 'General',
			'data-category-id': 'DIC_kwDOUIe6Ks4DEsjz',
			'data-mapping': 'pathname',
			'data-strict': '0',
			'data-reactions-enabled': '0',
			'data-emit-metadata': '0',
			'data-input-position': 'top',
			'data-theme': 'dark',
			'data-lang': lang,
		}).forEach(([key, value]) => {
			script.setAttribute(key, value);
		});

		script.async = true;
		script.crossOrigin = 'anonymous';

		container.appendChild(script);
	}
}
