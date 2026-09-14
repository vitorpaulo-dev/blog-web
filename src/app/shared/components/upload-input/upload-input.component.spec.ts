import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { of, Subject } from 'rxjs';
import { UploadInputComponent } from './upload-input.component';
import { UploadService } from '../../../core/upload/upload.service';

@Component({
	selector: 'test-host',
	imports: [UploadInputComponent],
	template: `<app-upload-input folder="post" subfolder="banner" />`,
})
class HostComponent {}

describe('UploadInputComponent', () => {
	function setup() {
		const upload$ = new Subject<string>();
		const upload = vi.fn().mockReturnValue(upload$);
		const createObjectURL = vi.fn().mockReturnValue('blob:preview-1');
		const revokeObjectURL = vi.fn();

		vi.stubGlobal('URL', { ...URL, createObjectURL, revokeObjectURL });

		TestBed.configureTestingModule({
			imports: [HostComponent],
			providers: [
				{
					provide: UploadService,
					useValue: { upload, sign: vi.fn().mockReturnValue(of({})) },
				},
			],
		});

		const fixture = TestBed.createComponent(HostComponent);
		fixture.detectChanges();
		const component = fixture.debugElement.query(
			(el) => el.componentInstance instanceof UploadInputComponent
		).componentInstance as UploadInputComponent;

		return { fixture, component, upload$, upload, createObjectURL, revokeObjectURL };
	}

	function selectFile(
		{ component, fixture }: ReturnType<typeof setup>,
		file: File
	) {
		component.onFileSelected({
			target: { files: [file], value: '' },
		} as unknown as Event);
		fixture.detectChanges();
	}

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('shows a local blob preview on file select and revokes it after success', () => {
		const context = setup();
		const onChange = vi.fn();
		context.component.registerOnChange(onChange);

		const file = new File(['data'], 'banner.png', { type: 'image/png' });
		selectFile(context, file);

		expect(context.createObjectURL).toHaveBeenCalledWith(file);
		expect(context.component.localPreview()).toBe('blob:preview-1');
		expect(context.component.uploading()).toBe(true);

		context.upload$.next('post/banner/uuid.png');
		context.fixture.detectChanges();

		expect(context.component.value()).toBe('post/banner/uuid.png');
		expect(onChange).toHaveBeenCalledWith('post/banner/uuid.png');
		expect(context.component.uploading()).toBe(false);
		expect(context.component.localPreview()).toBeNull();
		expect(context.revokeObjectURL).toHaveBeenCalledWith('blob:preview-1');
	});

	it('revokes the blob preview and flags an error when the upload fails', () => {
		const context = setup();
		const onChange = vi.fn();
		context.component.registerOnChange(onChange);

		const file = new File(['data'], 'banner.png', { type: 'image/png' });
		selectFile(context, file);

		context.upload$.error(new Error('boom'));
		context.fixture.detectChanges();

		expect(context.component.error()).toBe(true);
		expect(context.component.uploading()).toBe(false);
		expect(context.component.localPreview()).toBeNull();
		expect(context.revokeObjectURL).toHaveBeenCalledWith('blob:preview-1');
		expect(onChange).not.toHaveBeenCalled();
	});

	it('rejects non-image files without uploading', () => {
		const context = setup();

		const file = new File(['data'], 'notes.txt', { type: 'text/plain' });
		selectFile(context, file);

		expect(context.upload).not.toHaveBeenCalled();
		expect(context.createObjectURL).not.toHaveBeenCalled();
		expect(context.component.error()).toBe(true);
	});
});
