import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { of, switchMap } from 'rxjs';
import { ImageSignDirective } from './image-sign.directive';
import { UploadService } from '../../core/upload/upload.service';

@Component({
	selector: 'test-host',
	imports: [ImageSignDirective],
	template: `
		@if (rawSrc()) {
			<img data-testid="raw" [appImageSign]="rawSrc()" [src]="rawSrc()" alt="raw" />
		}
		@if (fullSrc()) {
			<img data-testid="full" [src]="fullSrc()" alt="full" />
		}
	`,
})
class HostComponent {
	readonly rawSrc = signal('');
	readonly fullSrc = signal('');
}

describe('ImageSignDirective', () => {
	function setup(sign: ReturnType<typeof vi.fn>) {
		TestBed.configureTestingModule({
			imports: [HostComponent],
			providers: [{ provide: UploadService, useValue: { sign } }],
		});

		return TestBed.createComponent(HostComponent);
	}

	it('starts skeleton, calls sign, applies CDN url from the sign endpoint', async () => {
		const sign = vi.fn().mockReturnValue(of({ 'post/banner/a.jpg': 'https://cdn.vitorpaulo.dev/post/banner/a.jpg' }));

		const fixture = setup(sign);
		fixture.componentInstance.rawSrc.set('post/banner/a.jpg');
		fixture.detectChanges();
		await new Promise((resolve) => setTimeout(resolve, 0));

		const img = fixture.nativeElement.querySelector('[data-testid="raw"]') as HTMLImageElement;
		expect(sign).toHaveBeenCalled();
		expect(img.getAttribute('src')).toBe('https://cdn.vitorpaulo.dev/post/banner/a.jpg');
		expect(img.loading).toBe('lazy');
	});

	it('falls back on sign errors', async () => {
		const sign = vi.fn().mockReturnValue(
			of({}).pipe(
				switchMap(() => {
					throw new Error('boom');
				})
			)
		);

		const fixture = setup(sign);
		fixture.componentInstance.rawSrc.set('post/banner/a.jpg');
		fixture.detectChanges();
		await new Promise((resolve) => setTimeout(resolve, 0));

		const img = fixture.nativeElement.querySelector('[data-testid="raw"]') as HTMLImageElement;
		expect(img.classList.contains('img-skeleton')).toBe(false);
		expect(img.getAttribute('src')).toBe('https://cataas.com/cat');
	});

	it('leaves full urls untouched', () => {
		const sign = vi.fn().mockReturnValue(of({}));

		const fixture = setup(sign);
		fixture.componentInstance.fullSrc.set('https://cdn.example/photo.jpg');
		fixture.detectChanges();

		const img = fixture.nativeElement.querySelector('[data-testid="full"]') as HTMLImageElement;
		expect(sign).not.toHaveBeenCalled();
		expect(img.getAttribute('src')).toBe('https://cdn.example/photo.jpg');
	});
});
