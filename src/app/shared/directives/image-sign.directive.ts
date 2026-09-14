import {
	Directive,
	ElementRef,
	inject,
	input,
	OnDestroy,
	OnInit,
	PLATFORM_ID,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Subscription } from 'rxjs';
import { UploadService } from '../../core/upload/upload.service';

const FALLBACK_URL = 'https://cataas.com/cat';
const TRANSPARENT_IMAGE =
	'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=';

const SKELETON_CLASS = 'img-skeleton';
const SIGN_KEY_ATTRIBUTE = 'signKey';
const HANDLED_ATTRIBUTE = 'signHandled';

const RAW_KEY_PATTERN =
	/^(?:post|project)\/(?:banner|logo|content)\/[\w.-]+$/;

function isRawKey(value: string | null): value is string {
	return !!value && RAW_KEY_PATTERN.test(value);
}

function prepareImage(img: HTMLImageElement): void {
	img.loading = 'lazy';
	img.classList.add(SKELETON_CLASS);

	img.onload = () => {
		img.classList.remove(SKELETON_CLASS);
	};

	img.onerror = () => {
		applyFallback(img);
	};
}

function applyFallback(img: HTMLImageElement): void {
	if (img.dataset['signFallbackApplied'] === 'true') {
		return;
	}

	img.dataset['signFallbackApplied'] = 'true';
	img.classList.remove(SKELETON_CLASS);
	img.classList.add('rounded-xl');
	img.src = FALLBACK_URL;
}

function setSignedImage(
	img: HTMLImageElement,
	url: string | undefined,
): void {
	if (!url) {
		applyFallback(img);
		return;
	}

	// Skeleton remains until the signed image fires `load`.
	img.src = url;
}

function startSigning(img: HTMLImageElement, key: string): void {
	img.dataset[SIGN_KEY_ATTRIBUTE] = key;
	img.dataset[HANDLED_ATTRIBUTE] = 'true';

	prepareImage(img);

	// Keep the image element valid while signing.
	img.src = TRANSPARENT_IMAGE;
}

function getSignKey(img: HTMLImageElement): string | null {
	return img.dataset[SIGN_KEY_ATTRIBUTE] ?? null;
}

@Directive({
	selector: 'img[appImageSign]',
})
export class ImageSignDirective implements OnInit, OnDestroy {
	readonly appImageSign = input.required<string>();

	private readonly uploadService = inject(UploadService);
	private readonly elementRef =
		inject<ElementRef<HTMLImageElement>>(ElementRef);
	private readonly platformId = inject(PLATFORM_ID);

	private subscription?: Subscription;

	ngOnInit(): void {
		if (!isPlatformBrowser(this.platformId)) {
			return;
		}

		const img = this.elementRef.nativeElement;
		const key = this.appImageSign();

		if (!isRawKey(key)) {
			prepareImage(img);
			return;
		}

		startSigning(img, key);

		this.subscription = this.uploadService.sign([key]).subscribe({
			next: (urls) => {
				setSignedImage(img, urls[key]);
			},
			error: () => {
				applyFallback(img);
			},
		});
	}

	ngOnDestroy(): void {
		const img = this.elementRef.nativeElement;

		img.onload = null;
		img.onerror = null;

		this.subscription?.unsubscribe();
	}
}

@Directive({
	selector: '[appImageSignContainer]',
})
export class ImageSignContainerDirective implements OnInit, OnDestroy {
	private readonly uploadService = inject(UploadService);
	private readonly elementRef =
		inject<ElementRef<HTMLElement>>(ElementRef);
	private readonly platformId = inject(PLATFORM_ID);

	private observer?: MutationObserver;
	private subscription?: Subscription;

	ngOnInit(): void {
		if (!isPlatformBrowser(this.platformId)) {
			return;
		}

		this.observer = new MutationObserver(() => {
			this.signImages();
		});

		this.observer.observe(this.elementRef.nativeElement, {
			childList: true,
			subtree: true,
		});

		this.signImages();
	}

	ngOnDestroy(): void {
		this.observer?.disconnect();
		this.subscription?.unsubscribe();
	}

	private signImages(): void {
		const images = this.findUnsignedImages();

		if (images.length === 0) {
			return;
		}

		const keys = images
			.map((img) => this.prepareImage(img))
			.filter((key): key is string => key !== null);

		if (keys.length === 0) {
			return;
		}

		this.subscription?.unsubscribe();

		this.subscription = this.uploadService.sign(keys).subscribe({
			next: (urls) => {
				for (const img of images) {
					const key = getSignKey(img);

					if (!key) {
						applyFallback(img);
						continue;
					}

					setSignedImage(img, urls[key]);
				}
			},
			error: () => {
				for (const img of images) {
					applyFallback(img);
				}
			},
		});
	}

	private findUnsignedImages(): HTMLImageElement[] {
		return Array.from(
			this.elementRef.nativeElement.querySelectorAll('img'),
		).filter((img) => {
			if (img.dataset[HANDLED_ATTRIBUTE] === 'true') {
				return false;
			}

			return isRawKey(img.getAttribute('src'));
		});
	}

	private prepareImage(img: HTMLImageElement): string | null {
		const key = img.getAttribute('src');

		if (!isRawKey(key)) {
			return null;
		}

		startSigning(img, key);

		img.classList.add('rounded-xl');

		return key;
	}
}