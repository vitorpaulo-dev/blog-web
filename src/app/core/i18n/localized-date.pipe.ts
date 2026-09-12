import { formatDate, registerLocaleData } from '@angular/common';
import localeEn from '@angular/common/locales/en';
import localePt from '@angular/common/locales/pt';
import { Pipe, inject } from '@angular/core';

import { LanguageService } from './language.service';

registerLocaleData(localeEn);
registerLocaleData(localePt);

@Pipe({
	name: 'localizedDate',
	pure: false,
	standalone: true,
})
export class LocalizedDatePipe {
	private readonly languageService = inject(LanguageService);

	transform(value: string | number | Date, format = 'dd MMM yyyy'): string {
		if (value === null || value === undefined || value === '') {
			return '';
		}

		const locale = this.languageService.language() === 'PORTUGUESE' ? 'pt' : 'en';
		return formatDate(value, format, locale);
	}
}
