import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { LanguageService } from './language.service';
import { TranslatePipe } from './translate.pipe';
import { TranslationService } from './translation.service';

describe('TranslatePipe', () => {
	let pipe: TranslatePipe;
	let languageService: LanguageService;
	let translationService: TranslationService;
	let httpMock: HttpTestingController;

	beforeEach(() => {
		TestBed.configureTestingModule({
			providers: [
				TranslatePipe,
				TranslationService,
				LanguageService,
				provideHttpClient(withInterceptorsFromDi()),
				provideHttpClientTesting(),
			],
		});

		pipe = TestBed.inject(TranslatePipe);
		languageService = TestBed.inject(LanguageService);
		translationService = TestBed.inject(TranslationService);
		httpMock = TestBed.inject(HttpTestingController);

		const load = translationService.load();
		httpMock.expectOne('i18n/en.json').flush({ home: { viewSource: 'View source on GitHub' } });
		httpMock.expectOne('i18n/pt.json').flush({ home: { viewSource: 'Ver código-fonte no GitHub' } });
		load.then(() => undefined).catch(() => undefined);
	});

	afterEach(() => {
		httpMock.verify();
	});

	it('shouldTranslateKeyForActiveLanguage', () => {
		languageService.setLanguage('ENGLISH');

		expect(pipe.transform('home.viewSource')).toBe('View source on GitHub');
	});

	it('shouldTranslateNewLanguageWhenLanguageSignalChanges', () => {
		expect(pipe.transform('home.viewSource')).toBe('View source on GitHub');

		languageService.setLanguage('PORTUGUESE');
		expect(pipe.transform('home.viewSource')).toBe('Ver código-fonte no GitHub');
	});

	it('shouldPassParamsToTranslations', () => {
		languageService.setLanguage('ENGLISH');
		expect(pipe.transform('home.missing', { count: 2 })).toBe('home.missing');
	});
});
