import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { vi } from 'vitest';
import { ProjectService } from './project.service';
import { LanguageService } from '../../../core/i18n/language.service';
import { TurnstileService } from '../../../core/captcha/turnstile.service';
import { signal } from '@angular/core';
import { environment } from '../../../../environments/environment';

describe('ProjectService', () => {
  let service: ProjectService;
  let httpMock: HttpTestingController;
  let turnstileSpy: { getToken: ReturnType<typeof vi.fn>; reset: ReturnType<typeof vi.fn> };
  const baseUrl = `${environment.apiBaseUrl}/v1/project`;

  beforeEach(() => {
    turnstileSpy = {
      getToken: vi.fn().mockResolvedValue('captcha-token'),
      reset: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        ProjectService,
        { provide: LanguageService, useValue: { language: signal('ENGLISH') } },
        { provide: TurnstileService, useValue: turnstileSpy },
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
      ],
    });

    service = TestBed.inject(ProjectService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('create() should POST to /v1/project', () => {
    const payload = {
      translations: {
        ENGLISH: { title: 'Test', description: 'Desc' },
        PORTUGUESE: { title: 'Teste', description: 'Desc' },
      },
    };

    service.create(payload as any).subscribe((res) => {
      expect(res.id).toBe('new-id');
    });

    const req = httpMock.expectOne(baseUrl);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);
    req.flush({ id: 'new-id' });
  });

  it('update() should PUT to /v1/project/{id}', () => {
    const payload = {
      translations: {
        ENGLISH: { title: 'Updated', description: 'Desc' },
        PORTUGUESE: { title: 'Atualizado', description: 'Desc' },
      },
      status: 'PUBLISHED' as const,
    };

    service.update('abc-123', payload as any).subscribe((res) => {
      expect(res.id).toBe('abc-123');
    });

    const req = httpMock.expectOne(`${baseUrl}/abc-123`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(payload);
    req.flush({ id: 'abc-123' });
  });

  it('delete() should DELETE to /v1/project with body', () => {
    service.delete(['id1', 'id2']).subscribe();

    const req = httpMock.expectOne(baseUrl);
    expect(req.request.method).toBe('DELETE');
    expect(req.request.body).toEqual({ ids: ['id1', 'id2'] });
    req.flush(null);
  });

  it('getById() should GET /v1/project/{id}', () => {
    service.getById('abc-123').subscribe((res) => {
      expect(res.id).toBe('abc-123');
    });

    const req = httpMock.expectOne(`${baseUrl}/abc-123`);
    expect(req.request.method).toBe('GET');
    req.flush({ id: 'abc-123' });
  });

  it('getBySlug() should GET /v1/project/slug/{slug}/{language}', () => {
    service.getBySlug('my-project').subscribe((res) => {
      expect(res.slug).toBe('my-project');
    });

    const req = httpMock.expectOne(`${baseUrl}/slug/my-project/ENGLISH`);
    expect(req.request.method).toBe('GET');
    req.flush({ slug: 'my-project' });
  });

  it('search() should POST to /v1/project/search', () => {
    const params = {
      query: { language: 'ENGLISH' as const },
      page: 0,
      size: 10,
      sort: 'createdAt',
      direction: 'DESC' as const,
    };

    service.search(params).subscribe((res) => {
      expect(res.content.length).toBe(1);
      expect(res.totalElements).toBe(1);
    });

    const req = httpMock.expectOne(`${baseUrl}/search`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(params);
    req.flush({ content: [{ id: '1' }], totalPages: 1, totalElements: 1 });
  });

  it('getByIds() should POST to /v1/project/batch', () => {
    service.getByIds(['id1', 'id2'], 'ENGLISH').subscribe((res) => {
      expect(res.length).toBe(2);
    });

    const req = httpMock.expectOne(`${baseUrl}/batch`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ ids: ['id1', 'id2'], language: 'ENGLISH' });
    req.flush([{ id: 'id1' }, { id: 'id2' }]);
  });

  it('reactTo() should POST /v1/project/{slug}/react with captcha header, reset turnstile and return counts', async () => {
    const response = { loveCount: 1, celebrateCount: 0, geniusCount: 0, helpCount: 2, reactionCount: 3 };

    let result: unknown;
    const promise = service.reactTo('my-project-slug', 'HELP').then((res) => {
      result = res;
    });

    await new Promise((resolve) => setTimeout(resolve, 0));

    const req = httpMock.expectOne(`${baseUrl}/my-project-slug/react`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ reactionType: 'HELP' });
    expect(req.request.headers.get('X-Captcha-Token')).toBe('captcha-token');
    req.flush(response);

    await promise;
    expect(result).toEqual(response);
    expect(turnstileSpy.reset).toHaveBeenCalled();
  });

  it('reactTo() should NOT fire the request when turnstile token is null', async () => {
    turnstileSpy.getToken.mockResolvedValue(null);

    await expect(service.reactTo('my-project-slug', 'HELP')).rejects.toThrow();

    await new Promise((resolve) => setTimeout(resolve, 0));

    httpMock.expectNone(`${baseUrl}/my-project-slug/react`);
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

    const first = service.reactTo('my-project-slug', 'HELP');
    await expect(service.reactTo('my-project-slug', 'HELP')).rejects.toThrow('Reaction request already in progress');

    releaseToken!('captcha-token');
    await new Promise((resolve) => setTimeout(resolve, 0));

    const requests = httpMock.match((req) => req.url === `${baseUrl}/my-project-slug/react`);
    expect(requests.length).toBe(1);

    requests[0].flush({ loveCount: 1, celebrateCount: 0, geniusCount: 0, helpCount: 2, reactionCount: 3 });
    await expect(first).resolves.toEqual({ loveCount: 1, celebrateCount: 0, geniusCount: 0, helpCount: 2, reactionCount: 3 });
  });
});
