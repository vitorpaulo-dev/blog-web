import { Provider } from '@angular/core';
import { TranslationService } from './translation.service';

import en from '../../../../public/i18n/en.json';

type Dictionary = Record<string, unknown>;

function resolve(dictionary: Dictionary, key: string): string {
	let node: unknown = dictionary;

	for (const segment of key.split('.')) {
		if (typeof node !== 'object' || node === null || !(segment in node)) {
			return key;
		}

		node = (node as Dictionary)[segment];
	}

	return typeof node === 'string' ? node : key;
}

export function translationServiceStub(): Provider {
	return {
		provide: TranslationService,
		useValue: {
			load: (_language: string) => Promise.resolve(),
			translate: (key: string, params?: Record<string, string | number>) =>
				!params
					? resolve(en, key)
					: resolve(en, key).replace(/\{\{\s*(\w+)\s*\}\}/g, (placeholder, name: string) =>
							name in params ? String(params[name]) : placeholder
						),
		},
	};
}

export const translationProvider = translationServiceStub;
