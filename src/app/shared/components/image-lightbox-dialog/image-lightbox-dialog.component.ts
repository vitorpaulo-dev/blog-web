import { Component, computed, inject } from '@angular/core';
import { type TuiPortalContext } from '@taiga-ui/cdk/portals';
import { TuiButton } from '@taiga-ui/core';
import { TuiPreview } from '@taiga-ui/kit';
import { injectContext } from '@taiga-ui/polymorpheus';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';

export interface LightboxImage {
	readonly src: string;
	readonly alt: string;
}

@Component({
	selector: 'app-image-lightbox-dialog',
	standalone: true,
	imports: [TuiButton, TuiPreview, TranslatePipe],
	template: `
		<tui-preview [rotatable]="false" [initialScale]="1">
			@if (data().alt) {
				<tui-preview-title>{{ data().alt }}</tui-preview-title>
			}
			<img
				[src]="data().src"
				[alt]="data().alt || ('lightbox.image' | translate)"
				draggable="false"
			/>
			<button
				type="button"
				tuiIconButton
				tuiPreviewAction
				iconStart="@tui.x"
				[title]="'lightbox.close' | translate"
				[attr.aria-label]="'lightbox.close' | translate"
				(click)="close()"
			>
				{{ 'lightbox.close' | translate }}
			</button>
		</tui-preview>
	`,
})
export class ImageLightboxDialogComponent {
	private readonly context = injectContext<TuiPortalContext<{ readonly data?: LightboxImage }>>();

	readonly data = computed<LightboxImage>(() => this.context.data ?? { src: '', alt: '' });

	close(): void {
		this.context.$implicit.complete();
	}
}
