import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { vi, type Mock } from 'vitest';
import { EMPTY } from 'rxjs';
import { TuiPreviewDialogService } from '@taiga-ui/kit';
import { ImageLightboxDirective } from './image-lightbox.directive';

@Component({
	selector: 'test-host',
	imports: [ImageLightboxDirective],
	template: `
		<div appImageLightbox data-testid="container">
			<img data-testid="content" src="https://cdn.example.com/content.png" alt="diagram" />
			<a data-testid="link" href="https://example.com">
				<img data-testid="linked" src="https://cdn.example.com/linked.png" alt="linked" />
			</a>
			<p data-testid="text">Not an image</p>
			<div class="mermaid" data-testid="mermaid">
				<svg
					data-testid="mermaid-svg"
					xmlns="http://www.w3.org/2000/svg"
					xmlns:xlink="http://www.w3.org/1999/xlink"
					aria-label="Auth flow"
					viewBox="0 0 400 300"
					width="100%"
					style="max-width: 400px;"
				>
					<style>g { fill: red; }</style>
					<g><rect /></g>
				</svg>
			</div>
			<a data-testid="mermaid-link" href="https://example.com">
				<div class="mermaid">
					<svg xmlns="http://www.w3.org/2000/svg"></svg>
				</div>
			</a>
		</div>
	`,
})
class HostComponent {}

describe('ImageLightboxDirective', () => {
	function setup() {
		const previewsMock = { open: vi.fn().mockReturnValue(EMPTY) };

		TestBed.configureTestingModule({
			imports: [HostComponent],
			providers: [{ provide: TuiPreviewDialogService, useValue: previewsMock }],
		});

		const fixture = TestBed.createComponent(HostComponent);

		return { fixture, open: previewsMock.open as Mock };
	}

	it('opens the lightbox dialog with the clicked image src and alt', () => {
		const { fixture, open } = setup();
		fixture.detectChanges();

		const img = fixture.nativeElement.querySelector('[data-testid="content"]') as HTMLImageElement;
		img.click();

		expect(open).toHaveBeenCalledTimes(1);

		const [content, options] = open.mock.calls[0] as unknown as [unknown, { data: { src: string; alt: string } }];
		expect(options.data).toEqual({ src: 'https://cdn.example.com/content.png', alt: 'diagram' });
		expect(content).toBeTruthy();
	});

	it('does not open the dialog when the clicked image is inside a link', () => {
		const { fixture, open } = setup();
		fixture.detectChanges();

		const img = fixture.nativeElement.querySelector('[data-testid="linked"]') as HTMLImageElement;
		img.click();

		expect(open).not.toHaveBeenCalled();
	});

	it('does not open the dialog for non-image clicks', () => {
		const { fixture, open } = setup();
		fixture.detectChanges();

		const text = fixture.nativeElement.querySelector('[data-testid="text"]') as HTMLElement;
		text.click();

		expect(open).not.toHaveBeenCalled();
	});

	it('opens the lightbox with the serialized mermaid svg as a data URL', () => {
		const { fixture, open } = setup();
		fixture.detectChanges();

		const svg = fixture.nativeElement.querySelector('[data-testid="mermaid-svg"]') as Element;
		svg.dispatchEvent(new MouseEvent('click', { bubbles: true }));

		expect(open).toHaveBeenCalledTimes(1);

		const [, options] = open.mock.calls[0] as unknown as [unknown, { data: { src: string; alt: string } }];
		expect(options.data.src).toMatch(/^data:image\/svg\+xml;charset=utf-8,/);
		expect(decodeURIComponent(options.data.src)).toContain('xmlns="http://www.w3.org/2000/svg"');
		expect(decodeURIComponent(options.data.src)).toContain('xmlns:xlink="http://www.w3.org/1999/xlink"');
		expect(options.data.alt).toBe('Auth flow');

		const decoded = decodeURIComponent(options.data.src);
		expect(decoded).toContain('width="400"');
		expect(decoded).toContain('height="300"');
		expect(decoded).toContain('preserveAspectRatio="xMidYMid meet"');
		expect(decoded).not.toContain('max-width');
		expect(decoded).not.toContain('width="100%"');
		expect(decoded).toContain('g { fill: red; }');
	});

	it('opens the lightbox when clicking inside the mermaid container but outside the svg', () => {
		const { fixture, open } = setup();
		fixture.detectChanges();

		const container = fixture.nativeElement.querySelector('[data-testid="mermaid"]') as HTMLElement;
		container.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: 1, clientY: 1 }));

		expect(open).toHaveBeenCalledTimes(1);
	});

	it('does not open the dialog when the mermaid diagram is inside a link', () => {
		const { fixture, open } = setup();
		fixture.detectChanges();

		const link = fixture.nativeElement.querySelector('[data-testid="mermaid-link"]') as HTMLElement;
		link.dispatchEvent(new MouseEvent('click', { bubbles: true }));

		expect(open).not.toHaveBeenCalled();
	});
});
