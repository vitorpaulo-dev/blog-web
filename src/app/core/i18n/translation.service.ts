import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { Language, LanguageService } from './language.service';

type Dictionary = Record<string, unknown>;

const LANGUAGE_CODES: Record<Language, string> = {
	ENGLISH: 'en',
	PORTUGUESE: 'pt',
};

@Injectable({ providedIn: 'root' })
export class TranslationService {
	private readonly http = inject(HttpClient);
	private readonly languageService = inject(LanguageService);
	private readonly dictionaries = new Map<string, Dictionary>();
	private readonly pendingLoads = new Map<string, Promise<void>>();

	load(): Promise<void> {
		return Promise.all(Object.values(LANGUAGE_CODES).map(code => this.loadLanguage(code))).then(() => undefined);
	}

	translate(key: string, params?: Record<string, string | number>, language?: Language): string {
		const requested = LANGUAGE_CODES[language ?? this.languageService.language()];
		const value = this.resolve(requested, key) ?? this.resolve(LANGUAGE_CODES.ENGLISH, key) ?? key;

		if (!params) {
			return value;
		}

		return value.replace(/\{\{\s*(\w+)\s*\}\}/g, (placeholder, name: string) =>
			name in params ? String(params[name]) : placeholder
		);
	}

	private loadLanguage(code: string): Promise<void> {
		if (this.dictionaries.has(code)) {
			return Promise.resolve();
		}

		const pending = this.pendingLoads.get(code);
		if (pending) {
			return pending;
		}

		const request = firstValueFrom(this.http.get<Dictionary>(`i18n/${code}.json`))
			.then(dictionary => {
				this.dictionaries.set(code, dictionary);
			})
			.catch(error => {
				console.error(`Failed to load translations for "${code}"`, error);
			})
			.finally(() => {
				this.pendingLoads.delete(code);
			}) as Promise<void>;

		this.pendingLoads.set(code, request);
		return request;
	}

	private resolve(code: string, key: string): string | null {
		const dictionary = this.dictionaries.get(code);

		if (!dictionary) {
			return null;
		}

		let node: unknown = dictionary;

		for (const segment of key.split('.')) {
			if (typeof node !== 'object' || node === null || !(segment in node)) {
				return null;
			}

			node = (node as Dictionary)[segment];
		}

		return typeof node === 'string' ? node : null;
	}
}
