import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { TranslationService } from './translation.service';
import { LanguageService } from './language.service';

describe('TranslationService', () => {
	let service: TranslationService;
	let languageService: LanguageService;
	let httpMock: HttpTestingController;

	beforeEach(() => {
		TestBed.configureTestingModule({
			providers: [
				TranslationService,
				LanguageService,
				provideHttpClient(withInterceptorsFromDi()),
				provideHttpClientTesting(),
			],
		});

		service = TestBed.inject(TranslationService);
		languageService = TestBed.inject(LanguageService);
		httpMock = TestBed.inject(HttpTestingController);
	});

	afterEach(() => {
		httpMock.verify();
	});

	it('shouldLoadBothLanguagesAndResolveTranslate', async () => {
		const load = service.load();
		httpMock.expectOne('i18n/en.json').flush({ common: { cancel: 'Cancel' } });
		httpMock.expectOne('i18n/pt.json').flush({ common: { cancel: 'Cancelar' } });
		await load;

		expect(service.translate('common.cancel')).toBe('Cancel');

		languageService.setLanguage('PORTUGUESE');
		expect(service.translate('common.cancel')).toBe('Cancelar');
	});

	it('shouldCacheDictionariesAcrossLoads', async () => {
		const first = service.load();
		httpMock.expectOne('i18n/en.json').flush({});
		httpMock.expectOne('i18n/pt.json').flush({});
		await first;

		await service.load();

		httpMock.expectNone('i18n/en.json');
		httpMock.expectNone('i18n/pt.json');
	});

	it('shouldInterpolateParamsIncludingCount', async () => {
		const load = service.load();
		httpMock.expectOne('i18n/en.json').flush({
			dashboard: { posts: { list: { deleteMultiple: 'Delete {{ count }} posts?' } } },
		});
		httpMock.expectOne('i18n/pt.json').flush({});
		await load;

		expect(service.translate('dashboard.posts.list.deleteMultiple', { count: 3 })).toBe('Delete 3 posts?');
	});

	it('shouldFallBackToEnglishWhenLanguageMissing', async () => {
		languageService.setLanguage('PORTUGUESE');
		const load = service.load();
		httpMock.expectOne('i18n/en.json').flush({ home: { viewSource: 'View source on GitHub' } });
		httpMock.expectOne('i18n/pt.json').flush({});
		await load;

		expect(service.translate('home.viewSource')).toBe('View source on GitHub');
	});

	it('shouldFallBackToKeyWhenMissingEverywhere', async () => {
		const load = service.load();
		httpMock.expectOne('i18n/en.json').flush({});
		httpMock.expectOne('i18n/pt.json').flush({});
		await load;

		expect(service.translate('home.missingKey')).toBe('home.missingKey');
	});

	it('shouldUseExplicitLanguageOverActiveLanguage', async () => {
		languageService.setLanguage('PORTUGUESE');
		const load = service.load();
		httpMock.expectOne('i18n/en.json').flush({ common: { delete: 'Delete' } });
		httpMock.expectOne('i18n/pt.json').flush({ common: { delete: 'Excluir' } });
		await load;

		expect(service.translate('common.delete')).toBe('Excluir');
		expect(service.translate('common.delete', undefined, 'ENGLISH')).toBe('Delete');
	});
});
