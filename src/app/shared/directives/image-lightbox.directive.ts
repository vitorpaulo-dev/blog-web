import {
	Directive,
	ElementRef,
	Injector,
	inject,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { PLATFORM_ID } from '@angular/core';
import { DestroyRef } from '@angular/core';
import { PolymorpheusComponent } from '@taiga-ui/polymorpheus';
import { TuiPreviewDialogService } from '@taiga-ui/kit';

import { ImageLightboxDialogComponent, type LightboxImage } from '../components/image-lightbox-dialog/image-lightbox-dialog.component';

@Directive({
	selector: '[appImageLightbox]',
})
export class ImageLightboxDirective {
	private readonly elementRef = inject<ElementRef<HTMLElement>>(ElementRef);
	private readonly platformId = inject(PLATFORM_ID);
	private readonly destroyRef = inject(DestroyRef);
	private readonly previews = inject(TuiPreviewDialogService);
	private readonly injector = inject(Injector);

	constructor() {
		if (!isPlatformBrowser(this.platformId)) {
			return;
		}

		const handler = (event: MouseEvent): void => this.onClick(event);
		const host = this.elementRef.nativeElement;

		host.addEventListener('click', handler);
		this.destroyRef.onDestroy(() => {
			host.removeEventListener('click', handler);
		});
	}

	private onClick(event: MouseEvent): void {
		const target = event.target;

		if (!(target instanceof Element)) {
			return;
		}

		const host = this.elementRef.nativeElement;
		const image = target.closest('img');

		if (image && host.contains(image)) {
			this.openImage(event, image);
			return;
		}

		const mermaid = target.closest('.mermaid');

		if (mermaid && host.contains(mermaid)) {
			this.openMermaid(event, mermaid);
		}
	}

	private openImage(event: MouseEvent, image: HTMLImageElement): void {
		if (image.closest('a')) {
			return;
		}

		const src = image.currentSrc || image.getAttribute('src') || image.src;

		if (!src) {
			return;
		}

		event.preventDefault();
		this.open({ src, alt: image.getAttribute('alt') ?? '' });
	}

	private openMermaid(event: MouseEvent, container: Element): void {
		if (container.closest('a')) {
			return;
		}

		const svg = container.querySelector('svg');

		if (!svg) {
			return;
		}

		event.preventDefault();

		const serialized = this.serializeMermaidSvg(svg);
		const src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(serialized)}`;

		this.open({ src, alt: svg.getAttribute('aria-label') ?? '' });
	}

	private serializeMermaidSvg(svg: SVGSVGElement): string {
		const clone = svg.cloneNode(true) as SVGSVGElement;
		const size = this.resolveMermaidSize(svg, clone);

		clone.removeAttribute('style');
		clone.removeAttribute('width');
		clone.removeAttribute('height');
		clone.setAttribute('width', String(size.width));
		clone.setAttribute('height', String(size.height));
		clone.setAttribute('preserveAspectRatio', 'xMidYMid meet');

		if (!clone.getAttribute('xmlns')) {
			clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
		}

		if (!clone.getAttribute('xmlns:xlink')) {
			clone.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');
		}

		return new XMLSerializer().serializeToString(clone);
	}

	private resolveMermaidSize(svg: SVGSVGElement, clone: SVGSVGElement): { width: number; height: number } {
		const viewBox = clone.viewBox?.baseVal;

		if (viewBox && viewBox.width > 0 && viewBox.height > 0) {
			return { width: viewBox.width, height: viewBox.height };
		}

		const rect = svg.getBoundingClientRect();

		if (rect.width > 0 && rect.height > 0) {
			return { width: rect.width, height: rect.height };
		}

		const width = Number.parseFloat(svg.getAttribute('width') ?? '');

		return {
			width: Number.isFinite(width) ? width : 600,
			height: 400,
		};
	}

	private open(data: LightboxImage): void {
		this.previews
			.open(new PolymorpheusComponent(ImageLightboxDialogComponent, this.injector), {
				data,
			})
			.subscribe();
	}
}
