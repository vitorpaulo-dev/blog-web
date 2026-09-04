import { Injectable, inject, signal, PLATFORM_ID, TransferState, makeStateKey } from '@angular/core';
import { isPlatformBrowser, DOCUMENT } from '@angular/common';

export type Language = 'ENGLISH' | 'PORTUGUESE';

const LANGUAGE_KEY = makeStateKey<Language>('language');
const STORAGE_KEY = 'blog-language';

@Injectable({ providedIn: 'root' })
export class LanguageService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly transferState = inject(TransferState);
  private readonly document = inject(DOCUMENT);

  readonly language = signal<Language>(this.loadInitial());

  private loadInitial(): Language {
    const fromTransfer = this.transferState.get(LANGUAGE_KEY, null);
    if (fromTransfer) return fromTransfer;

    if (isPlatformBrowser(this.platformId)) {
      try {
        const stored = this.document.defaultView?.localStorage?.getItem(STORAGE_KEY);
        if (stored === 'ENGLISH' || stored === 'PORTUGUESE') {
          this.transferState.set(LANGUAGE_KEY, stored as Language);
          return stored as Language;
        }
      } catch {
        // localStorage unavailable
      }

      // Try to detect from browser language
      const browserLang = this.document.defaultView?.navigator?.language?.toLowerCase();
      if (browserLang) {
        if (browserLang.startsWith('pt')) {
          this.transferState.set(LANGUAGE_KEY, 'PORTUGUESE');
          return 'PORTUGUESE';
        }
        if (browserLang.startsWith('en')) {
          this.transferState.set(LANGUAGE_KEY, 'ENGLISH');
          return 'ENGLISH';
        }
      }
    }

    return 'ENGLISH';
  }

  setLanguage(language: Language): void {
    this.language.set(language);
    this.transferState.set(LANGUAGE_KEY, language);
    if (isPlatformBrowser(this.platformId)) {
      try {
        this.document.defaultView?.localStorage?.setItem(STORAGE_KEY, language);
      } catch {
        // localStorage unavailable
      }
    }
  }
}
