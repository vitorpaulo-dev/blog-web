import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CanActivateFn } from '@angular/router';
import { ClerkService } from '../../clerk.service';

export const authGuard: CanActivateFn = () => {
  const clerkService = inject(ClerkService);
  const platformId = inject(PLATFORM_ID);

  // SSR: allow navigation to avoid blocking server render, client will redirect
  if (!isPlatformBrowser(platformId)) {
    return true;
  }

  if (clerkService.isSignedIn()) {
    return true;
  }

  // Open sign-in modal and block navigation (don't redirect)
  clerkService.openSignIn();
  return false;
};
