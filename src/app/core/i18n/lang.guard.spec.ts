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
  const publicParent = routes.find((route: Route) => route.path === '' && !!route.children)!;
  const langParent = routes.find((route: Route) => route.path === ':lang')!;
  const dashboardParent = routes.find((route: Route) => route.path === 'dashboard')!;

  it('guards every no-prefix public route', () => {
    expect(publicParent.children).toBeDefined();
    for (const path of barePublicPaths) {
      const child = publicParent.children!.find((child: Route) => child.path === path);
      expect(child?.canActivate).toContain(langGuard);
    }
  });

  it('guards the lang-prefixed parent which mirrors public routes', () => {
    expect(langParent.canActivate).toContain(langGuard);
    expect(langParent.children!.map((child: Route) => child.path)).toEqual(barePublicPaths);
  });

  it('does not guard login, signup or dashboard children with langGuard', () => {
    for (const path of ['login', 'signup']) {
      const child = publicParent.children!.find((candidate: Route) => candidate.path === path);
      expect(child?.canActivate).not.toContain(langGuard);
    }

    expect(dashboardParent.canActivate).not.toContain(langGuard);
    expect(dashboardParent.children?.length).toBe(10);
    for (const child of dashboardParent.children!) {
      expect(child.canActivate).not.toContain(langGuard);
    }
  });
});
