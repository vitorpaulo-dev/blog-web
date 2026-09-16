import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { vi } from 'vitest';
import { PostService } from './post.service';
import { environment } from '../../../../environments/environment';
import { TurnstileService } from '../../../core/captcha/turnstile.service';

describe('PostService', () => {
  let service: PostService;
  let httpMock: HttpTestingController;
  let turnstileSpy: { getToken: ReturnType<typeof vi.fn>; reset: ReturnType<typeof vi.fn> };
  const baseUrl = `${environment.apiBaseUrl}/v1/post`;

  beforeEach(() => {
    turnstileSpy = {
      getToken: vi.fn().mockResolvedValue('captcha-token'),
      reset: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        PostService,
        { provide: TurnstileService, useValue: turnstileSpy },
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
      ],
    });

    service = TestBed.inject(PostService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('getById() should GET /v1/post/{id}', () => {
    service.getById('abc-123').subscribe((res) => {
      expect(res.id).toBe('abc-123');
    });

    const req = httpMock.expectOne(`${baseUrl}/abc-123`);
    expect(req.request.method).toBe('GET');
    req.flush({ id: 'abc-123' });
  });

  it('getFeatured() should GET /v1/post/featured/{language} with current language', () => {
    service.getFeatured('PORTUGUESE').subscribe((res) => {
      expect(res.length).toBe(2);
    });

    const req = httpMock.expectOne(`${baseUrl}/featured/PORTUGUESE`);
    expect(req.request.method).toBe('GET');
    req.flush([
      { id: 'p1' },
      { id: 'p2' },
    ]);
  });

  it('setFeatured() should POST /v1/post/featured with weight payload', () => {
    const payload = [{ postId: 'p1', weight: 1 }, { postId: 'p2', weight: 2 }];

    service.setFeatured(payload).subscribe();

    const req = httpMock.expectOne(`${baseUrl}/featured`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);
    req.flush(null);
  });

  it('reactTo() should POST /v1/post/{slug}/react with captcha header, reset turnstile and return counts', async () => {
    const response = { loveCount: 2, celebrateCount: 0, geniusCount: 1, helpCount: 0, reactionCount: 3 };

    let result: unknown;
    const promise = service.reactTo('my-post-slug', 'LOVE').then((res) => {
      result = res;
    });

    await new Promise((resolve) => setTimeout(resolve, 0));

    const req = httpMock.expectOne(`${baseUrl}/my-post-slug/react`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ reactionType: 'LOVE' });
    expect(req.request.headers.get('X-Captcha-Token')).toBe('captcha-token');
    req.flush(response);

    await promise;
    expect(result).toEqual(response);
    expect(turnstileSpy.reset).toHaveBeenCalled();
  });

  it('reactTo() should NOT fire the request when turnstile token is null', async () => {
    turnstileSpy.getToken.mockResolvedValue(null);

    await expect(service.reactTo('my-post-slug', 'LOVE')).rejects.toThrow();

    await new Promise((resolve) => setTimeout(resolve, 0));

    httpMock.expectNone(`${baseUrl}/my-post-slug/react`);
    expect(turnstileSpy.reset).toHaveBeenCalled();
  });

  it('reactTo() should reject the second concurrent call and fire only one POST', async () => {
    let releaseToken: (token: string) => void;
    turnstileSpy.getToken.mockImplementation(
      () =>
        new Promise<string>((resolve) => {
          releaseToken = resolve;
        })
    );

    const first = service.reactTo('my-post-slug', 'LOVE');
    await expect(service.reactTo('my-post-slug', 'LOVE')).rejects.toThrow('Reaction request already in progress');

    releaseToken!('captcha-token');
    await new Promise((resolve) => setTimeout(resolve, 0));

    const requests = httpMock.match((req) => req.url === `${baseUrl}/my-post-slug/react`);
    expect(requests.length).toBe(1);

    requests[0].flush({ loveCount: 1, celebrateCount: 0, geniusCount: 0, helpCount: 0, reactionCount: 1 });
    await expect(first).resolves.toEqual({ loveCount: 1, celebrateCount: 0, geniusCount: 0, helpCount: 0, reactionCount: 1 });
  });
});
