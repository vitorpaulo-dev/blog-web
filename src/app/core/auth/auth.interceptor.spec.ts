import { HttpHandlerFn, HttpRequest, HttpResponse } from '@angular/common/http';
import { signal, PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ClerkService } from './clerk.service';
import { authInterceptor } from './auth.interceptor';

function runInterceptor(req: HttpRequest<unknown>): Promise<HttpRequest<unknown>> {
  let captured: HttpRequest<unknown> = req;
  const next: HttpHandlerFn = (request: HttpRequest<unknown>) => {
    captured = request;
    return of(new HttpResponse({ status: 200 }));
  };

  const result = TestBed.runInInjectionContext(() => authInterceptor(req, next));
  return result.toPromise().then(() => captured);
}

describe('authInterceptor', () => {
  let clerkServiceMock: {
    isLoaded: ReturnType<typeof signal<boolean>>;
    isSignedIn: ReturnType<typeof signal<boolean>>;
    init: ReturnType<typeof vi.fn>;
    getToken: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    clerkServiceMock = {
      isLoaded: signal(false),
      isSignedIn: signal(false),
      init: vi.fn().mockResolvedValue(undefined),
      getToken: vi.fn().mockResolvedValue(null),
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: ClerkService, useValue: clerkServiceMock },
        { provide: PLATFORM_ID, useValue: 'browser' },
      ],
    });
  });

  it('triggers Clerk init on the first API request while Clerk is not loaded', async () => {
    await runInterceptor(new HttpRequest('GET', `${environment.apiBaseUrl}/v1/post/search`));

    expect(clerkServiceMock.init).toHaveBeenCalledTimes(1);
  });

  it('does not trigger Clerk init once Clerk is loaded', async () => {
    clerkServiceMock.isLoaded.set(true);

    await runInterceptor(new HttpRequest('GET', `${environment.apiBaseUrl}/v1/post/search`));

    expect(clerkServiceMock.init).not.toHaveBeenCalled();
  });

  it('ignores non-API requests entirely', async () => {
    await runInterceptor(new HttpRequest('GET', 'https://other.example/x'));

    expect(clerkServiceMock.init).not.toHaveBeenCalled();
  });

  it('passes through unsigned-in requests without an Authorization header', async () => {
    clerkServiceMock.isLoaded.set(true);

    const sent = await runInterceptor(new HttpRequest('GET', `${environment.apiBaseUrl}/v1/post/search`));

    expect(sent.headers.has('Authorization')).toBe(false);
    expect(clerkServiceMock.getToken).not.toHaveBeenCalled();
  });

  it('attaches the Clerk session token when signed in', async () => {
    clerkServiceMock.isLoaded.set(true);
    clerkServiceMock.isSignedIn.set(true);
    clerkServiceMock.getToken.mockResolvedValue('jwt-1');

    const sent = await runInterceptor(new HttpRequest('GET', `${environment.apiBaseUrl}/v1/post/p1`));

    expect(sent.headers.get('Authorization')).toBe('Bearer jwt-1');
  });
});
