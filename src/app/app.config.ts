import { provideTaiga } from '@taiga-ui/core';
import { registerLocaleData } from '@angular/common';
import localeEn from '@angular/common/locales/en';
import localePt from '@angular/common/locales/pt';
import { inject, provideAppInitializer, ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';

import { routes } from './app.routes';
import { provideClientHydration, withHttpTransferCacheOptions } from '@angular/platform-browser';
import { ClerkService } from './clerk.service';
import { authInterceptor } from './core/auth/auth.interceptor';
import { TranslationService } from './core/i18n/translation.service';

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
		provideHttpClient(withFetch(), withInterceptors([authInterceptor])),
		provideTaiga({
			apis: {
				all: true
			}
		}),
		provideAppInitializer(() => {
			void inject(ClerkService).init();
			return inject(TranslationService).load();
		}),
	],
};
