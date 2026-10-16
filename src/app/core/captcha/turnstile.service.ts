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

const TURNSTILE_API_URL = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

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
  private container: HTMLElement | null = null;

  async getToken(): Promise<string | null> {
    if (!isPlatformBrowser(this.platformId)) {
      return null;
    }

    this.initialize();

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
    if (this.container || this.widgetId) {
      return;
    }

    const container = this.document.createElement('div');
    container.style.display = 'none';
    this.document.body.appendChild(container);
    this.container = container;

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
      script.addEventListener('error', () => this.onScriptFailure(script, container));
      return;
    }

    const injected = this.document.createElement('script');
    injected.src = TURNSTILE_API_URL;
    injected.async = true;
    injected.addEventListener('load', () => this.render(container));
    injected.addEventListener('error', () => this.onScriptFailure(injected, container));
    this.document.head.appendChild(injected);
  }

  private onScriptFailure(script: HTMLScriptElement, container: HTMLElement): void {
    if (this.container !== container) {
      return;
    }

    this.container = null;
    script.remove();
    container.remove();
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
