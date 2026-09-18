import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { DashboardService } from './dashboard.service';
import { environment } from '../../../../environments/environment';

describe('DashboardService', () => {
  let service: DashboardService;
  let httpMock: HttpTestingController;
  const baseUrl = `${environment.apiBaseUrl}/v1/dashboard`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        DashboardService,
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
      ],
    });

    service = TestBed.inject(DashboardService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('getStats() should GET /v1/dashboard/stats', () => {
    service.getStats().subscribe((res) => {
      expect(res.totalPosts).toBe(10);
      expect(res.activeSubscribers).toBe(7);
    });

    const req = httpMock.expectOne(`${baseUrl}/stats`);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('limit')).toBeNull();
    req.flush({ totalPosts: 10, totalViews: 100, activeSubscribers: 7 });
  });

  it('getTopPosts() should GET /v1/dashboard/posts/top with limit param', () => {
    service.getTopPosts(3).subscribe((res) => {
      expect(res.allTime.length).toBe(1);
    });

    const req = httpMock.expectOne((r) => r.url === `${baseUrl}/posts/top` && r.params.get('limit') === '3');
    expect(req.request.method).toBe('GET');
    req.flush({ allTime: [{ id: '1', title: 'Post', slug: 'post', viewCount: 1, reactionCount: 0, createdAt: '2026-01-01' }], last24h: [] });
  });

  it('getTopPosts() should default limit to 5', () => {
    service.getTopPosts().subscribe();

    const req = httpMock.expectOne((r) => r.url === `${baseUrl}/posts/top` && r.params.get('limit') === '5');
    req.flush({ allTime: [], last24h: [] });
  });

  it('getTopProjects() should GET /v1/dashboard/projects/top with limit param', () => {
    service.getTopProjects(5).subscribe((res) => {
      expect(res.last24h.length).toBe(0);
    });

    const req = httpMock.expectOne((r) => r.url === `${baseUrl}/projects/top` && r.params.get('limit') === '5');
    expect(req.request.method).toBe('GET');
    req.flush({ allTime: [], last24h: [] });
  });
});
