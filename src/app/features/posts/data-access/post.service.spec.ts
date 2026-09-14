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
});
