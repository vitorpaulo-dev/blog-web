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
import { never, of, Subject } from 'rxjs';
import { makeStateKey, PLATFORM_ID, signal, TransferState } from '@angular/core';
import { TurnstileService } from '../../../../core/captcha/turnstile.service';
import { SeoService } from '../../../../core/seo/seo.service';
import { GenericPageableResponse, PostDto } from '../../../posts/data-access/post.service';
import { TagDto, TagService } from '../../../tags/data-access/tag.service';

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
  let seoServiceMock: { setPageMeta: ReturnType<typeof vi.fn>; setArticleTags: ReturnType<typeof vi.fn>; setTitle: ReturnType<typeof vi.fn> };

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

    seoServiceMock = {
      setPageMeta: vi.fn(),
      setArticleTags: vi.fn(),
      setTitle: vi.fn(),
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
        { provide: SeoService, useValue: seoServiceMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(HomePageComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('loads the avatar eagerly as a sized LCP image with an accessible name', () => {
    (postServiceMock.search as any).mockReturnValue(of({ content: [], totalPages: 0, totalElements: 0 }));
    fixture.detectChanges();

    const avatar = fixture.nativeElement.querySelector('img[src="vitor-avatar.webp"]') as HTMLImageElement;
    expect(avatar.getAttribute('alt')).toBe('Vitor Paulo');
    expect(avatar.getAttribute('width')).toBe('800');
    expect(avatar.getAttribute('height')).toBe('800');
    expect(avatar.getAttribute('fetchpriority')).toBe('high');
    expect(avatar.getAttribute('loading')).toBeNull();
  });

  it('associates newsletter inputs with their visible labels', () => {
    (postServiceMock.search as any).mockReturnValue(of({ content: [], totalPages: 0, totalElements: 0 }));
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const email = compiled.querySelector('input[formcontrolname="email"]');
    const language = compiled.querySelector('input[formcontrolname="language"]');
    const emailLabel = compiled.querySelector('#newsletter-email-label');
    const languageLabel = compiled.querySelector('#newsletter-language-label');

    expect(emailLabel?.textContent).toContain('Email');
    expect(languageLabel?.textContent).toContain('Language');
    expect(email?.getAttribute('aria-labelledby')).toBe('newsletter-email-label');
    expect(language?.getAttribute('aria-labelledby')).toBe('newsletter-language-label');
  });

  it('sets home meta on init', () => {
    (postServiceMock.search as any).mockReturnValue(of({ content: [], totalPages: 0, totalElements: 0 }));

    fixture.detectChanges();

    expect(seoServiceMock.setPageMeta).toHaveBeenCalledWith({
      home: true,
      description:
        'I write about programming, technology, and the projects I build, sharing things I learn, experiments I try, and ideas I find interesting along the way.',
    });
  });

  it('should show error toast when loading posts fails', async () => {
    (postServiceMock.search as any).mockReturnValue(throwError(() => new Error('Failed')));

    fixture.detectChanges();

    await vi.waitFor(() =>
      expect(toastServiceMock.open).toHaveBeenCalledWith('Failed to load posts. Please try again.', {
        appearance: 'error',
        autoClose: 5000,
        data: '@tui.circle-x',
      }),
    );
  });

  it('should load posts successfully', async () => {
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

    await vi.waitFor(() => {
      expect(component.posts().length).toBe(1);
      expect(component.postsLoading()).toBe(false);
    });
  });

  it('should show all featured posts when featured list is not empty', async () => {
    (postServiceMock.search as any).mockReturnValue(of({ content: [], totalPages: 0, totalElements: 0 }));
    (postServiceMock.getFeatured as any).mockReturnValue(of([
      { id: 'f1', slug: 'featured-post', tagIds: [], translations: { ENGLISH: { title: 'Featured', content: '' } } },
      { id: 'f2', slug: 'second', tagIds: [], translations: { ENGLISH: { title: 'Second', content: '' } } },
    ]));

    fixture.detectChanges();
    await vi.waitFor(() => expect(component.featured().length).toBe(2));
    fixture.detectChanges();

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

  it('renders three skeleton cards instead of content cards while recent posts load', () => {
    (postServiceMock.search as any).mockReturnValue(new Subject());

    fixture.detectChanges();

    const html = fixture.nativeElement as HTMLElement;
    expect(component.postsLoading()).toBe(true);
    expect(html.querySelectorAll('[aria-hidden="true"] [tuiSkeleton]').length).toBeGreaterThan(0);
    expect(html.querySelectorAll('[tuiSkeleton].aspect-video')).toHaveLength(3);
    expect(html.querySelector('app-content-card')).toBeNull();
  });

  it('removes skeletons and renders content cards after recent posts load', async () => {
    (postServiceMock.search as any).mockReturnValue(
      of({
        content: [
          {
            id: '1',
            slug: 'test-post',
            tagIds: [],
            translations: { ENGLISH: { title: 'Test Post', content: 'Content' } },
          },
        ],
        totalPages: 1,
        totalElements: 1,
      }),
    );

    fixture.detectChanges();
    await vi.waitFor(() => expect(component.postsLoading()).toBe(false));
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('[tuiSkeleton]')).toHaveLength(0);
    expect(fixture.nativeElement.querySelector('app-content-card')).toBeTruthy();
  });
});

function homeTestBed(platformId: 'browser' | 'server', language: 'ENGLISH' | 'PORTUGUESE' = 'ENGLISH') {
  const recentResponse = {
    content: [{ id: '1', slug: 'server-post', tagIds: ['t1'], translations: { ENGLISH: { title: 'Server Post', content: 'X' } } }],
    totalPages: 1,
    totalElements: 1,
  };
  const featuredResponse = [{ id: 'f1', slug: 'featured-post', tagIds: [], translations: { ENGLISH: { title: 'Featured', content: '' } } }];
  const tagsResponse = [{ id: 't1', slug: 'angular', translations: { ENGLISH: { name: 'Angular' } } }];

  const postServiceMock = {
    search: vi.fn().mockReturnValue(of(recentResponse)),
    getFeatured: vi.fn().mockReturnValue(of(featuredResponse)),
  };
  const tagServiceMock = { batch: vi.fn().mockReturnValue(of(tagsResponse)) };
  const toastServiceMock = { open: vi.fn().mockReturnValue(of(true)) };
  const languageServiceMock = {
    language: signal(language as any),
    setLanguage: vi.fn(),
    prefixed: (path: string) => path,
  };

  TestBed.configureTestingModule({
    imports: [HomePageComponent],
    providers: [
      provideTaiga(),
      provideRouter([]),
      { provide: PLATFORM_ID, useValue: platformId },
      { provide: PostService, useValue: postServiceMock },
      { provide: TagService, useValue: tagServiceMock },
      { provide: NewsletterService, useValue: { subscribe: vi.fn() } },
      { provide: LanguageService, useValue: languageServiceMock },
      translationProvider(),
      { provide: TuiToastService, useValue: toastServiceMock },
      { provide: TurnstileService, useValue: { getToken: vi.fn().mockResolvedValue('t'), reset: vi.fn() } },
      { provide: SeoService, useValue: { setPageMeta: vi.fn(), setArticleTags: vi.fn(), setTitle: vi.fn() } },
    ],
  });

  return { postServiceMock, tagServiceMock, toastServiceMock, languageServiceMock };
}

describe('HomePageComponent (server platform)', () => {
  let mocks: ReturnType<typeof homeTestBed>;
  let fixture: ComponentFixture<HomePageComponent>;

  beforeEach(() => {
    mocks = homeTestBed('server');
    fixture = TestBed.createComponent(HomePageComponent);
  });

  it('fetches recent, featured and tags during server rendering and seeds the transfer state', async () => {
    fixture.detectChanges();
    await fixture.whenStable();

    expect(mocks.postServiceMock.search).toHaveBeenCalledTimes(1);
    expect(mocks.postServiceMock.getFeatured).toHaveBeenCalledWith('ENGLISH');
    expect(mocks.tagServiceMock.batch).toHaveBeenCalledWith(['t1']);

    const transferState = TestBed.inject(TransferState);
    expect(
      transferState.get(makeStateKey<GenericPageableResponse<PostDto>>('home-recent'), null)
        ?.content.map((post) => post.slug),
    ).toEqual(['server-post']);
    expect(
      transferState.get(makeStateKey<PostDto[]>('home-featured'), null)?.map((post) => post.slug),
    ).toEqual(['featured-post']);
    expect(
      transferState.get(makeStateKey<TagDto[]>('home-tags'), null)?.map((tag) => tag.id),
    ).toEqual(['t1']);
  });

  it('keeps skeletons and skips toasts when the server fetch fails', async () => {
    mocks.postServiceMock.search.mockReturnValue(throwError(() => new Error('api down')));

    fixture.detectChanges();
    await fixture.whenStable();

    expect(mocks.toastServiceMock.open).not.toHaveBeenCalled();
    expect(fixture.componentInstance.postsLoading()).toBe(true);
    expect(
      TestBed.inject(TransferState).get(makeStateKey<GenericPageableResponse<PostDto>>('home-recent'), null),
    ).toBeNull();
  });
});

describe('HomePageComponent (server language)', () => {
  it('requests featured posts in the route language', async () => {
    const mocks = homeTestBed('server', 'PORTUGUESE');
    const fixture = TestBed.createComponent(HomePageComponent);

    fixture.detectChanges();
    await fixture.whenStable();

    expect(mocks.postServiceMock.getFeatured).toHaveBeenCalledWith('PORTUGUESE');
  });
});

describe('HomePageComponent (hydration seed)', () => {
  function seedHomeTransferState(mocks: ReturnType<typeof homeTestBed>): void {
    const transferState = TestBed.inject(TransferState);
    transferState.set(makeStateKey<GenericPageableResponse<PostDto>>('home-recent'), {
      content: [{ id: '1', slug: 'seeded-post', tagIds: ['t1'], translations: { ENGLISH: { title: 'Seeded', content: 'X' } } }],
      totalPages: 1,
      totalElements: 1,
    } as unknown as GenericPageableResponse<PostDto>);
    transferState.set(makeStateKey<PostDto[]>('home-featured'), [
      { id: 'f1', slug: 'seeded-featured', tagIds: [], translations: { ENGLISH: { title: 'SF', content: '' } } },
    ] as unknown as PostDto[]);
    transferState.set(makeStateKey<TagDto[]>('home-tags'), [
      { id: 't1', slug: 'angular', translations: { ENGLISH: { name: 'Angular' } } },
    ] as unknown as TagDto[]);
    mocks.postServiceMock.search.mockReturnValue(never());
    mocks.postServiceMock.getFeatured.mockReturnValue(never());
  }

  it('hydrates from the server seed without refetching', async () => {
    const mocks = homeTestBed('browser');
    seedHomeTransferState(mocks);

    const fixture = TestBed.createComponent(HomePageComponent);
    fixture.detectChanges();

    expect(mocks.postServiceMock.search).not.toHaveBeenCalled();
    expect(mocks.postServiceMock.getFeatured).not.toHaveBeenCalled();
    expect(fixture.componentInstance.posts().map((post) => post.slug)).toEqual(['seeded-post']);
    expect(fixture.componentInstance.featured().map((post) => post.slug)).toEqual(['seeded-featured']);
    expect(fixture.componentInstance.tagMap().size).toBe(1);
    expect(fixture.componentInstance.postsLoading()).toBe(false);
  });

  it('refetches on language change after the seed was consumed', async () => {
    const mocks = homeTestBed('browser');
    seedHomeTransferState(mocks);

    const fixture = TestBed.createComponent(HomePageComponent);
    fixture.detectChanges();
    expect(mocks.postServiceMock.search).not.toHaveBeenCalled();

    mocks.postServiceMock.search.mockReturnValue(
      of({ content: [{ id: '9', slug: 'fresh-post', tagIds: [], translations: { ENGLISH: { title: 'Fresh', content: 'X' } } }], totalPages: 1, totalElements: 1 }),
    );
    mocks.postServiceMock.getFeatured.mockReturnValue(of([]));
    mocks.languageServiceMock.language.set('PORTUGUESE');
    fixture.detectChanges();
    await fixture.whenStable();

    expect(mocks.postServiceMock.search).toHaveBeenCalledTimes(1);
    expect(fixture.componentInstance.posts().map((post) => post.slug)).toEqual(['fresh-post']);
  });

  it('loads featured from the client when only the recent section is seeded', async () => {
    const mocks = homeTestBed('browser');
    TestBed.inject(TransferState).set(makeStateKey<GenericPageableResponse<PostDto>>('home-recent'), {
      content: [{ id: '1', slug: 'seeded-post', tagIds: [], translations: { ENGLISH: { title: 'Seeded', content: 'X' } } }],
      totalPages: 1,
      totalElements: 1,
    } as unknown as GenericPageableResponse<PostDto>);

    const fixture = TestBed.createComponent(HomePageComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(mocks.postServiceMock.search).not.toHaveBeenCalled();
    expect(mocks.postServiceMock.getFeatured).toHaveBeenCalledTimes(1);
    expect(fixture.componentInstance.posts().map((post) => post.slug)).toEqual(['seeded-post']);
    expect(fixture.componentInstance.featured().map((post) => post.slug)).toEqual(['featured-post']);
  });

  it('loads recent from the client when only the featured section is seeded', async () => {
    const mocks = homeTestBed('browser');
    TestBed.inject(TransferState).set(makeStateKey<PostDto[]>('home-featured'), [
      { id: 'f1', slug: 'seeded-featured', tagIds: [], translations: { ENGLISH: { title: 'SF', content: '' } } },
    ] as unknown as PostDto[]);

    const fixture = TestBed.createComponent(HomePageComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(mocks.postServiceMock.getFeatured).not.toHaveBeenCalled();
    expect(mocks.postServiceMock.search).toHaveBeenCalledTimes(1);
    expect(fixture.componentInstance.featured().map((post) => post.slug)).toEqual(['seeded-featured']);
    expect(fixture.componentInstance.posts().map((post) => post.slug)).toEqual(['server-post']);
  });
});
