import { Component, ElementRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { vi } from 'vitest';
import { Subject } from 'rxjs';
import { provideTaiga, TuiDropdownOpen, TuiRoot } from '@taiga-ui/core';
import { MarkdownWriterComponent } from './markdown-writer.component';
import { UploadService } from '../../../core/upload/upload.service';
import { MarkdownService } from '../../../features/posts/data-access/markdown.service';
import { translationProvider } from '../../../core/i18n/testing';
import en from '../../../../../public/i18n/en.json';
import pt from '../../../../../public/i18n/pt.json';

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

@Component({
	selector: 'test-host',
	imports: [MarkdownWriterComponent, TuiRoot],
	template: `
		<tui-root>
			<app-markdown-writer uploadFolder="post" />
		</tui-root>
	`,
})
class HostComponent {}

describe('MarkdownWriterComponent', () => {
	function setup() {
		const upload$ = new Subject<string>();
		const upload = vi.fn().mockReturnValue(upload$);
		const renderMarkdown = vi.fn().mockResolvedValue('<p>rendered</p>');
		const renderArticle = vi.fn();

		TestBed.configureTestingModule({
			imports: [HostComponent],
			providers: [
				provideTaiga(),
				translationProvider(),
				{ provide: UploadService, useValue: { upload } },
				{ provide: MarkdownService, useValue: { renderMarkdown, renderArticle } },
			],
		});

		const fixture = TestBed.createComponent(HostComponent);
		fixture.detectChanges();
		const component = fixture.debugElement.query(
			(el) => el.componentInstance instanceof MarkdownWriterComponent
		).componentInstance as MarkdownWriterComponent;

		return { fixture, component, upload$, upload, renderMarkdown, renderArticle };
	}

	type Context = ReturnType<typeof setup>;

	function dropFile({ component, fixture }: Context, file: File) {
		component.onDrop({
			preventDefault: () => {},
			dataTransfer: { files: [file] },
		} as unknown as DragEvent);
		fixture.detectChanges();
	}

	function setEditorContent(context: Context, value: string, start: number, end: number): HTMLTextAreaElement {
		const textarea = context.fixture.nativeElement.querySelector('textarea') as HTMLTextAreaElement;
		textarea.value = value;
		textarea.dispatchEvent(new Event('input'));
		textarea.focus();
		textarea.setSelectionRange(start, end);

		return textarea;
	}

	function clickToolbarButton(context: Context, label: string): void {
		const button = context.fixture.nativeElement.querySelector(`button[aria-label="${label}"]`) as HTMLButtonElement;
		button.click();
		context.fixture.detectChanges();
	}

	it('uploads a dropped image and inserts ![name](key) into the value', () => {
		const context = setup();
		const onChange = vi.fn();
		context.component.registerOnChange(onChange);
		context.component.writeValue('# Title');

		const file = new File(['data'], 'screenshot.png', { type: 'image/png' });
		dropFile(context, file);

		expect(context.upload).toHaveBeenCalledWith(
			file,
			'post',
			'content'
		);
		expect(context.component.uploading()).toBe(true);
		expect(context.component.dragging()).toBe(false);

		context.upload$.next('post/content/uuid.png');
		context.fixture.detectChanges();

		expect(context.component.value).toBe(
			'# Title\n![screenshot.png](post/content/uuid.png)\n'
		);
		expect(onChange).toHaveBeenCalledWith(
			'# Title\n![screenshot.png](post/content/uuid.png)\n'
		);
		expect(context.component.uploading()).toBe(false);
		expect(context.component.error()).toBe(false);
	});

	it('flags an error and does not insert markdown when the upload fails', () => {
		const context = setup();
		const onChange = vi.fn();
		context.component.registerOnChange(onChange);

		const file = new File(['data'], 'screenshot.png', { type: 'image/png' });
		dropFile(context, file);

		context.upload$.error(new Error('boom'));
		context.fixture.detectChanges();

		expect(context.component.error()).toBe(true);
		expect(context.component.value).toBeNull();
		expect(onChange).not.toHaveBeenCalled();
	});

	it('renders the preview through MarkdownService when switching to the preview tab', async () => {
		const context = setup();
		context.component.writeValue('# Title');

		await context.component.showPreview();

		expect(context.renderMarkdown).toHaveBeenCalledWith('# Title', expect.any(Boolean));
		expect(context.component.preview()).toBe('<p>rendered</p>');
		expect(context.component.mode()).toBe('preview');
	});

	it('empty value renders an empty preview without calling MarkdownService', async () => {
		const context = setup();

		await context.component.showPreview();

		expect(context.component.preview()).toBe('');
		expect(context.component.mode()).toBe('preview');
		expect(context.renderMarkdown).not.toHaveBeenCalled();
	});

	it('ignores dropped non-image files', () => {
		const context = setup();

		const file = new File(['data'], 'notes.txt', { type: 'text/plain' });
		dropFile(context, file);

		expect(context.upload).not.toHaveBeenCalled();
		expect(context.component.uploading()).toBe(false);
		expect(context.component.error()).toBe(false);
	});

	it('wraps the selected text in bold markers and keeps the wrapped text selected', () => {
		const context = setup();
		const onChange = vi.fn();
		context.component.registerOnChange(onChange);
		const textarea = setEditorContent(context, 'hello world', 0, 5);

		clickToolbarButton(context, 'Bold');

		expect(context.component.value).toBe('**hello** world');
		expect(textarea.value).toBe('**hello** world');
		expect(onChange).toHaveBeenLastCalledWith('**hello** world');
		expect([textarea.selectionStart, textarea.selectionEnd]).toEqual([2, 7]);
	});

	it('wraps the selected text in italic markers', () => {
		const context = setup();
		const textarea = setEditorContent(context, 'hello world', 0, 5);

		clickToolbarButton(context, 'Italic');

		expect(context.component.value).toBe('*hello* world');
		expect([textarea.selectionStart, textarea.selectionEnd]).toEqual([1, 6]);
	});

	it('wraps the selected text in single backticks', () => {
		const context = setup();
		const textarea = setEditorContent(context, 'hello world', 6, 11);

		clickToolbarButton(context, 'Inline code');

		expect(context.component.value).toBe('hello `world`');
		expect([textarea.selectionStart, textarea.selectionEnd]).toEqual([7, 12]);
	});

	it('inserts a bold placeholder and selects it when there is no selection', () => {
		const context = setup();
		const textarea = setEditorContent(context, '', 0, 0);

		clickToolbarButton(context, 'Bold');

		expect(context.component.value).toBe('**bold text**');
		expect([textarea.selectionStart, textarea.selectionEnd]).toEqual([2, 11]);
	});

	it('inserts a link template around the selection and selects the url placeholder', () => {
		const context = setup();
		const textarea = setEditorContent(context, 'Title', 0, 5);

		clickToolbarButton(context, 'Link');

		expect(context.component.value).toBe('[Title](url)');
		expect([textarea.selectionStart, textarea.selectionEnd]).toEqual([8, 11]);
	});

	it('inserts a link template with a selected link text when there is no selection', () => {
		const context = setup();
		const textarea = setEditorContent(context, '', 0, 0);

		clickToolbarButton(context, 'Link');

		expect(context.component.value).toBe('[link text](url)');
		expect([textarea.selectionStart, textarea.selectionEnd]).toEqual([1, 10]);
	});

	it('inserts a fenced code block with the code placeholder selected', () => {
		const context = setup();
		const textarea = setEditorContent(context, '', 0, 0);

		clickToolbarButton(context, 'Code block');

		expect(context.component.value).toBe('```\ncode\n```');
		expect([textarea.selectionStart, textarea.selectionEnd]).toEqual([4, 8]);
	});

	it('wraps the selected text in a fenced code block padded with newlines', () => {
		const context = setup();
		const textarea = setEditorContent(context, 'run npm test now', 4, 12);

		clickToolbarButton(context, 'Code block');

		expect(context.component.value).toBe('run \n```\nnpm test\n```\n now');
		expect([textarea.selectionStart, textarea.selectionEnd]).toEqual([9, 17]);
	});

	it('inserts a note callout block with the body placeholder selected', () => {
		const context = setup();
		const textarea = setEditorContent(context, '', 0, 0);

		context.component.insertCallout('NOTE');
		context.fixture.detectChanges();

		expect(context.component.value).toBe('> [!NOTE]\n> callout text');
		expect([textarea.selectionStart, textarea.selectionEnd]).toEqual([12, 24]);
	});

	it('inserts a tip callout block after existing text with a newline padding', () => {
		const context = setup();
		setEditorContent(context, 'intro', 5, 5);

		context.component.insertCallout('TIP');
		context.fixture.detectChanges();

		expect(context.component.value).toBe('intro\n> [!TIP]\n> callout text');
	});

	it('inserts an editable markdown table and selects the first column header', () => {
		const context = setup();
		const textarea = setEditorContent(context, '', 0, 0);

		clickToolbarButton(context, 'Table');

		expect(context.component.value).toBe('| Column | Column |\n| --- | --- |\n| Cell | Cell |');
		expect([textarea.selectionStart, textarea.selectionEnd]).toEqual([2, 8]);
	});

	it('wraps the selected text in strikethrough markers and keeps the wrapped text selected', () => {
		const context = setup();
		const textarea = setEditorContent(context, 'hello world', 0, 5);

		clickToolbarButton(context, 'Strikethrough');

		expect(context.component.value).toBe('~~hello~~ world');
		expect([textarea.selectionStart, textarea.selectionEnd]).toEqual([2, 7]);
	});

	it('inserts a strikethrough placeholder and selects it when there is no selection', () => {
		const context = setup();
		const textarea = setEditorContent(context, '', 0, 0);

		clickToolbarButton(context, 'Strikethrough');

		expect(context.component.value).toBe('~~strikethrough text~~');
		expect([textarea.selectionStart, textarea.selectionEnd]).toEqual([2, 20]);
	});

	it('inserts a quote block with the quote placeholder selected', () => {
		const context = setup();
		const textarea = setEditorContent(context, '', 0, 0);

		clickToolbarButton(context, 'Quote');

		expect(context.component.value).toBe('> quote text');
		expect([textarea.selectionStart, textarea.selectionEnd]).toEqual([2, 12]);
	});

	it('pads a quote block inserted after existing text with a newline', () => {
		const context = setup();
		const textarea = setEditorContent(context, 'para', 4, 4);

		clickToolbarButton(context, 'Quote');

		expect(context.component.value).toBe('para\n> quote text');
		expect([textarea.selectionStart, textarea.selectionEnd]).toEqual([7, 17]);
	});

	it('inserts a bullet list item with the item placeholder selected', () => {
		const context = setup();
		const textarea = setEditorContent(context, '', 0, 0);

		clickToolbarButton(context, 'Bullet list');

		expect(context.component.value).toBe('- item');
		expect([textarea.selectionStart, textarea.selectionEnd]).toEqual([2, 6]);
	});

	it('inserts a numbered list item with the item placeholder selected', () => {
		const context = setup();
		const textarea = setEditorContent(context, '', 0, 0);

		clickToolbarButton(context, 'Numbered list');

		expect(context.component.value).toBe('1. item');
		expect([textarea.selectionStart, textarea.selectionEnd]).toEqual([3, 7]);
	});

	it('embeds a pasted url around the current selection using the url as href', () => {
		const context = setup();
		const textarea = setEditorContent(context, 'Title', 0, 5);

		const preventDefault = pasteToEditor(context, [], 'https://example.io');

		expect(preventDefault).toHaveBeenCalled();
		expect(context.component.value).toBe('[Title](https://example.io)');
		expect([textarea.selectionStart, textarea.selectionEnd]).toEqual([1, 6]);
	});

	it('appends the pasted image markdown when the upload completes while preview is open', async () => {
		const context = setup();
		const onChange = vi.fn();
		setEditorContent(context, 'text', 2, 2);
		context.component.registerOnChange(onChange);

		pasteToEditor(context, [new File(['data'], 'shot.png', { type: 'image/png' })]);

		await context.component.showPreview();

		context.upload$.next('post/content/shot.png');
		context.fixture.detectChanges();

		expect(context.component.value).toBe('text![shot.png](post/content/shot.png)');
		expect(onChange).toHaveBeenLastCalledWith('text![shot.png](post/content/shot.png)');
	});

	it('maps callout types to translated toolbar keys', () => {
		const context = setup();

		expect(context.component.calloutLabelKey('NOTE')).toBe('calloutNote');
		expect(context.component.calloutLabelKey('IMPORTANT')).toBe('calloutImportant');
		expect(context.component.calloutLabelKey('CAUTION')).toBe('calloutCaution');
	});

	it('provides translated label and hint keys for every toolbar button in en and pt', () => {
		const toolbarKeys = [
			'bold',
			'italic',
			'strikethrough',
			'inlineCode',
			'codeBlock',
			'link',
			'callout',
			'quote',
			'bulletList',
			'numberedList',
			'table',
		];

		for (const dictionary of [en, pt]) {
			const toolbar = dictionary.shared.markdown.toolbar as Record<string, string | Record<string, string>>;
			const hints = toolbar['hint'] as Record<string, string>;

			expect(Object.keys(hints).sort()).toEqual([...toolbarKeys].sort());

			for (const key of toolbarKeys) {
				expect(toolbar[key]).toBeTruthy();
				expect(hints[key]).toBeTruthy();
			}
		}
	});

	it('inserts the callout type chosen from the rendered dropdown', () => {
		const context = setup();
		setEditorContent(context, '', 0, 0);

		const dropdownOpen = context.fixture.debugElement
			.query(By.css('button[aria-label="Callout"]'))
			.injector.get(TuiDropdownOpen);

		dropdownOpen.open.update(() => true);
		context.fixture.detectChanges();

		const options = Array.from(
			context.fixture.nativeElement.querySelectorAll('tui-data-list button') as NodeListOf<HTMLButtonElement>
		);

		expect(options.map((option) => option.textContent?.trim())).toEqual(['Note', 'Tip', 'Important', 'Warning', 'Caution']);

		const noteOption = options.find((option) => option.textContent?.includes('Note'));

		expect(noteOption).toBeTruthy();
		noteOption?.click();
		context.fixture.detectChanges();

		expect(context.component.value).toBe('> [!NOTE]\n> callout text');
	});

	function pasteToEditor(context: Context, files: File[], text = '') {
		const preventDefault = vi.fn();
		context.component.onPaste({
			preventDefault,
			clipboardData: {
				files,
				getData: (type: string) => (type === 'text/plain' ? text : ''),
			},
		} as unknown as ClipboardEvent);
		context.fixture.detectChanges();

		return preventDefault;
	}

	it('uploads a pasted image and inserts ![name](key) at the cursor, placing the caret after it', () => {
		const context = setup();
		const onChange = vi.fn();
		context.component.registerOnChange(onChange);
		const textarea = setEditorContent(context, 'beforeafter', 6, 6);
		const file = new File(['data'], 'screenshot.png', { type: 'image/png' });

		const preventDefault = pasteToEditor(context, [file]);

		expect(preventDefault).toHaveBeenCalled();
		expect(context.upload).toHaveBeenCalledWith(file, 'post', 'content');

		context.upload$.next('post/content/pasted.png');
		context.fixture.detectChanges();

		const inserted = 'before![screenshot.png](post/content/pasted.png)after';
		expect(context.component.value).toBe(inserted);
		expect(textarea.value).toBe(inserted);
		expect(onChange).toHaveBeenLastCalledWith(inserted);
		const caret = 'before![screenshot.png](post/content/pasted.png)'.length;
		expect([textarea.selectionStart, textarea.selectionEnd]).toEqual([caret, caret]);
	});

	it('falls back to pasted-image.png when a pasted image file has no name', () => {
		const context = setup();
		setEditorContent(context, '', 0, 0);

		pasteToEditor(context, [new File(['data'], '', { type: 'image/png' })]);

		context.upload$.next('post/content/pasted.png');
		context.fixture.detectChanges();

		expect(context.component.value).toBe('![pasted-image.png](post/content/pasted.png)');
	});

	it('flags an error and inserts nothing when a pasted image upload fails', () => {
		const context = setup();
		const onChange = vi.fn();
		setEditorContent(context, 'text', 2, 2);
		context.component.registerOnChange(onChange);

		pasteToEditor(context, [new File(['data'], 'shot.png', { type: 'image/png' })]);

		context.upload$.error(new Error('boom'));
		context.fixture.detectChanges();

		expect(context.component.error()).toBe(true);
		expect(context.component.value).toBe('text');
		expect(onChange).not.toHaveBeenCalled();
	});

	it('embeds a pasted bare url as [url](url) with the text part selected', () => {
		const context = setup();
		const textarea = setEditorContent(context, '', 0, 0);

		const preventDefault = pasteToEditor(context, [], 'https://example.com/post');
		context.fixture.detectChanges();

		expect(preventDefault).toHaveBeenCalled();
		expect(context.component.value).toBe('[https://example.com/post](https://example.com/post)');
		expect([textarea.selectionStart, textarea.selectionEnd]).toEqual([1, 25]);
	});

	it('embeds pasted http urls and rejects non-url text', () => {
		const context = setup();
		setEditorContent(context, '', 0, 0);

		const httpPreventDefault = pasteToEditor(context, [], 'http://example.com');
		expect(httpPreventDefault).toHaveBeenCalled();
		expect(context.component.value).toBe('[http://example.com](http://example.com)');

		const sentencePreventDefault = pasteToEditor(context, [], 'see https://x.io ok');
		expect(sentencePreventDefault).not.toHaveBeenCalled();
		expect(context.component.value).toBe('[http://example.com](http://example.com)');
	});

	it('leaves plain text paste untouched without preventDefault or value change', () => {
		const context = setup();
		const onChange = vi.fn();
		context.component.registerOnChange(onChange);
		setEditorContent(context, 'keep me', 0, 0);
		onChange.mockClear();

		const preventDefault = pasteToEditor(context, [], 'just some words');

		expect(preventDefault).not.toHaveBeenCalled();
		expect(context.component.value).toBe('keep me');
		expect(onChange).not.toHaveBeenCalled();
	});

	it('prefers the image file over url text when both are on the clipboard', () => {
		const context = setup();
		setEditorContent(context, '', 0, 0);
		const file = new File(['data'], 'diagram.png', { type: 'image/png' });

		pasteToEditor(context, [file], 'https://example.com');

		expect(context.upload).toHaveBeenCalledWith(file, 'post', 'content');
		expect(context.component.value).toBe('');

		context.upload$.next('post/content/diagram.png');
		context.fixture.detectChanges();

		expect(context.component.value).toBe('![diagram.png](post/content/diagram.png)');
	});

	it('runs mermaid and callout icon post-render on the preview element after rendering markdown', async () => {
		const context = setup();
		context.component.writeValue('# Title');

		await context.component.showPreview();

		expect(context.renderMarkdown).toHaveBeenCalledWith('# Title', true);
		expect(context.renderArticle).toHaveBeenCalledTimes(1);
		const previewArg = context.renderArticle.mock.calls[0][0] as ElementRef<HTMLElement>;
		expect(previewArg.nativeElement.innerHTML).toContain('rendered');
	});
});
