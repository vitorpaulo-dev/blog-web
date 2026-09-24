import { Component, INJECTOR } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { vi } from 'vitest';
import { POLYMORPHEUS_CONTEXT, PolymorpheusComponent } from '@taiga-ui/polymorpheus';
import { provideTaiga, TuiRoot } from '@taiga-ui/core';
import { TuiPreviewDialogService } from '@taiga-ui/kit';
import { ImageLightboxDialogComponent } from './image-lightbox-dialog.component';
import { translationProvider } from '../../../core/i18n/testing';

Object.defineProperty(window, 'matchMedia', {
	writable: true,
	value: vi.fn().mockImplementation((query) => ({
		matches: false,
		media: query,
		onchange: null,
		addListener: vi.fn(),
		removeListener: vi.fn(),
		addEventListener: vi.fn(),
		removeEventListener: vi.fn(),
		dispatchEvent: vi.fn(),
	})),
});

const complete = vi.fn();

function setup() {
	TestBed.configureTestingModule({
		imports: [ImageLightboxDialogComponent],
		providers: [
			provideTaiga(),
			translationProvider(),
			{
				provide: POLYMORPHEUS_CONTEXT,
				useValue: {
					data: { src: 'https://cdn.example.com/photo.png', alt: 'photo' },
					$implicit: { complete },
				},
			},
		],
	});

	const fixture = TestBed.createComponent(ImageLightboxDialogComponent);
	const component = fixture.componentInstance;
	fixture.detectChanges();

	return { fixture, component };
}

function closeButton(fixture: ComponentFixture<ImageLightboxDialogComponent>): HTMLButtonElement {
	return fixture.nativeElement.querySelector('button[tuiIconButton]') as HTMLButtonElement;
}

describe('ImageLightboxDialogComponent', () => {
	beforeEach(() => {
		complete.mockClear();
	});

	it('renders the preview image with the context data', () => {
		const { fixture } = setup();
		const image = fixture.nativeElement.querySelector('img') as HTMLImageElement;

		expect(fixture.nativeElement.querySelector('tui-preview')).toBeTruthy();
		expect(image.getAttribute('src')).toBe('https://cdn.example.com/photo.png');
		expect(image.getAttribute('alt')).toBe('photo');
	});

	it('renders the preview title from the image alt', () => {
		const { fixture } = setup();
		const title = fixture.nativeElement.querySelector('tui-preview-title');

		expect(title?.textContent?.trim()).toBe('photo');
	});

	it('does not render a rotate button', () => {
		const { fixture } = setup();

		expect(fixture.nativeElement.querySelector('tui-preview .t-rotate-button')).toBeNull();
	});

	it('the preview close action completes the dialog context', () => {
		const { fixture } = setup();

		closeButton(fixture).click();

		expect(complete).toHaveBeenCalledTimes(1);
	});

	it('Escape keydown dismisses the open preview and completes the context', async () => {
		TestBed.configureTestingModule({
			imports: [DismissHostComponent],
			providers: [provideTaiga(), translationProvider()],
		});

		const fixture = TestBed.createComponent(DismissHostComponent);
		fixture.detectChanges();

		let dismissed = false;
		TestBed.inject(TuiPreviewDialogService)
			.open(
				new PolymorpheusComponent(
					ImageLightboxDialogComponent,
					TestBed.inject(INJECTOR),
				),
			)
			.subscribe({ complete: () => (dismissed = true) });

		fixture.detectChanges();
		await fixture.whenStable();
		fixture.detectChanges();

		document.dispatchEvent(
			new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }),
		);
		fixture.detectChanges();
		await fixture.whenStable();
		fixture.detectChanges();
		await new Promise((resolve) => setTimeout(resolve, 0));
		await new Promise((resolve) => setTimeout(resolve, 0));

		expect(dismissed).toBe(true);
	});
});

@Component({
	selector: 'test-dismiss-host',
	standalone: true,
	imports: [TuiRoot],
	template: `<tui-root></tui-root>`,
})
class DismissHostComponent {}
