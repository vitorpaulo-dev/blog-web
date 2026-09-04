import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CanActivateFn, Router } from '@angular/router';
import { ClerkService } from '../../clerk.service';

export const authGuard: CanActivateFn = (_route, state) => {
  const clerkService = inject(ClerkService);
  const platformId = inject(PLATFORM_ID);
  const router = inject(Router);

  // SSR: allow navigation to avoid blocking server render, client will redirect
  if (!isPlatformBrowser(platformId)) {
    return true;
  }

  if (clerkService.isSignedIn()) {
    return true;
  }

  // Redirect to login page with full URL (including query params) as redirect_url
  return router.createUrlTree(['/login'], {
    queryParams: { redirect_url: state.url },
  });
};
