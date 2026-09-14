import { Component, DestroyRef, forwardRef, inject, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HugeiconsIconComponent } from '@hugeicons/angular';
import { CloudUploadIcon, ImageAddIcon } from '@hugeicons/core-free-icons';

import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { UploadFolder, UploadService, UploadSubfolder } from '../../../core/upload/upload.service';
import { ImageSignDirective } from '../../directives/image-sign.directive';

@Component({
	selector: 'app-upload-input',
	standalone: true,
	imports: [CommonModule, TranslatePipe, ImageSignDirective, HugeiconsIconComponent],
	providers: [
		{
			provide: NG_VALUE_ACCESSOR,
			useExisting: forwardRef(() => UploadInputComponent),
			multi: true,
		},
	],
	template: `
		<div>
			<input
				type="file"
				accept="image/*"
				(change)="onFileSelected($event)"
				[disabled]="uploading() || disabled()"
				hidden
				#fileInput
			/>

			<button
				type="button"
				(click)="fileInput.click()"
				[disabled]="uploading() || disabled()"
				[attr.aria-busy]="uploading()"
				class="group relative w-full overflow-hidden rounded-xl border border-border bg-surface text-left transition-colors hover:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-50"
			>
				@if (localPreview(); as blobUrl) {
				<!-- Local blob preview while uploading -->
				<div class="relative aspect-video w-full overflow-hidden bg-black/20">
					<img
						[src]="blobUrl"
						[alt]="previewAlt() || ('shared.upload.previewAlt' | translate)"
						class="h-full w-full object-cover"
					/>

					<div
						class="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/60 text-white"
					>
						<span
							class="h-6 w-6 animate-spin rounded-full border-2 border-white border-t-transparent"
							aria-hidden="true"
						></span>

						<span class="text-sm font-medium">
							{{ 'shared.upload.uploading' | translate }}
						</span>
					</div>
				</div>
			} @else if (value(); as imageUrl) {
					<div class="relative aspect-video w-full overflow-hidden bg-black/20">
						<img
							[appImageSign]="imageUrl"
							[src]="imageUrl"
							[alt]="previewAlt() || ('shared.upload.previewAlt' | translate)"
							loading="lazy"
							class="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
						/>

						<!-- Image hover overlay -->
						<div
							class="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/0 transition-colors duration-200 group-hover:bg-black/50"
						>
							<span
								class="flex h-11 w-11 items-center justify-center rounded-full bg-black/70 text-white opacity-0 transition-all duration-200 group-hover:opacity-100"
							>
								<hugeicons-icon [icon]="ImageEdit01Icon" [size]="22" [strokeWidth]="1.8" />
							</span>

							<span
								class="text-sm font-medium text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100"
							>
								{{ 'shared.upload.change' | translate }}
							</span>
						</div>

						<!-- Upload loading state -->
						@if (uploading()) {
							<div
								class="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/60 text-white"
							>
								<span
									class="h-6 w-6 animate-spin rounded-full border-2 border-white border-t-transparent"
									aria-hidden="true"
								></span>

								<span class="text-sm font-medium">
									{{ 'shared.upload.uploading' | translate }}
								</span>
							</div>
						}
					</div>
				} @else {
					<!-- Empty state -->
					<div
						class="flex aspect-video w-full flex-col items-center justify-center gap-3 text-muted transition-colors group-hover:text-foreground"
					>
						<span
							class="flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-background transition-colors group-hover:border-accent group-hover:text-accent"
						>
							<hugeicons-icon [icon]="CloudUploadIcon" [size]="24" [strokeWidth]="1.8" />
						</span>

						<div class="text-center">
							<p class="text-sm font-medium text-foreground">
								{{ placeholder() || ('shared.upload.select' | translate) }}
							</p>

							<p class="mt-1 text-xs text-muted">
								{{ 'shared.upload.previewAlt' | translate }}
							</p>
						</div>
					</div>
				}
			</button>

			@if (error()) {
				<p class="mt-2 text-xs text-red-400" role="alert">
					{{ 'shared.upload.uploadFailed' | translate }}
				</p>
			}
		</div>
	`,
})
export class UploadInputComponent implements ControlValueAccessor {
	readonly folder = input.required<UploadFolder>();
	readonly subfolder = input.required<UploadSubfolder>();

	readonly placeholder = input<string>('', {
		alias: 'placeholderUrl',
	});

	readonly previewAlt = input<string>('');

	readonly uploading = signal(false);
	readonly error = signal(false);
	readonly value = signal<string | null>(null);
	readonly localPreview = signal<string | null>(null);
	readonly disabled = signal(false);

	readonly CloudUploadIcon = CloudUploadIcon;
	readonly ImageEdit01Icon = ImageAddIcon;

	private readonly uploadService = inject(UploadService);
	private readonly destroyRef = inject(DestroyRef);

	onChange: (value: string | null) => void = () => {};
	onTouched: () => void = () => {};

	writeValue(value: string | null): void {
		this.value.set(value);
		this.error.set(false);
	}

	registerOnChange(fn: (value: string | null) => void): void {
		this.onChange = fn;
	}

	registerOnTouched(fn: () => void): void {
		this.onTouched = fn;
	}

	setDisabledState(isDisabled: boolean): void {
		this.disabled.set(isDisabled);
	}

	onFileSelected(event: Event): void {
		const input = event.target as HTMLInputElement;
		const file = input.files?.[0];

		// Allow selecting the same file again.
		input.value = '';

		this.onTouched();

		if (!file) {
			return;
		}

		if (!file.type.startsWith('image/')) {
			this.error.set(true);
			return;
		}

		this.uploading.set(true);
		this.error.set(false);
		this.localPreview.set(URL.createObjectURL(file));

		this.uploadService
			.upload(file, this.folder(), this.subfolder())
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: (key) => {
					this.value.set(key);
					this.onChange(key);
					this.uploading.set(false);
					this.revokePreview();
				},
				error: () => {
					this.uploading.set(false);
					this.error.set(true);
					this.revokePreview();
				},
			});
	}

	private revokePreview(): void {
		const preview = this.localPreview();
		if (preview) {
			URL.revokeObjectURL(preview);
		}
		this.localPreview.set(null);
	}
}
