import { PLATFORM_ID } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { TurnstileService } from './turnstile.service';

interface WidgetMock {
  render: ReturnType<typeof vi.fn>;
  reset: ReturnType<typeof vi.fn>;
  getResponse: ReturnType<typeof vi.fn>;
  params?: {
    callback?(token: string): void;
    'expired-callback'?(): void;
    'error-callback'?(): void;
  };
}

const widgetId = 'widget-1';

function renderWidget(getResponse: WidgetMock['getResponse']): WidgetMock {
  const widget: WidgetMock = {
    render: vi.fn().mockImplementation((_container: HTMLElement, params: NonNullable<WidgetMock['params']>) => {
      widget.params = params;
      return widgetId;
    }),
    reset: vi.fn(),
    getResponse,
  };
  (window as any).turnstile = widget;
  return widget;
}

describe('TurnstileService', () => {
  let service: TurnstileService;

  afterEach(() => {
    delete (window as any).turnstile;
    vi.restoreAllMocks();
  });

  describe('browser (widget ready)', () => {
    beforeEach(() => {
      TestBed.configureTestingModule({
        providers: [TurnstileService, { provide: PLATFORM_ID, useValue: 'browser' }, { provide: DOCUMENT, useValue: document }],
      });
    });

    it('getToken() resolves the widget token when ready, without resetting', async () => {
      const widget = renderWidget(vi.fn().mockReturnValue('tok-ready'));

      service = TestBed.inject(TurnstileService);

      await expect(service.getToken()).resolves.toBe('tok-ready');
      expect(widget.render).toHaveBeenCalled();
      expect(widget.reset).not.toHaveBeenCalled();
    });

    it('getToken() resolves the token delivered by the success callback', async () => {
      const widget = renderWidget(vi.fn().mockReturnValue(''));

      service = TestBed.inject(TurnstileService);

      const acquisition = service.getToken();
      await new Promise(resolve => setTimeout(resolve, 50));
      widget.params!.callback!('tok-callback');

      await expect(acquisition).resolves.toBe('tok-callback');
    });

    it('getToken() clears the empty token, resets the widget and waits for the success callback before retrying', async () => {
      const widget = renderWidget(vi.fn().mockReturnValue(''));

      service = TestBed.inject(TurnstileService);

      const acquisition = service.getToken();
      await new Promise(resolve => setTimeout(resolve, 250));
      // Reset happened while waiting for the next success callback.
      expect(widget.reset).toHaveBeenCalledTimes(1);
      expect(widget.reset).toHaveBeenCalledWith(widgetId);
      // Simulating widget completion after the reset resolves the acquisition.
      widget.params!.callback!('tok-after-retry');

      await expect(acquisition).resolves.toBe('tok-after-retry');
      expect(widget.reset).toHaveBeenCalledTimes(1);
    });

    it('getToken() retries from the expired-callback state', async () => {
      const widget = renderWidget(vi.fn().mockReturnValue(''));

      service = TestBed.inject(TurnstileService);

      const acquisition = service.getToken();
      await new Promise(resolve => setTimeout(resolve, 250));
      // Token expired after reset: callback yields nothing and the loop retries.
      widget.params!['expired-callback']!();
      widget.params!.callback!('tok-once');

      await expect(acquisition).resolves.toBe('tok-once');
    });

    it('concurrent getToken() callers share a single acquisition', async () => {
      const widget = renderWidget(vi.fn().mockReturnValue(''));

      service = TestBed.inject(TurnstileService);

      const first = service.getToken();
      const second = service.getToken();
      await new Promise(resolve => setTimeout(resolve, 250));

      // One reset per acquisition attempt, not one per caller.
      expect(widget.reset).toHaveBeenCalledTimes(1);

      widget.params!.callback!('tok-shared');

      await expect(first).resolves.toBe('tok-shared');
      await expect(second).resolves.toBe('tok-shared');
    });

    it('getToken() resolves null after bounded retries when responses stay empty (no callback)', async () => {
      const widget = renderWidget(vi.fn().mockReturnValue(''));

      service = TestBed.inject(TurnstileService);

      await expect(service.getToken()).resolves.toBeNull();
      // One reset per attempted response, none after the final attempt.
      expect(widget.reset).toHaveBeenCalledTimes(3);
      expect(widget.getResponse).toHaveBeenCalledTimes(3);
    });

    it('getToken() resolves null on persistent widget error without a callback', async () => {
      const widget = renderWidget(vi.fn().mockReturnValue(''));

      service = TestBed.inject(TurnstileService);

      const acquisition = service.getToken();
      await new Promise(resolve => setTimeout(resolve, 250));
      widget.params!['error-callback']!();
      widget.params!['expired-callback']!();

      await expect(acquisition).resolves.toBeNull();
      expect(widget.reset).toHaveBeenCalledTimes(3);
    });

    it('reset() delegates to the widget', () => {
      renderWidget(vi.fn().mockReturnValue(''));

      service = TestBed.inject(TurnstileService);
      service.reset();

      expect((window as any).turnstile.reset).toHaveBeenCalledWith(widgetId);
    });
  });

  describe('server (SSR no-op)', () => {
    beforeEach(() => {
      TestBed.configureTestingModule({
        providers: [TurnstileService, { provide: PLATFORM_ID, useValue: 'server' }, { provide: DOCUMENT, useValue: document }],
      });
    });

    it('getToken() resolves null without touching the browser widget', async () => {
      const widget = renderWidget(vi.fn().mockReturnValue('tok-server'));

      service = TestBed.inject(TurnstileService);

      await expect(service.getToken()).resolves.toBeNull();
      expect(widget.getResponse).not.toHaveBeenCalled();
      expect(widget.render).not.toHaveBeenCalled();
    });

    it('reset() is a no-op without touching the browser widget', () => {
      renderWidget(vi.fn().mockReturnValue(''));

      service = TestBed.inject(TurnstileService);
      service.reset();

      expect((window as any).turnstile.reset).not.toHaveBeenCalled();
    });
  });
});
