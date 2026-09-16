import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HomePageComponent } from './home-page.component';
import { provideTaiga } from '@taiga-ui/core';
import { provideRouter } from '@angular/router';
import { PostService } from '../../../posts/data-access/post.service';
import { NewsletterService } from '../../../dashboard/data-access/newsletter.service';
import { LanguageService } from '../../../../core/i18n/language.service';
import { translationProvider } from '../../../../core/i18n/testing';
import { throwError } from 'rxjs';
import { TuiToastService } from '@taiga-ui/kit';
import { of } from 'rxjs';
import { signal } from '@angular/core';
import { TurnstileService } from '../../../../core/captcha/turnstile.service';

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

describe('HomePageComponent', () => {
  let component: HomePageComponent;
  let fixture: ComponentFixture<HomePageComponent>;
  let postServiceMock: Partial<PostService>;
  let newsletterServiceMock: Partial<NewsletterService>;
  let languageServiceMock: Partial<LanguageService>;
  let toastServiceMock: Partial<TuiToastService>;
  let turnstileServiceMock: Partial<TurnstileService>;

  beforeEach(async () => {
    postServiceMock = {
      search: vi.fn(),
      getFeatured: vi.fn().mockReturnValue(of([])),
    };

    newsletterServiceMock = {
      subscribe: vi.fn(),
    };

    languageServiceMock = {
      language: signal('ENGLISH' as any),
      setLanguage: vi.fn(),
      prefixed: (path: string) => path,
    };

    toastServiceMock = {
      open: vi.fn().mockReturnValue(of(true)),
    };

    turnstileServiceMock = {
      getToken: vi.fn().mockResolvedValue('captcha-token'),
      reset: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [HomePageComponent],
      providers: [
        provideTaiga(),
        provideRouter([]),
        { provide: PostService, useValue: postServiceMock },
        { provide: NewsletterService, useValue: newsletterServiceMock },
        { provide: LanguageService, useValue: languageServiceMock },
        translationProvider(),
        { provide: TuiToastService, useValue: toastServiceMock },
        { provide: TurnstileService, useValue: turnstileServiceMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(HomePageComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should show error toast when loading posts fails', () => {
    (postServiceMock.search as any).mockReturnValue(throwError(() => new Error('Failed')));

    fixture.detectChanges();

    expect(toastServiceMock.open).toHaveBeenCalledWith('Failed to load posts. Please try again.', {
      appearance: 'error',
      autoClose: 5000,
      data: '@tui.circle-x',
    });
  });

  it('should load posts successfully', () => {
    const mockResponse = {
      content: [
        {
          id: '1',
          slug: 'test-post',
          tagIds: [],
          translations: {
            ENGLISH: { title: 'Test Post', content: 'Content' },
          },
        },
      ],
    };
    (postServiceMock.search as any).mockReturnValue(of(mockResponse));

    fixture.detectChanges();

    expect(component.posts().length).toBe(1);
    expect(component.postsLoading()).toBe(false);
  });

  it('should show all featured posts when featured list is not empty', () => {
    (postServiceMock.search as any).mockReturnValue(of({ content: [], totalPages: 0, totalElements: 0 }));
    (postServiceMock.getFeatured as any).mockReturnValue(of([
      { id: 'f1', slug: 'featured-post', tagIds: [], translations: { ENGLISH: { title: 'Featured', content: '' } } },
      { id: 'f2', slug: 'second', tagIds: [], translations: { ENGLISH: { title: 'Second', content: '' } } },
    ]));

    fixture.detectChanges();

    expect(component.featured().map((post) => post.slug)).toEqual(['featured-post', 'second']);

    const featuredLinks = fixture.nativeElement.querySelectorAll('section[aria-label="Featured"] a');

    expect(featuredLinks.length).toBe(2);
    expect(featuredLinks[0].getAttribute('href')).toBe('/post/featured-post');
    expect(featuredLinks[1].getAttribute('href')).toBe('/post/second');
  });

  it('should hide featured section when featured list is empty', () => {
    (postServiceMock.search as any).mockReturnValue(of({ content: [], totalPages: 0, totalElements: 0 }));
    (postServiceMock.getFeatured as any).mockReturnValue(of([]));

    fixture.detectChanges();

    expect(component.featured()).toEqual([]);
  });

  it('should show unavailable toast and reset turnstile when captcha token is missing', async () => {
    (newsletterServiceMock.subscribe as any).mockReturnValue(of({ id: '1' }));
    (turnstileServiceMock.getToken as any).mockResolvedValue(null);

    component.newsletterForm.setValue({ email: 'reader@example.com', language: 'ENGLISH', frequency: 'EVERY_POST' });
    await component.subscribe();

    expect(newsletterServiceMock.subscribe).not.toHaveBeenCalled();
    expect(toastServiceMock.open).toHaveBeenCalledWith('Captcha unavailable. Please try again.', {
      appearance: 'error',
      autoClose: 5000,
      data: '@tui.circle-x',
    });
    expect(turnstileServiceMock.reset).not.toHaveBeenCalled();
  });
  it('should subscribe, show success toast and reset the form when captcha succeeds', async () => {
    (newsletterServiceMock.subscribe as any).mockReturnValue(of({ id: '1' }));

    component.newsletterForm.setValue({ email: 'reader@example.com', language: 'PORTUGUESE', frequency: 'MONTHLY_DIGEST' });
    await component.subscribe();

    expect(newsletterServiceMock.subscribe).toHaveBeenCalledWith(
      { email: 'reader@example.com', language: 'PORTUGUESE', frequency: 'MONTHLY_DIGEST' },
      'captcha-token',
    );
    expect(toastServiceMock.open).toHaveBeenCalledWith('Subscribed successfully!', {
      appearance: 'success',
      autoClose: 3000,
      data: '@tui.check',
    });
    expect(component.newsletterForm.getRawValue()).toEqual({
      email: '',
      language: 'ENGLISH',
      frequency: 'EVERY_POST',
    });
    expect(turnstileServiceMock.reset).toHaveBeenCalled();
    expect(component.subscribeBusy()).toBe(false);
  });

  it('should show error toast when subscribe fails', async () => {
    (newsletterServiceMock.subscribe as any).mockReturnValue(throwError(() => new Error('Failed')));

    component.newsletterForm.setValue({ email: 'reader@example.com', language: 'ENGLISH', frequency: 'EVERY_POST' });
    await component.subscribe();

    expect(toastServiceMock.open).toHaveBeenCalledWith('Failed to subscribe. Please try again.', {
      appearance: 'error',
      autoClose: 5000,
      data: '@tui.circle-x',
    });
    expect(component.subscribeBusy()).toBe(false);
  });

  it('should reject a second subscribe while one is in flight', async () => {
    (newsletterServiceMock.subscribe as any).mockReturnValue(of({ id: '1' }));
    let resolveToken!: (token: string | null) => void;
    (turnstileServiceMock.getToken as any).mockReturnValue(
      new Promise<string | null>((resolve) => (resolveToken = resolve)),
    );

    component.newsletterForm.setValue({ email: 'reader@example.com', language: 'ENGLISH', frequency: 'EVERY_POST' });

    const firstCall = component.subscribe();

    expect(component.subscribeBusy()).toBe(true);

    await component.subscribe();
    expect(newsletterServiceMock.subscribe).not.toHaveBeenCalled();

    resolveToken('captcha-token');
    await firstCall;
    expect(component.subscribeBusy()).toBe(false);
  });
});
