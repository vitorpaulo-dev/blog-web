import { DOCUMENT } from '@angular/common';
import { inject, mergeApplicationConfig, ApplicationConfig, signal } from '@angular/core';
import { provideServerRendering, withRoutes } from '@angular/ssr';
import { WA_WINDOW, WA_LOCAL_STORAGE } from '@ng-web-apis/common';
import { TUI_DARK_MODE } from '@taiga-ui/core';
import { appConfig } from './app.config';
import { serverRoutes } from './app.routes.server';

const mockMedia = {
  matches: true,
  media: '(prefers-color-scheme: dark)',
  onchange: null,
  addEventListener: () => {},
  removeEventListener: () => {},
  addListener: () => {},
  removeListener: () => {},
  dispatchEvent: () => false,
};

const baseMockWindow: any = {
  matchMedia: () => mockMedia,
  innerWidth: 1280,
  innerHeight: 800,
  visualViewport: undefined,
  addEventListener: () => {},
  removeEventListener: () => {},
  requestAnimationFrame: (cb: any) => setTimeout(() => cb(Date.now()), 16) as unknown as number,
  cancelAnimationFrame: (id: any) => clearTimeout(id),
  navigator: {
    userAgent: 'Mozilla/5.0 (SSR; Node) AppleWebKit/537.36',
    maxTouchPoints: 0,
    platform: 'SSR',
    mediaDevices: {},
    connection: null,
  },
  location: { href: 'http://localhost:4000/', origin: 'http://localhost:4000' } as unknown as Location,
  history: {} as unknown as History,
  screen: { width: 1280, height: 800 } as unknown as Screen,
  CSS: { escape: (v: string) => v, supports: () => false } as unknown as typeof CSS,
  crypto: {} as unknown as Crypto,
  caches: undefined as unknown as CacheStorage,
  performance: { now: () => Date.now() } as unknown as Performance,
  speechSynthesis: undefined as unknown as SpeechSynthesis,
  localStorage: undefined as unknown as Storage,
  sessionStorage: undefined as unknown as Storage,
};

const serverConfig: ApplicationConfig = {
  providers: [
    provideServerRendering(withRoutes(serverRoutes)),
    // SSR — provide WA_WINDOW backed by DOCUMENT.documentElement so tuiWindowSize doesn't crash
    // WA_WINDOW normally is DOCUMENT.defaultView; on SSR defaultView is null so Taiga falls back to undefined.
    {
      provide: WA_WINDOW,
      useFactory: () => {
        const doc: any = inject(DOCUMENT);
        const docEl = doc?.documentElement;
        // ensure documentElement exists even if Domino doc is minimal
        if (doc && !docEl) {
          doc.documentElement = {
            clientWidth: 1280,
            clientHeight: 800,
            style: {},
          };
        }
        return {
          ...baseMockWindow,
          document: doc,
          // keep defaultView link for code that checks defaultView
          defaultView: baseMockWindow,
          getComputedStyle: doc?.defaultView?.getComputedStyle?.bind(doc.defaultView) ?? (() => ({ getPropertyValue: () => '' }) as any),
        };
      },
    },
    { provide: WA_LOCAL_STORAGE, useValue: null },
    {
      provide: TUI_DARK_MODE,
      useValue: Object.assign(signal(true), {
        set: () => {},
        update: () => {},
        reset: () => {},
      }),
    },
  ],
};

export const config = mergeApplicationConfig(appConfig, serverConfig);
