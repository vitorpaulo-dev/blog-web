import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { ProjectService } from './project.service';
import { LanguageService } from '../../../core/i18n/language.service';
import { signal } from '@angular/core';
import { environment } from '../../../../environments/environment';

describe('ProjectService', () => {
  let service: ProjectService;
  let httpMock: HttpTestingController;
  const baseUrl = `${environment.apiBaseUrl}/v1/project`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        ProjectService,
        { provide: LanguageService, useValue: { language: signal('ENGLISH') } },
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
});
