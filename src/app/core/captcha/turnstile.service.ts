import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { PLATFORM_ID, Injectable, inject } from '@angular/core';
import { environment } from '../../../environments/environment';

interface TurnstileWidget {
  render(container: HTMLElement, params: TurnstileWidgetParams): string;
  reset(widgetId?: string): void;
  getResponse(widgetId?: string): string;
}

interface TurnstileWidgetParams {
  sitekey: string;
  callback?(token: string): void;
  'expired-callback'?(): void;
  'error-callback'?(): void;
}

interface TurnstileWindow extends Window {
  turnstile?: TurnstileWidget;
}

@Injectable({ providedIn: 'root' })
export class TurnstileService {
  private static readonly MAX_TOKEN_ATTEMPTS = 3;
  private static readonly RETRY_DELAY_MS = 100;
  private static readonly TOKEN_WAIT_MS = 500;
  private static readonly READY_TIMEOUT_MS = 3000;

  private readonly platformId = inject(PLATFORM_ID);
  private readonly document = inject(DOCUMENT);

  private widgetId: string | null = null;
  private pendingToken: string | null = null;
  private tokenWaiters = new Set<(token: string | null) => void>();
  private acquisition: Promise<string | null> | null = null;

  constructor() {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    this.initialize();
  }

  async getToken(): Promise<string | null> {
    if (!isPlatformBrowser(this.platformId)) {
      return null;
    }

    // Coalesced acquisition: parallel callers share a single in-flight
    // attempt loop instead of racing parallel resets/retries.
    if (!this.acquisition) {
      this.acquisition = this.acquire().finally(() => {
        this.acquisition = null;
      });
    }

    return this.acquisition;
  }

  reset(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    const turnstile = (window as TurnstileWindow).turnstile;
    if (!turnstile || !this.widgetId) {
      return;
    }

    turnstile.reset(this.widgetId);
  }

  private async acquire(): Promise<string | null> {
    for (let attempt = 0; attempt < TurnstileService.MAX_TOKEN_ATTEMPTS; attempt++) {
      await this.waitForWidget();

      const turnstile = (window as TurnstileWindow).turnstile;
      if (!turnstile || !this.widgetId) {
        return null;
      }

      const token = this.takeToken(turnstile);
      if (token) {
        return token;
      }

      // Failure, timeout or expired token: clear the token, reset the
      // widget and wait for the success callback before the next attempt.
      this.pendingToken = null;
      this.reset();
      if (attempt < TurnstileService.MAX_TOKEN_ATTEMPTS - 1) {
        await this.delay(TurnstileService.RETRY_DELAY_MS);
        await this.waitForToken();
      }
    }

    return null;
  }

  private takeToken(turnstile: TurnstileWidget): string | null {
    if (this.pendingToken) {
      const token = this.pendingToken;
      this.pendingToken = null;
      return token;
    }

    return turnstile.getResponse(this.widgetId ?? undefined) || null;
  }

  private onToken(token: string | null): void {
    this.pendingToken = token;

    const waiters = [...this.tokenWaiters];
    this.tokenWaiters.clear();
    waiters.forEach(waiter => waiter(token));
  }

  private waitForToken(): Promise<string | null> {
    if (this.pendingToken) {
      return Promise.resolve(this.pendingToken);
    }

    return new Promise((resolve) => {
      let timer: ReturnType<typeof setTimeout>;
      const waiter = (token: string | null) => {
        clearTimeout(timer);
        resolve(token);
      };

      timer = setTimeout(() => {
        this.tokenWaiters.delete(waiter);
        resolve(null);
      }, TurnstileService.TOKEN_WAIT_MS);

      this.tokenWaiters.add(waiter);
    });
  }

  private initialize(): void {
    const container = this.document.createElement('div');
    container.style.display = 'none';
    this.document.body.appendChild(container);

    const turnstile = (window as TurnstileWindow).turnstile;
    if (turnstile) {
      this.render(container);
      return;
    }

    const script = this.document.querySelector<HTMLScriptElement>(
      'script[src*="challenges.cloudflare.com/turnstile"]'
    );
    if (script) {
      script.addEventListener('load', () => this.render(container));
      script.addEventListener('error', () => this.document.body.removeChild(container));
    }
  }

  private render(container: HTMLElement): void {
    const turnstile = (window as TurnstileWindow).turnstile;
    if (!turnstile) {
      return;
    }

    this.widgetId = turnstile.render(container, {
      sitekey: environment.turnstileSiteKey,
      callback: (token) => this.onToken(token),
      'expired-callback': () => this.onToken(null),
      'error-callback': () => this.onToken(null),
    });
  }

  private waitForWidget(): Promise<void> {
    if (this.widgetId) {
      return Promise.resolve();
    }

    return new Promise((resolve) => {
      const startedAt = Date.now();
      const poll = () => {
        if (this.widgetId || Date.now() - startedAt >= TurnstileService.READY_TIMEOUT_MS) {
          resolve();
          return;
        }
        setTimeout(poll, 100);
      };
      poll();
    });
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
