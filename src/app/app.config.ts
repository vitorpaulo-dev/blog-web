import { provideTaiga } from '@taiga-ui/core';
import { registerLocaleData, isPlatformBrowser } from '@angular/common';
import localeEn from '@angular/common/locales/en';
import localePt from '@angular/common/locales/pt';
import { inject, afterNextRender, provideAppInitializer, ApplicationConfig, provideBrowserGlobalErrorListeners, PLATFORM_ID } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';

import { routes } from './app.routes';
import { provideClientHydration, withHttpTransferCacheOptions } from '@angular/platform-browser';
import { authInterceptor } from './core/auth/auth.interceptor';
import { ssrIpForwardInterceptor } from './core/http/ssr-ip-forward.interceptor';
import { TranslationService } from './core/i18n/translation.service';
import { ClerkService } from './core/auth/clerk.service';

registerLocaleData(localeEn);
registerLocaleData(localePt);

export const appConfig: ApplicationConfig = {
	providers: [
		provideBrowserGlobalErrorListeners(),
		provideRouter(routes),
		provideClientHydration(
			withHttpTransferCacheOptions({
				includePostRequests: true
			})
		),
		provideHttpClient(withFetch(), withInterceptors([ssrIpForwardInterceptor, authInterceptor])),
		provideTaiga({
			apis: {
				all: true
			}
		}),
		provideAppInitializer(() => {
			if (isPlatformBrowser(inject(PLATFORM_ID))) {
				const clerkService = inject(ClerkService);
				afterNextRender(() => {
					let fired = false;
					let idleHandle: number | null = null;
					let timerHandle: ReturnType<typeof setTimeout> | null = null;

					const loadClerk = () => {
						if (fired) {
							return;
						}
						fired = true;

						globalThis.removeEventListener('pointerdown', loadClerk);
						globalThis.removeEventListener('keydown', loadClerk);
						globalThis.removeEventListener('scroll', loadClerk);

						if (idleHandle !== null && typeof globalThis.cancelIdleCallback === 'function') {
							globalThis.cancelIdleCallback(idleHandle);
						}

						if (timerHandle !== null) {
							clearTimeout(timerHandle);
						}

						clerkService.init().catch(() => undefined);
					};

					globalThis.addEventListener('pointerdown', loadClerk);
					globalThis.addEventListener('keydown', loadClerk);
					globalThis.addEventListener('scroll', loadClerk);

					if (typeof globalThis.requestIdleCallback === 'function') {
						idleHandle = globalThis.requestIdleCallback(loadClerk, { timeout: 8000 });
					} else {
						timerHandle = setTimeout(loadClerk, 8000);
					}
				});
			}
			return inject(TranslationService).load();
		}),
	],
};
