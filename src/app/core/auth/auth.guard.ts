import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CanActivateFn, Router } from '@angular/router';
import { ClerkService } from '../../clerk.service';

export const authGuard: CanActivateFn = async (_route, state) => {
  const clerkService = inject(ClerkService);
  const platformId = inject(PLATFORM_ID);
  const router = inject(Router);

  if (!isPlatformBrowser(platformId)) {
    return true;
  }

  try {
    await clerkService.init();
  } catch {
    return router.createUrlTree(['/login'], {
      queryParams: { redirect_url: state.url },
    });
  }

  if (clerkService.isSignedIn()) {
    return true;
  }

  return router.createUrlTree(['/login'], {
    queryParams: { redirect_url: state.url },
  });
};
