import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { AudioService } from './audio.service';
import { UploadService } from '../../../core/upload/upload.service';
import { environment } from '../../../../environments/environment';

describe('AudioService', () => {
  let service: AudioService;
  let httpMock: HttpTestingController;
  const base = `${environment.apiBaseUrl}/v1/post`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        AudioService,
        UploadService,
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

  it('signArtifacts() batch-signs RAW keys of READY artifacts via the upload sign endpoint', () => {
    let signed: Record<string, string> | undefined;

    service
      .signArtifacts([
        { type: 'NARRATION', language: 'ENGLISH', status: 'READY', key: 'post/audio/NARRATION-ENGLISH.wav' },
        { type: 'PODCAST', language: 'ENGLISH', status: 'FAILED', key: 'post/audio/PODCAST-ENGLISH.wav' },
      ])
      .subscribe((res) => (signed = res));

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/v1/upload/sign`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ keys: ['post/audio/NARRATION-ENGLISH.wav'] });
    req.flush({ 'post/audio/NARRATION-ENGLISH.wav': 'https://signed/narration-en' });

    expect(signed).toEqual({ 'post/audio/NARRATION-ENGLISH.wav': 'https://signed/narration-en' });
  });

  it('retry() should POST the per-artifact retry endpoint', () => {
    service.retry('post-1', 'NARRATION', 'ENGLISH').subscribe();

    const req = httpMock.expectOne(`${base}/post-1/audio/NARRATION/ENGLISH/retry`);
    expect(req.request.method).toBe('POST');
    req.flush({ type: 'NARRATION', language: 'ENGLISH', status: 'QUEUED', key: 'k', progress: 0 });
  });
});
