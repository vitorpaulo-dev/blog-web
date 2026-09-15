import { TestBed } from '@angular/core/testing';
import { PLATFORM_ID } from '@angular/core';
import { ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree } from '@angular/router';
import { authGuard } from './auth.guard';
import { ClerkService } from './clerk.service';


const activatedRoute = {} as ActivatedRouteSnapshot;

const stateWithUrl = (url: string) => ({ url }) as RouterStateSnapshot;

describe('authGuard', () => {
  let clerkServiceMock: {
    init: ReturnType<typeof vi.fn>;
    isSignedIn: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    clerkServiceMock = {
      init: vi.fn().mockResolvedValue(undefined),
      isSignedIn: vi.fn().mockReturnValue(false),
    };

    await TestBed.configureTestingModule({
      providers: [
        { provide: ClerkService, useValue: clerkServiceMock },
      ],
    }).compileComponents();
  });

  it('signed-in after clerk init allows navigation', async () => {
    clerkServiceMock.isSignedIn.mockReturnValue(true);

    await TestBed.runInInjectionContext(async () => {
      const result = await authGuard(activatedRoute, stateWithUrl('/dashboard'));
      expect(result).toBe(true);
      expect(clerkServiceMock.init).toHaveBeenCalled();
    });
  });

  it('signed-out after clerk init redirects to login with redirect_url', async () => {
    await TestBed.runInInjectionContext(async () => {
      const result = (await authGuard(activatedRoute, stateWithUrl('/dashboard'))) as UrlTree;
      expect(result).not.toBe(true);
      expect(result.toString()).toBe('/login?redirect_url=%2Fdashboard');
    });
  });

  it('clerk init failure redirects to login', async () => {
    clerkServiceMock.init.mockRejectedValue(new Error('load failed'));

    await TestBed.runInInjectionContext(async () => {
      const result = (await authGuard(activatedRoute, stateWithUrl('/dashboard'))) as UrlTree;
      expect(result.toString()).toBe('/login?redirect_url=%2Fdashboard');
    });
  });

  it('server platform allows navigation without touching clerk', async () => {
    TestBed.overrideProvider(PLATFORM_ID, { useValue: 'server' });
    await TestBed.runInInjectionContext(async () => {
      const result = await authGuard(activatedRoute, stateWithUrl('/dashboard'));
      expect(result).toBe(true);
      expect(clerkServiceMock.init).not.toHaveBeenCalled();
    });
  });
});
