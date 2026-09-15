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
  private readonly platformId = inject(PLATFORM_ID);
  private readonly document = inject(DOCUMENT);

  private widgetId: string | null = null;

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

    if (!this.widgetId) {
      await this.waitForWidget();
    }

    const turnstile = (window as TurnstileWindow).turnstile;
    if (!turnstile || !this.widgetId) {
      return null;
    }

    return turnstile.getResponse(this.widgetId) || null;
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
      'error-callback': () => {
        this.widgetId = null;
      },
    });
  }

  private waitForWidget(timeout = 3000): Promise<void> {
    if (this.widgetId) {
      return Promise.resolve();
    }

    return new Promise((resolve) => {
      const startedAt = Date.now();
      const poll = () => {
        if (this.widgetId || Date.now() - startedAt >= timeout) {
          resolve();
          return;
        }
        setTimeout(poll, 100);
      };
      poll();
    });
  }
}
