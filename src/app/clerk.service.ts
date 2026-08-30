import { Injectable, inject, signal, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Clerk } from '@clerk/clerk-js';
import { ui } from '@clerk/ui';

// Clerk publishable key (pk_*) is PUBLIC by design — safe to commit. It only identifies the
// Clerk application (app_3IcT5NxUR5kLQ01BGfdOuwvL4Kc) and is meant to be exposed in the browser.
// The SECRET key (sk_*) is NEVER committed — it stays in server env / deployment secrets only.
// Priority: 1) import.meta.env VITE_CLERK_PUBLISHABLE_KEY 2) window.__clerk_publishable_key 3) this fallback.
const FALLBACK_PUBLISHABLE_KEY = 'pk_test_dHJ1ZS1zcGlkZXItNzQ1Ni5jbGVyay5hY2NvdW50cy5kZXYk';

/**
 * Resolve Clerk publishable key with priority: env > window global > fallback.
 * SSR-safe: guards `window` access with `typeof window !== 'undefined'` so it can be
 * imported on the server. Also, `ClerkService.init()` is itself gated by
 * `isPlatformBrowser` — resolve is only called from browser context.
 */
function resolvePublishableKey(): string {
  // 1) Vite-style env (Angular 17+ uses Vite dev server) – supports both VITE_ and CLERK_ prefixes
  const env = (import.meta as unknown as { env?: Record<string, string> })?.env;
  const viteKey = env?.['VITE_CLERK_PUBLISHABLE_KEY'] ?? env?.['CLERK_PUBLISHABLE_KEY'] ?? env?.['NG_APP_CLERK_PUBLISHABLE_KEY'];
  if (viteKey) return viteKey;

  // 2) window global set by server or index.html — guarded for SSR
  if (typeof window !== 'undefined' && (window as unknown as { __clerk_publishable_key?: string }).__clerk_publishable_key) {
    return (window as unknown as { __clerk_publishable_key: string }).__clerk_publishable_key;
  }

  // 3) Fallback public test key — safe to commit (pk_* is not a secret)
  return FALLBACK_PUBLISHABLE_KEY;
}

@Injectable({ providedIn: 'root' })
export class ClerkService {
  private readonly platformId = inject(PLATFORM_ID);
  private clerk: Clerk | null = null;

  readonly isLoaded = signal(false);
  readonly isSignedIn = signal(false);
  readonly user = signal<Clerk['user']>(null);

  get instance(): Clerk | null {
    return this.clerk;
  }

  async init(publishableKey?: string): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;

    const key = publishableKey || resolvePublishableKey();
    if (!key) {
      console.warn('[Clerk] Missing publishableKey. Set VITE_CLERK_PUBLISHABLE_KEY or update src/app/clerk.service.ts FALLBACK_PUBLISHABLE_KEY. Get key from https://dashboard.clerk.com (app_3IcT5NxUR5kLQ01BGfdOuwvL4Kc).');
      return;
    }

    if (this.clerk) return;

    this.clerk = new Clerk(key);
    await this.clerk.load({ ui });

    this.syncState();

    // Keep signals in sync with Clerk state
    this.clerk.addListener(({ session, user }) => {
      this.isSignedIn.set(!!session);
      this.user.set(user ?? null);
    });
  }

  private syncState(): void {
    if (!this.clerk) return;
    this.isLoaded.set(this.clerk.loaded);
    this.isSignedIn.set(!!this.clerk.session);
    this.user.set(this.clerk.user ?? null);
  }

  openSignIn(props?: Parameters<Clerk['openSignIn']>[0]): void {
    this.clerk?.openSignIn(props);
  }

  openSignUp(props?: Parameters<Clerk['openSignUp']>[0]): void {
    this.clerk?.openSignUp(props);
  }

  openUserProfile(props?: Parameters<Clerk['openUserProfile']>[0]): void {
    this.clerk?.openUserProfile(props);
  }

  signOut(): Promise<void> {
    return this.clerk?.signOut() ?? Promise.resolve();
  }

  mountUserButton(node: HTMLDivElement, props?: Parameters<Clerk['mountUserButton']>[1]): void {
    this.clerk?.mountUserButton(node, props);
  }

  unmountUserButton(node: HTMLDivElement): void {
    this.clerk?.unmountUserButton(node);
  }
}
