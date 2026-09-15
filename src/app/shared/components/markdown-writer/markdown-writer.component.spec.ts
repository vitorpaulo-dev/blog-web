import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { Subject } from 'rxjs';
import { MarkdownWriterComponent } from './markdown-writer.component';
import { UploadService } from '../../../core/upload/upload.service';
import { MarkdownService } from '../../../features/posts/data-access/markdown.service';

@Component({
	selector: 'test-host',
	imports: [MarkdownWriterComponent],
	template: `<app-markdown-writer uploadFolder="post" />`,
})
class HostComponent {}

describe('MarkdownWriterComponent', () => {
	function setup() {
		const upload$ = new Subject<string>();
		const upload = vi.fn().mockReturnValue(upload$);
		const renderMarkdown = vi.fn().mockResolvedValue('<p>rendered</p>');

		TestBed.configureTestingModule({
			imports: [HostComponent],
			providers: [
				{ provide: UploadService, useValue: { upload } },
				{ provide: MarkdownService, useValue: { renderMarkdown } },
			],
		});

		const fixture = TestBed.createComponent(HostComponent);
		fixture.detectChanges();
		const component = fixture.debugElement.query(
			(el) => el.componentInstance instanceof MarkdownWriterComponent
		).componentInstance as MarkdownWriterComponent;

		return { fixture, component, upload$, upload, renderMarkdown };
	}

	function dropFile(
		{ component, fixture }: ReturnType<typeof setup>,
		file: File
	) {
		component.onDrop({
			preventDefault: () => {},
			dataTransfer: { files: [file] },
		} as unknown as DragEvent);
		fixture.detectChanges();
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
});
