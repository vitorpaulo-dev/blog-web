import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { UploadService } from './upload.service';
import { environment } from '../../../environments/environment';

describe('UploadService', () => {
	let service: UploadService;
	let http: HttpTestingController;

	const api = environment.apiBaseUrl;

	beforeEach(() => {
		TestBed.configureTestingModule({ imports: [HttpClientTestingModule] });
		service = TestBed.inject(UploadService);
		http = TestBed.inject(HttpTestingController);
	});

	afterEach(() => http.verify());

	it('presign posts folder, subfolder and fileName', () => {
		let result: unknown;

		service.presign('post', 'banner', 'a.png').subscribe((r) => (result = r));

		const req = http.expectOne(`${api}/v1/upload/presign`);
		expect(req.request.method).toBe('POST');
		expect(req.request.body).toEqual({ folder: 'post', subfolder: 'banner', fileName: 'a.png' });
		req.flush({ uploadUrl: 'https://r2/put', key: 'post/banner/uuid.png' });

		expect(result).toEqual({ uploadUrl: 'https://r2/put', key: 'post/banner/uuid.png' });
	});

	it('upload puts the file directly and returns the key', () => {
		const file = new Blob(['data'], { type: 'image/png' }) as unknown as File;
		let result: unknown;

		service.upload(file, 'post', 'content').subscribe((r) => (result = r));

		const presign = http.expectOne(`${api}/v1/upload/presign`);
		presign.flush({ uploadUrl: 'https://r2/put', key: 'post/content/uuid.png' });

		const put = http.expectOne('https://r2/put');
		expect(put.request.method).toBe('PUT');
		expect(put.request.body).toBe(file);
		put.flush(null);

		expect(result).toBe('post/content/uuid.png');
	});

	it('sign caches keys and does not re-request cached urls', () => {
		let first: unknown;
		let second: unknown;

		service.sign(['post/banner/a.jpg']).subscribe((r) => (first = r));

		const req = http.expectOne(`${api}/v1/upload/sign`);
		expect(req.request.body).toEqual({ keys: ['post/banner/a.jpg'] });
		req.flush({ 'post/banner/a.jpg': 'https://signed/a' });

		expect(first).toEqual({ 'post/banner/a.jpg': 'https://signed/a' });

		service.sign(['post/banner/a.jpg']).subscribe((r) => (second = r));
		http.expectNone(`${api}/v1/upload/sign`);

		expect(second).toEqual({ 'post/banner/a.jpg': 'https://signed/a' });
	});

	it('sign re-requests urls once the cache safety window elapsed', () => {
		vi.useFakeTimers();
		try {
			service.sign(['post/banner/a.jpg']).subscribe();

			const first = http.expectOne(`${api}/v1/upload/sign`);
			first.flush({ 'post/banner/a.jpg': 'https://signed/a' });

			vi.advanceTimersByTime(56 * 60 * 1000);

			let result: unknown;
			service.sign(['post/banner/a.jpg']).subscribe((r) => (result = r));

			const second = http.expectOne(`${api}/v1/upload/sign`);
			expect(second.request.body).toEqual({ keys: ['post/banner/a.jpg'] });
			second.flush({ 'post/banner/a.jpg': 'https://signed/b' });

			expect(result).toEqual({ 'post/banner/a.jpg': 'https://signed/b' });
		} finally {
			vi.useRealTimers();
		}
	});

	it('sign keeps cached urls inside the one-hour expiry safety margin', () => {
		vi.useFakeTimers();
		try {
			service.sign(['post/banner/a.jpg']).subscribe();

			const first = http.expectOne(`${api}/v1/upload/sign`);
			first.flush({ 'post/banner/a.jpg': 'https://signed/a' });

			vi.advanceTimersByTime(54 * 60 * 1000);

			let result: unknown;
			service.sign(['post/banner/a.jpg']).subscribe((r) => (result = r));

			http.expectNone(`${api}/v1/upload/sign`);
			expect(result).toEqual({ 'post/banner/a.jpg': 'https://signed/a' });
		} finally {
			vi.useRealTimers();
		}
	});
});
