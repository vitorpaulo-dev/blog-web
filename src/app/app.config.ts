import { provideTaiga } from '@taiga-ui/core';
import { APP_INITIALIZER, ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { provideClientHydration } from '@angular/platform-browser';
import { ClerkService } from './clerk.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideClientHydration(),
    provideTaiga(),
    {
      provide: APP_INITIALIZER,
      multi: true,
      useFactory: (clerk: ClerkService) => () => clerk.init(),
      deps: [ClerkService],
    },
  ],
};
