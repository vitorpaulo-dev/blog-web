import {
	AfterViewInit,
	ChangeDetectionStrategy,
	Component,
	ElementRef,
	Inject,
	Input,
	PLATFORM_ID,
	ViewChild,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Component({
	selector: 'app-giscus',
	standalone: true,
	template: `<div #giscus></div>`,
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GiscusComponent implements AfterViewInit {
	@ViewChild('giscus', { static: true })
	private readonly giscus!: ElementRef<HTMLElement>;

	@Input() lang = 'en';

	constructor(
		@Inject(PLATFORM_ID) private readonly platformId: object,
	) {}

	ngAfterViewInit(): void {
		if (!isPlatformBrowser(this.platformId)) {
			return;
		}

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
			'data-lang': this.lang,
		}).forEach(([key, value]) => {
			script.setAttribute(key, value);
		});

		script.async = true;
		script.crossOrigin = 'anonymous';

		this.giscus.nativeElement.appendChild(script);
	}
}