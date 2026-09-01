import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CanActivateFn, Router } from '@angular/router';
import { ClerkService } from '../../clerk.service';

export const authGuard: CanActivateFn = () => {
  const clerkService = inject(ClerkService);
  const router = inject(Router);
  const platformId = inject(PLATFORM_ID);

  // SSR: allow navigation to avoid blocking server render, client will redirect
  if (!isPlatformBrowser(platformId)) {
    return true;
  }

  if (clerkService.isSignedIn()) {
    return true;
  }

  clerkService.openSignIn();
  return router.createUrlTree(['/']);
};
