import { Component, DestroyRef, forwardRef, inject, input, signal, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { UploadService, UploadFolder } from '../../../core/upload/upload.service';
import { MarkdownService } from '../../../features/posts/data-access/markdown.service';
import { ImageSignContainerDirective } from '../../directives/image-sign.directive';

@Component({
	selector: 'app-markdown-writer',
	standalone: true,
	imports: [CommonModule, TranslatePipe, ImageSignContainerDirective],
	providers: [
		{
			provide: NG_VALUE_ACCESSOR,
			useExisting: forwardRef(() => MarkdownWriterComponent),
			multi: true,
		},
	],
	template: `
		<div class="flex flex-col gap-2">
			<div class="flex gap-1 border-b border-border">
				<button
					type="button"
					class="px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px"
					[class.border-accent]="mode() === 'edit'"
					[class.text-accent]="mode() === 'edit'"
					[class.text-muted]="mode() !== 'edit'"
					(click)="mode.set('edit')"
				>
					{{ 'shared.markdown.editTab' | translate }}
				</button>
				<button
					type="button"
					class="px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px"
					[class.border-accent]="mode() === 'preview'"
					[class.text-accent]="mode() === 'preview'"
					[class.text-muted]="mode() !== 'preview'"
					(click)="showPreview()"
				>
					{{ 'shared.markdown.previewTab' | translate }}
				</button>
			</div>

			@if (mode() === 'edit') {
				<div class="relative" (dragover)="onDragOver($event)" (dragleave)="onDragLeave($event)" (drop)="onDrop($event)">
					<textarea
						[value]="value ?? ''"
						(input)="onInput($event)"
						(blur)="onTouched()"
						[rows]="rows()"
						class="w-full resize-none rounded-xl border border-border bg-surface p-3 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-accent"
						[placeholder]="placeholder()"
					></textarea>
					@if (dragging()) {
						<div class="pointer-events-none absolute inset-0 flex items-center justify-center rounded-xl border-2 border-dashed border-accent bg-accent/10">
							<div class="text-center">
								<p class="text-sm font-medium text-accent">{{ 'shared.markdown.dropImage' | translate }}</p>
							</div>
						</div>
					}
					@if (error()) {
						<p class="text-xs text-red-400 mt-1" role="alert">{{ 'shared.upload.uploadFailed' | translate }}</p>
					}
				</div>
			} @else {
				<div
					[innerHTML]="preview()"
					appImageSignContainer
					class="prose prose-invert min-h-[200px] w-full max-w-none rounded-xl border border-border bg-surface p-4"
				></div>
				@if (!value) {
					<p class="text-sm text-muted">{{ 'shared.markdown.nothingToPreview' | translate }}</p>
				}
			}
		</div>
	`,
})
export class MarkdownWriterComponent implements ControlValueAccessor {
	readonly uploadFolder = input.required<UploadFolder>();
	readonly placeholder = input<string>('');
	readonly rows = input<number>(20);

	readonly mode = signal<'edit' | 'preview'>('edit');
	readonly dragging = signal(false);
	readonly uploading = signal(false);
	readonly error = signal(false);
	readonly preview = signal<string>('');

	value: string | null = null;
	disabled = false;

	private readonly uploadService = inject(UploadService);
	private readonly markdownService = inject(MarkdownService);
	private readonly platformId = inject(PLATFORM_ID);
	private readonly destroyRef = inject(DestroyRef);
	private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

	onChange: (value: string | null) => void = () => {};
	onTouched: () => void = () => {};

	writeValue(value: string | null): void {
		this.value = value;
	}

	registerOnChange(fn: (value: string | null) => void): void {
		this.onChange = fn;
	}

	registerOnTouched(fn: () => void): void {
		this.onTouched = fn;
	}

	setDisabledState(isDisabled: boolean): void {
		this.disabled = isDisabled;
	}

	onInput(event: Event): void {
		this.value = (event.target as HTMLTextAreaElement).value;
		this.onChange(this.value);
	}

	onDragOver(event: DragEvent): void {
		event.preventDefault();
		this.dragging.set(true);
	}

	onDragLeave(event: DragEvent): void {
		event.preventDefault();
		this.dragging.set(false);
	}

	onDrop(event: DragEvent): void {
		event.preventDefault();
		this.dragging.set(false);

		const file = event.dataTransfer?.files?.[0];
		if (!file || !file.type.startsWith('image/')) {
			return;
		}

		this.uploadImage(file);
	}

	async showPreview(): Promise<void> {
		this.mode.set('preview');
		this.preview.set(this.value ? ((await this.markdownService.renderMarkdown(this.value, this.isBrowser)) as string) : '');
	}

	private uploadImage(file: File): void {
		this.uploading.set(true);
		this.error.set(false);

		this.uploadService
			.upload(file, this.uploadFolder(), 'content')
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: (key) => {
					this.insertImageAtCursor(file.name, key);
					this.uploading.set(false);
				},
				error: () => {
					this.uploading.set(false);
					this.error.set(true);
				},
			});
	}

	private insertImageAtCursor(name: string, key: string): void {
		const markdown = `\n![${name}](${key})\n`;
		this.value = `${this.value ?? ''}${markdown}`;
		this.onChange(this.value);
	}
}
