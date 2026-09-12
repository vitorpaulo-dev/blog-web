import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { PostService } from './post.service';
import { environment } from '../../../../environments/environment';

describe('PostService', () => {
  let service: PostService;
  let httpMock: HttpTestingController;
  const baseUrl = `${environment.apiBaseUrl}/v1/post`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        PostService,
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

  it('batch() should POST to /v1/post/batch with ids and language', () => {
    service.batch(['id1', 'id2'], 'ENGLISH').subscribe((res) => {
      expect(res.length).toBe(2);
    });

    const req = httpMock.expectOne(`${baseUrl}/batch`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ ids: ['id1', 'id2'], language: 'ENGLISH' });
    req.flush([{ id: 'id1' }, { id: 'id2' }]);
  });
});
