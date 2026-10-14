import { ChangeDetectorRef, Component, DestroyRef, ElementRef, forwardRef, inject, input, signal, viewChild, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TuiDropdown, TuiHint } from '@taiga-ui/core';
import { TuiDataListWrapper } from '@taiga-ui/kit';
import { HugeiconsIconComponent } from '@hugeicons/angular';
import { BoldIcon, CodeIcon, CodeSquareIcon, ItalicIcon, Link01Icon, ListIcon, ListOrderedIcon, NoteIcon, QuoteUpIcon, SheetIcon, StrikethroughIcon } from '@hugeicons/core-free-icons';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { UploadService, UploadFolder } from '../../../core/upload/upload.service';
import { MarkdownService } from '../../../features/posts/data-access/markdown.service';
import { ImageSignContainerDirective } from '../../directives/image-sign.directive';

type CalloutKind = 'NOTE' | 'TIP' | 'IMPORTANT' | 'WARNING' | 'CAUTION';

const PASTED_URL_RE = /^https?:\/\/\S+$/i;
const PASTED_IMAGE_FALLBACK_NAME = 'pasted-image.png';

const TOOLBAR_BUTTON_CLASS =
	'flex size-7 items-center justify-center rounded-lg text-muted transition-colors hover:bg-accent/10 hover:text-accent';

@Component({
	selector: 'app-markdown-writer',
	standalone: true,
	imports: [
		CommonModule,
		TranslatePipe,
		ImageSignContainerDirective,
		TuiDropdown,
		TuiHint,
		TuiDataListWrapper,
		HugeiconsIconComponent,
	],
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
					<div class="mb-1 flex items-center gap-1 rounded-xl border border-border bg-surface px-2 py-1">
						<button
							type="button"
							[class]="TOOLBAR_BUTTON_CLASS"
							tuiHintDescribe
							[tuiHint]="'shared.markdown.toolbar.hint.bold' | translate"
							[attr.aria-label]="'shared.markdown.toolbar.bold' | translate"
							(click)="insertBold()"
						>
							<hugeicons-icon [icon]="BoldIcon" [size]="18" [strokeWidth]="2.5" />
						</button>
						<button
							type="button"
							[class]="TOOLBAR_BUTTON_CLASS"
							tuiHintDescribe
							[tuiHint]="'shared.markdown.toolbar.hint.italic' | translate"
							[attr.aria-label]="'shared.markdown.toolbar.italic' | translate"
							(click)="insertItalic()"
						>
							<hugeicons-icon [icon]="ItalicIcon" [size]="18" [strokeWidth]="2.5" />
						</button>
						<button
							type="button"
							[class]="TOOLBAR_BUTTON_CLASS"
							tuiHintDescribe
							[tuiHint]="'shared.markdown.toolbar.hint.strikethrough' | translate"
							[attr.aria-label]="'shared.markdown.toolbar.strikethrough' | translate"
							(click)="insertStrikethrough()"
						>
							<hugeicons-icon [icon]="StrikethroughIcon" [size]="18" [strokeWidth]="2.5" />
						</button>
						<button
							type="button"
							[class]="TOOLBAR_BUTTON_CLASS"
							tuiHintDescribe
							[tuiHint]="'shared.markdown.toolbar.hint.inlineCode' | translate"
							[attr.aria-label]="'shared.markdown.toolbar.inlineCode' | translate"
							(click)="insertInlineCode()"
						>
							<hugeicons-icon [icon]="CodeIcon" [size]="18" [strokeWidth]="2.5" />
						</button>
						<button
							type="button"
							[class]="TOOLBAR_BUTTON_CLASS"
							tuiHintDescribe
							[tuiHint]="'shared.markdown.toolbar.hint.codeBlock' | translate"
							[attr.aria-label]="'shared.markdown.toolbar.codeBlock' | translate"
							(click)="insertCodeBlock()"
						>
							<hugeicons-icon [icon]="CodeSquareIcon" [size]="18" [strokeWidth]="2.5" />
						</button>
						<button
							type="button"
							[class]="TOOLBAR_BUTTON_CLASS"
							tuiHintDescribe
							[tuiHint]="'shared.markdown.toolbar.hint.link' | translate"
							[attr.aria-label]="'shared.markdown.toolbar.link' | translate"
							(click)="insertLink()"
						>
							<hugeicons-icon [icon]="Link01Icon" [size]="18" [strokeWidth]="2.5" />
						</button>
						<button
							type="button"
							[class]="TOOLBAR_BUTTON_CLASS"
							tuiDropdownAuto
							[tuiDropdown]="calloutDropdown"
							tuiHintDescribe
							[tuiHint]="'shared.markdown.toolbar.hint.callout' | translate"
							[attr.aria-label]="'shared.markdown.toolbar.callout' | translate"
						>
							<hugeicons-icon [icon]="NoteIcon" [size]="18" [strokeWidth]="2.5" />
						</button>
						<button
							type="button"
							[class]="TOOLBAR_BUTTON_CLASS"
							tuiHintDescribe
							[tuiHint]="'shared.markdown.toolbar.hint.quote' | translate"
							[attr.aria-label]="'shared.markdown.toolbar.quote' | translate"
							(click)="insertQuote()"
						>
							<hugeicons-icon [icon]="QuoteUpIcon" [size]="18" [strokeWidth]="2.5" />
						</button>
						<button
							type="button"
							[class]="TOOLBAR_BUTTON_CLASS"
							tuiHintDescribe
							[tuiHint]="'shared.markdown.toolbar.hint.bulletList' | translate"
							[attr.aria-label]="'shared.markdown.toolbar.bulletList' | translate"
							(click)="insertBulletList()"
						>
							<hugeicons-icon [icon]="ListIcon" [size]="18" [strokeWidth]="2.5" />
						</button>
						<button
							type="button"
							[class]="TOOLBAR_BUTTON_CLASS"
							tuiHintDescribe
							[tuiHint]="'shared.markdown.toolbar.hint.numberedList' | translate"
							[attr.aria-label]="'shared.markdown.toolbar.numberedList' | translate"
							(click)="insertNumberedList()"
						>
							<hugeicons-icon [icon]="ListOrderedIcon" [size]="18" [strokeWidth]="2.5" />
						</button>
						<button
							type="button"
							[class]="TOOLBAR_BUTTON_CLASS"
							tuiHintDescribe
							[tuiHint]="'shared.markdown.toolbar.hint.table' | translate"
							[attr.aria-label]="'shared.markdown.toolbar.table' | translate"
							(click)="insertTable()"
						>
							<hugeicons-icon [icon]="SheetIcon" [size]="18" [strokeWidth]="2.5" />
						</button>
					</div>
					<textarea
						#textareaEl
						[value]="value ?? ''"
						(input)="onInput($event)"
						(paste)="onPaste($event)"
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
					#previewEl
					[innerHTML]="preview()"
					appImageSignContainer
					class="prose prose-invert min-h-[200px] w-full max-w-none rounded-xl border border-border bg-surface p-4"
				></div>
				@if (!value) {
					<p class="text-sm text-muted">{{ 'shared.markdown.nothingToPreview' | translate }}</p>
				}
			}

			<ng-template #calloutDropdown>
				<tui-data-list-wrapper
					[items]="calloutTypes"
					[itemContent]="calloutOption"
					(itemClick)="insertCallout($event)"
				/>
			</ng-template>

			<ng-template #calloutOption let-type>
				<span class="text-sm">{{ 'shared.markdown.toolbar.' + calloutLabelKey(type) | translate }}</span>
			</ng-template>
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
	private readonly previewEl = viewChild<ElementRef<HTMLElement>>('previewEl');

	protected readonly calloutTypes: readonly CalloutKind[] = ['NOTE', 'TIP', 'IMPORTANT', 'WARNING', 'CAUTION'];
	protected readonly TOOLBAR_BUTTON_CLASS = TOOLBAR_BUTTON_CLASS;
	protected readonly BoldIcon = BoldIcon;
	protected readonly ItalicIcon = ItalicIcon;
	protected readonly StrikethroughIcon = StrikethroughIcon;
	protected readonly CodeIcon = CodeIcon;
	protected readonly CodeSquareIcon = CodeSquareIcon;
	protected readonly Link01Icon = Link01Icon;
	protected readonly NoteIcon = NoteIcon;
	protected readonly QuoteUpIcon = QuoteUpIcon;
	protected readonly ListIcon = ListIcon;
	protected readonly ListOrderedIcon = ListOrderedIcon;
	protected readonly SheetIcon = SheetIcon;

	value: string | null = null;
	disabled = false;

	private readonly textareaEl = viewChild<ElementRef<HTMLTextAreaElement>>('textareaEl');
	private readonly uploadService = inject(UploadService);
	private readonly markdownService = inject(MarkdownService);
	private readonly destroyRef = inject(DestroyRef);
	private readonly cdr = inject(ChangeDetectorRef);
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

	onPaste(event: ClipboardEvent): void {
		const file = event.clipboardData?.files?.[0];

		if (file && file.type.startsWith('image/')) {
			event.preventDefault();
			this.uploadImage(file, true);
			return;
		}

		const text = (event.clipboardData?.getData('text/plain') ?? '').trim();

		if (PASTED_URL_RE.test(text)) {
			event.preventDefault();
			this.applyWrap('[', `](${text})`, text);
		}
	}

	async showPreview(): Promise<void> {
		this.mode.set('preview');
		this.preview.set(this.value ? ((await this.markdownService.renderMarkdown(this.value, this.isBrowser)) as string) : '');

		if (!this.isBrowser || !this.value) {
			return;
		}

		this.cdr.detectChanges();
		const previewEl = this.previewEl();

		if (previewEl) {
			void this.markdownService.renderArticle(previewEl);
		}
	}

	insertBold(): void {
		this.applyWrap('**', '**', 'bold text');
	}

	insertItalic(): void {
		this.applyWrap('*', '*', 'italic text');
	}

	insertStrikethrough(): void {
		this.applyWrap('~~', '~~', 'strikethrough text');
	}

	insertInlineCode(): void {
		this.applyWrap('`', '`', 'code');
	}

	insertLink(): void {
		this.applyWrap('[', '](url)', 'link text', 'url');
	}

	insertCodeBlock(): void {
		const code = this.selectedText() || 'code';
		this.applyBlock('```\n' + code + '\n```', code);
	}

	insertTable(): void {
		this.applyBlock('| Column | Column |\n| --- | --- |\n| Cell | Cell |', 'Column');
	}

	insertCallout(type: CalloutKind): void {
		this.applyBlock(`> [!${type}]\n> callout text`, 'callout text');
	}

	insertQuote(): void {
		this.applyBlock('> quote text', 'quote text');
	}

	insertBulletList(): void {
		this.applyBlock('- item', 'item');
	}

	insertNumberedList(): void {
		this.applyBlock('1. item', 'item');
	}

	calloutLabelKey(type: CalloutKind): string {
		return `callout${type.charAt(0)}${type.slice(1).toLowerCase()}`;
	}

	private selectedText(): string {
		const textarea = this.textareaEl()?.nativeElement;

		if (!textarea) {
			return '';
		}

		return (this.value ?? '').slice(textarea.selectionStart, textarea.selectionEnd);
	}

	private applyWrap(prefix: string, suffix: string, placeholderText: string, suffixPlaceholder?: string): void {
		const textarea = this.textareaEl()?.nativeElement;

		if (!textarea) {
			return;
		}

		const current = this.value ?? '';
		const start = textarea.selectionStart;
		const end = textarea.selectionEnd;
		const selected = current.slice(start, end);
		const inner = selected || placeholderText;
		const next = current.slice(0, start) + prefix + inner + suffix + current.slice(end);

		if (selected && suffixPlaceholder) {
			const suffixIndex = suffix.indexOf(suffixPlaceholder);
			this.applyChange(
				textarea,
				next,
				suffixIndex === -1 ? start + prefix.length : start + prefix.length + inner.length + suffixIndex,
				suffixIndex === -1 ? inner.length : suffixPlaceholder.length
			);
			return;
		}

		this.applyChange(textarea, next, start + prefix.length, inner.length);
	}

	private applyBlock(block: string, placeholder: string): void {
		const textarea = this.textareaEl()?.nativeElement;

		if (!textarea) {
			return;
		}

		const current = this.value ?? '';
		const start = textarea.selectionStart;
		const end = textarea.selectionEnd;
		const leadingBreak = start > 0 && current[start - 1] !== '\n' ? '\n' : '';
		const trailingBreak = end < current.length && current[end] !== '\n' ? '\n' : '';
		const next = current.slice(0, start) + leadingBreak + block + trailingBreak + current.slice(end);
		const placeholderIndex = block.indexOf(placeholder);

		this.applyChange(
			textarea,
			next,
			placeholderIndex === -1 ? start + leadingBreak.length + block.length : start + leadingBreak.length + placeholderIndex,
			placeholderIndex === -1 ? 0 : placeholder.length
		);
	}

	private applyChange(textarea: HTMLTextAreaElement, next: string, selectionStart: number, selectionLength: number): void {
		textarea.value = next;
		this.value = next;
		this.onChange(this.value);
		this.cdr.detectChanges();
		textarea.focus();
		textarea.setSelectionRange(selectionStart, selectionStart + selectionLength);
	}

	private uploadImage(file: File, atCursor = false): void {
		this.uploading.set(true);
		this.error.set(false);

		this.uploadService
			.upload(file, this.uploadFolder(), 'content')
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: (key) => {
					if (atCursor) {
						this.insertPastedImage(file.name, key);
					} else {
						this.insertImageAtCursor(file.name, key);
					}
					this.uploading.set(false);
				},
				error: () => {
					this.uploading.set(false);
					this.error.set(true);
				},
			});
	}

	private insertPastedImage(name: string, key: string): void {
		const markdown = `![${name || PASTED_IMAGE_FALLBACK_NAME}](${key})`;
		const textarea = this.textareaEl()?.nativeElement;

		if (!textarea) {
			this.value = `${this.value ?? ''}${markdown}`;
			this.onChange(this.value);
			return;
		}

		const current = this.value ?? '';
		const start = textarea.selectionStart;
		const end = textarea.selectionEnd;
		const next = current.slice(0, start) + markdown + current.slice(end);

		this.applyChange(textarea, next, start + markdown.length, 0);
	}

	private insertImageAtCursor(name: string, key: string): void {
		const markdown = `\n![${name}](${key})\n`;
		this.value = `${this.value ?? ''}${markdown}`;
		this.onChange(this.value);
	}
}
