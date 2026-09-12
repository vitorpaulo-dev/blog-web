import { TestBed } from '@angular/core/testing';

import { LanguageService } from './language.service';
import { LocalizedDatePipe } from './localized-date.pipe';

describe('LocalizedDatePipe', () => {
	let pipe: LocalizedDatePipe;
	let languageService: LanguageService;

	beforeEach(() => {
		TestBed.configureTestingModule({
			providers: [LocalizedDatePipe, LanguageService],
		});

		pipe = TestBed.inject(LocalizedDatePipe);
		languageService = TestBed.inject(LanguageService);
	});

	it('shouldFormatUsingEncodingWhenEnglish', () => {
		languageService.setLanguage('ENGLISH');
		expect(pipe.transform('2026-02-10T10:00:00Z')).toBe('10 Feb 2026');
	});

	it('shouldFormatUsingPortugueseLocaleWhenPortuguese', () => {
		languageService.setLanguage('PORTUGUESE');
		expect(pipe.transform('2026-02-10T10:00:00Z')).toBe('10 fev. 2026');
	});
});
