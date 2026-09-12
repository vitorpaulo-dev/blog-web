import { Pipe, inject } from '@angular/core';

import { LanguageService } from './language.service';
import { TranslationService } from './translation.service';

@Pipe({
	name: 'translate',
	pure: false,
	standalone: true,
})
export class TranslatePipe {
	private readonly translationService = inject(TranslationService);
	private readonly languageService = inject(LanguageService);

	transform(key: string, params?: Record<string, string | number>): string {
		this.languageService.language();
		return this.translationService.translate(key, params);
	}
}
