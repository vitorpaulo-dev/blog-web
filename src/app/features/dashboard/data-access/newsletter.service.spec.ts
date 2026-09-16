import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { NewsletterService } from './newsletter.service';
import { environment } from '../../../../environments/environment';

describe('NewsletterService', () => {
  let service: NewsletterService;
  let httpMock: HttpTestingController;
  const baseUrl = `${environment.apiBaseUrl}/v1/newsletter`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        NewsletterService,
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
      ],
    });

    service = TestBed.inject(NewsletterService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('subscribe() should POST to /v1/newsletter/subscribe with X-Captcha-Token header', () => {
    const payload = { email: 'reader@example.com', language: 'ENGLISH' as const, frequency: 'EVERY_POST' as const };

    service.subscribe(payload, 'captcha-token').subscribe((res) => {
      expect(res.email).toBe('reader@example.com');
    });

    const req = httpMock.expectOne(`${baseUrl}/subscribe`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);
    expect(req.request.headers.get('X-Captcha-Token')).toBe('captcha-token');
    req.flush({ id: '1', email: 'reader@example.com', status: 'ACTIVE', language: 'ENGLISH', frequency: 'EVERY_POST', createdAt: '2026-01-01' });
  });

  it('listSubscribers() should POST to /v1/newsletter/subscriber/search with filters', () => {
    const params = {
      query: { email: 'reader', status: 'ACTIVE' as const, language: 'ENGLISH' as const, frequency: undefined },
      page: 0,
      size: 10,
      sort: 'createdAt',
      direction: 'DESC' as const,
    };

    service.listSubscribers(params).subscribe((res) => {
      expect(res.totalElements).toBe(1);
    });

    const req = httpMock.expectOne(`${baseUrl}/subscriber/search`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(params);
    req.flush({ content: [{ id: '1', email: 'reader@example.com', status: 'ACTIVE', language: 'ENGLISH', frequency: 'EVERY_POST', createdAt: '2026-01-01' }], totalPages: 1, totalElements: 1 });
  });

  it('unsubscribeSubscriber() should POST to /v1/newsletter/subscriber/{id}/unsubscribe', () => {
    const id = 'abc-123';

    service.unsubscribeSubscriber(id).subscribe((res) => {
      expect(res.id).toBe(id);
    });

    const req = httpMock.expectOne(`${baseUrl}/subscriber/${id}/unsubscribe`);
    expect(req.request.method).toBe('POST');
    req.flush({ id, email: 'reader@example.com', status: 'UNSUBSCRIBED', createdAt: '2026-01-01' });
  });
});
