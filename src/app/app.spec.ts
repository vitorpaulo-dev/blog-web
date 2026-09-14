import { TestBed } from '@angular/core/testing';
import { App } from './app';
import { provideTaiga } from '@taiga-ui/core';
import { PostService } from './features/posts/data-access/post.service';
import { LanguageService } from './core/i18n/language.service';
import { of } from 'rxjs';
import { Component } from '@angular/core';
import { provideRouter, Router, Routes } from '@angular/router';

@Component({ selector: 'app-test-page', template: '' })
class TestPageComponent {}

const testRoutes: Routes = [
  { path: 'post/:slug', component: TestPageComponent },
  { path: 'pt', children: [{ path: '', component: TestPageComponent }, { path: 'post/:slug', component: TestPageComponent }] },
  { path: 'login', component: TestPageComponent },
  { path: '', component: TestPageComponent },
];

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

describe('App', () => {
  let postServiceMock: PostService;
  let languageServiceMock: LanguageService;

  beforeEach(async () => {
    postServiceMock = {
      search: vi.fn().mockReturnValue(of({ content: [] })),
    } as unknown as PostService;

    languageServiceMock = {
      language: vi.fn().mockReturnValue('ENGLISH'),
      setLanguage: vi.fn(),
      prefixed: vi.fn((path: string) => path),
    } as unknown as LanguageService;

    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideTaiga(),
        provideRouter(testRoutes),
        { provide: PostService, useValue: postServiceMock },
        { provide: LanguageService, useValue: languageServiceMock },
      ],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should have language service injected', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app.languageService).toBeTruthy();
  });

  it('should have post service injected', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app.postService).toBeTruthy();
  });

  it('should render header', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('header')).toBeTruthy();
  });

  it('should have language dropdown button', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    const buttons = compiled.querySelectorAll('button');
    expect(buttons.length).toBeGreaterThan(0);
  });

  describe('switchLanguage', () => {
    let router: Router;
    let app: App;
    let fixture: ReturnType<typeof TestBed.createComponent<App>>;

    beforeEach(async () => {
      fixture = TestBed.createComponent(App);
      app = fixture.componentInstance;
      router = TestBed.inject(Router);
      await fixture.whenStable();
    });

    const setInitialLanguage = (language: 'ENGLISH' | 'PORTUGUESE'): void => {
      vi.mocked(languageServiceMock.language).mockReturnValue(language);
    };

    it('should swap /post/my-post to /pt/post/my-post', async () => {
      await router.navigateByUrl('/post/my-post');
      app['switchLanguage']('PORTUGUESE');
      await fixture.whenStable();
      expect(router.url).toBe('/pt/post/my-post');
      expect(app.languageService.setLanguage).not.toHaveBeenCalled();
    });

    it('should swap /pt/post/my-post to /post/my-post', async () => {
      setInitialLanguage('PORTUGUESE');
      await router.navigateByUrl('/pt/post/my-post');
      app['switchLanguage']('ENGLISH');
      await fixture.whenStable();
      expect(router.url).toBe('/post/my-post');
      expect(app.languageService.setLanguage).not.toHaveBeenCalled();
    });

    it('should swap / to /pt', async () => {
      await router.navigateByUrl('/');
      app['switchLanguage']('PORTUGUESE');
      await fixture.whenStable();
      expect(router.url).toBe('/pt');
      expect(app.languageService.setLanguage).not.toHaveBeenCalled();
    });

    it('should swap /pt to /', async () => {
      setInitialLanguage('PORTUGUESE');
      await router.navigateByUrl('/pt');
      app['switchLanguage']('ENGLISH');
      await fixture.whenStable();
      expect(router.url).toBe('/');
      expect(app.languageService.setLanguage).not.toHaveBeenCalled();
    });

    it('should preserve query params after the swap', async () => {
      await router.navigateByUrl('/post/my-post?ref=nav&page=2');
      app['switchLanguage']('PORTUGUESE');
      await fixture.whenStable();
      expect(router.url).toBe('/pt/post/my-post?ref=nav&page=2');
    });

    it('should preserve hash fragment after the swap', async () => {
      await router.navigateByUrl('/post/my-post#comments');
      app['switchLanguage']('PORTUGUESE');
      await fixture.whenStable();
      expect(router.url).toBe('/pt/post/my-post#comments');
    });

    it('should preserve query params and hash together after the swap', async () => {
      await router.navigateByUrl('/post/my-post?ref=nav#comments');
      app['switchLanguage']('PORTUGUESE');
      await fixture.whenStable();
      expect(router.url).toBe('/pt/post/my-post?ref=nav#comments');
    });

    it('should fall back to setLanguage on non-public routes', async () => {
      await router.navigateByUrl('/login');
      app['switchLanguage']('PORTUGUESE');
      await fixture.whenStable();
      expect(app.languageService.setLanguage).toHaveBeenCalledWith('PORTUGUESE');
      expect(router.url).toBe('/login');
    });

    it('should do nothing when target equals current language', async () => {
      await router.navigateByUrl('/post/my-post');
      app['switchLanguage']('ENGLISH');
      await fixture.whenStable();
      expect(router.url).toBe('/post/my-post');
      expect(app.languageService.setLanguage).not.toHaveBeenCalled();
    });
  });
});
