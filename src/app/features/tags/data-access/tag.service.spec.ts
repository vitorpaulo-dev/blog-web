import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { TagService } from './tag.service';
import { environment } from '../../../../environments/environment';

describe('TagService', () => {
  let service: TagService;
  let httpMock: HttpTestingController;
  const baseUrl = `${environment.apiBaseUrl}/v1/tag`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        TagService,
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
      ],
    });

    service = TestBed.inject(TagService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('create() should POST to /v1/tag', () => {
    const payload = {
      translations: {
        ENGLISH: { name: 'Java' },
        PORTUGUESE: { name: 'Java' },
      },
    };

    service.create(payload).subscribe((res) => {
      expect(res.id).toBe('new-id');
    });

    const req = httpMock.expectOne(baseUrl);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);
    req.flush({ id: 'new-id', slug: 'java', translations: {} });
  });

  it('update() should PUT to /v1/tag/{id}', () => {
    const payload = {
      translations: {
        ENGLISH: { name: 'Updated' },
        PORTUGUESE: { name: 'Atualizado' },
      },
    };

    service.update('abc-123', payload).subscribe((res) => {
      expect(res.id).toBe('abc-123');
    });

    const req = httpMock.expectOne(`${baseUrl}/abc-123`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(payload);
    req.flush({ id: 'abc-123', slug: 'updated', translations: {} });
  });

  it('delete() should DELETE to /v1/tag with body', () => {
    service.delete(['id1', 'id2']).subscribe();

    const req = httpMock.expectOne(baseUrl);
    expect(req.request.method).toBe('DELETE');
    expect(req.request.body).toEqual({ ids: ['id1', 'id2'] });
    req.flush(null);
  });

  it('getById() should GET /v1/tag/{id}', () => {
    service.getById('abc-123').subscribe((res) => {
      expect(res.id).toBe('abc-123');
    });

    const req = httpMock.expectOne(`${baseUrl}/abc-123`);
    expect(req.request.method).toBe('GET');
    req.flush({ id: 'abc-123', slug: 'java', translations: {} });
  });

  it('search() should POST to /v1/tag/search', () => {
    const params = {
      query: { name: 'java' },
      page: 0,
      size: 10,
      sort: 'name',
      direction: 'ASC' as const,
    };

    service.search(params).subscribe((res) => {
      expect(res.content.length).toBe(1);
      expect(res.totalElements).toBe(1);
    });

    const req = httpMock.expectOne(`${baseUrl}/search`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(params);
    req.flush({ content: [{ id: '1', slug: 'java', translations: {} }], totalPages: 1, totalElements: 1 });
  });
});
