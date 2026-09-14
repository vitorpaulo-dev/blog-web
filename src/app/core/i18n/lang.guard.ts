import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { LanguageService } from './language.service';

export const langGuard: CanActivateFn = (route, state) => {
  const languageService = inject(LanguageService);
  const router = inject(Router);

  const lang = route.paramMap.get('lang');

  if (lang === null) {
    languageService.setLanguage('ENGLISH');
    return true;
  }

  if (lang === 'pt') {
    languageService.setLanguage('PORTUGUESE');
    return true;
  }

  return router.parseUrl(state.url.slice(lang.length + 1) || '/');
};
