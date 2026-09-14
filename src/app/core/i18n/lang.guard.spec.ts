import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, ParamMap, Route, RouterStateSnapshot, UrlTree, provideRouter } from '@angular/router';
import { langGuard } from './lang.guard';
import { LanguageService } from './language.service';
import { routes } from '../../app.routes';

const routeWithLang = (lang: string | null): ActivatedRouteSnapshot =>
  ({
    paramMap: {
      get: (key: string) => (key === 'lang' ? lang : null),
      getAll: () => (lang === null ? [] : [lang]),
      has: (key: string) => key === 'lang' && lang !== null,
      keys: lang === null ? [] : ['lang'],
    } as ParamMap,
  }) as unknown as ActivatedRouteSnapshot;

const stateWithUrl = (url: string) => ({ url }) as RouterStateSnapshot;

describe('langGuard', () => {
  let languageService: LanguageService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [LanguageService, provideRouter([])],
    }).compileComponents();

    languageService = TestBed.inject(LanguageService);
    localStorage.removeItem('blog-language');
  });

  it('sets ENGLISH and allows navigation when lang param is missing', () => {
    const result = TestBed.runInInjectionContext(() =>
      langGuard(routeWithLang(null), stateWithUrl('/post'))
    );

    expect(result).toBe(true);
    expect(languageService.language()).toBe('ENGLISH');
  });

  it('syncs ENGLISH when the language was PORTUGUESE', () => {
    languageService.setLanguage('PORTUGUESE');

    const result = TestBed.runInInjectionContext(() =>
      langGuard(routeWithLang(null), stateWithUrl('/post'))
    );

    expect(result).toBe(true);
    expect(languageService.language()).toBe('ENGLISH');
  });

  it('keeps PORTUGUESE and allows navigation for pt', () => {
    const result = TestBed.runInInjectionContext(() =>
      langGuard(routeWithLang('pt'), stateWithUrl('/pt/post'))
    );

    expect(result).toBe(true);
    expect(languageService.language()).toBe('PORTUGUESE');
  });

  it('redirects en to the same route without the prefix', () => {
    const result = TestBed.runInInjectionContext(() =>
      langGuard(routeWithLang('en'), stateWithUrl('/en/post/my-post'))
    ) as UrlTree;

    expect(result.toString()).toBe('/post/my-post');
  });

  it('redirects invalid lang codes to the root', () => {
    const result = TestBed.runInInjectionContext(() =>
      langGuard(routeWithLang('xyz'), stateWithUrl('/xyz'))
    ) as UrlTree;

    expect(result.toString()).toBe('/');
  });

  it('redirects en root to the root without the prefix', () => {
    const result = TestBed.runInInjectionContext(() =>
      langGuard(routeWithLang('en'), stateWithUrl('/en'))
    ) as UrlTree;

    expect(result.toString()).toBe('/');
  });

  it('preserves query params when stripping the prefix', () => {
    const result = TestBed.runInInjectionContext(() =>
      langGuard(routeWithLang('en'), stateWithUrl('/en/post/my-post?ref=nav'))
    ) as UrlTree;

    expect(result.toString()).toBe('/post/my-post?ref=nav');
  });
});

describe('langGuard wiring on public routes', () => {
  const barePublicPaths = ['', 'post', 'post/:slug', 'project', 'project/:slug'];

  it('guards every no-prefix public route', () => {
    const bareRoutes = routes.filter((route: Route) => barePublicPaths.includes(route.path!));

    expect(bareRoutes).toHaveLength(barePublicPaths.length);
    for (const route of bareRoutes) {
      expect(route.canActivate).toContain(langGuard);
    }
  });

  it('guards every lang-prefixed public route', () => {
    const prefixedRoutes = routes.filter((route: Route) => route.path!.split('/')[0] === ':lang');

    expect(prefixedRoutes).toHaveLength(barePublicPaths.length);
    for (const route of prefixedRoutes) {
      expect(route.canActivate).toContain(langGuard);
    }
  });

  it('does not guard auth or dashboard routes', () => {
    const unguardedPaths = ['login', 'signup', 'dashboard/post', 'dashboard/featured'];

    for (const path of unguardedPaths) {
      const route = routes.find((candidate: Route) => candidate.path === path);
      expect(route?.canActivate).not.toContain(langGuard);
    }
  });
});
