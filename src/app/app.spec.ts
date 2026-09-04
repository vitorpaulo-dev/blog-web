import { TestBed } from '@angular/core/testing';
import { App } from './app';
import { provideTaiga } from '@taiga-ui/core';
import { PostService } from './features/posts/data-access/post.service';
import { LanguageService } from './core/i18n/language.service';
import { ClerkService } from './clerk.service';
import { of } from 'rxjs';
import { provideRouter } from '@angular/router';

// Mock matchMedia for Taiga UI
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
  let clerkServiceMock: ClerkService;

  beforeEach(async () => {
    postServiceMock = {
      search: vi.fn().mockReturnValue(of({ content: [] })),
    } as unknown as PostService;

    languageServiceMock = {
      language: vi.fn().mockReturnValue('ENGLISH'),
      setLanguage: vi.fn(),
    } as unknown as LanguageService;

    clerkServiceMock = {
      isSignedIn: vi.fn().mockReturnValue(false),
      init: vi.fn(),
    } as unknown as ClerkService;

    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideTaiga(),
        provideRouter([]),
        { provide: PostService, useValue: postServiceMock },
        { provide: LanguageService, useValue: languageServiceMock },
        { provide: ClerkService, useValue: clerkServiceMock },
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

  it('should have clerk service injected', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app.clerkService).toBeTruthy();
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
});
