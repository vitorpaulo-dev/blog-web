import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { vi } from 'vitest';
import { AudioService } from './audio.service';
import { environment } from '../../../../environments/environment';

describe('AudioService', () => {
  let service: AudioService;
  let httpMock: HttpTestingController;
  const base = `${environment.apiBaseUrl}/v1/post`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        AudioService,
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
      ],
    });

    service = TestBed.inject(AudioService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('retry() should POST the per-artifact retry endpoint', () => {
    service.retry('post-1', 'NARRATION', 'ENGLISH').subscribe();

    const req = httpMock.expectOne(`${base}/post-1/audio/NARRATION/ENGLISH/retry`);
    expect(req.request.method).toBe('POST');
    req.flush({ type: 'NARRATION', language: 'ENGLISH', status: 'QUEUED', key: 'k', progress: 0 });
  });
});
