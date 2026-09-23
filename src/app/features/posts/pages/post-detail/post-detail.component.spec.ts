import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PostDetailComponent } from './post-detail.component';
import { provideTaiga } from '@taiga-ui/core';
import { provideRouter } from '@angular/router';
import { PostService } from '../../data-access/post.service';
import { LanguageService } from '../../../../core/i18n/language.service';
import { translationProvider } from '../../../../core/i18n/testing';
import { MarkdownService } from '../../data-access/markdown.service';
import { ActivatedRoute, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { TuiToastService } from '@taiga-ui/kit';
import { signal } from '@angular/core';
import { PLATFORM_ID } from '@angular/core';
import { SeoService } from '../../../../core/seo/seo.service';
import { TagService } from '../../../tags/data-access/tag.service';

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

describe('PostDetailComponent', () => {
  let component: PostDetailComponent;
  let fixture: ComponentFixture<PostDetailComponent>;
  let postServiceMock: Partial<PostService>;
  let languageServiceMock: Partial<LanguageService>;
  let markdownServiceMock: Partial<MarkdownService>;
  let routerMock: Partial<Router>;
  let toastServiceMock: Partial<TuiToastService>;
  let tagServiceMock: Partial<TagService>;
  let seoServiceMock: { setPageMeta: ReturnType<typeof vi.fn>; setArticleTags: ReturnType<typeof vi.fn>; setTitle: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    postServiceMock = {
      getBySlug: vi.fn(),
    };

    languageServiceMock = {
      language: signal('ENGLISH' as any),
      setLanguage: vi.fn(),
      prefixed: (path: string) => path,
    };

    markdownServiceMock = {
      renderMarkdown: vi.fn().mockResolvedValue('<p>Test</p>'),
      renderArticle: vi.fn(),
    };

    routerMock = {
      navigate: vi.fn(),
    };

    toastServiceMock = {
      open: vi.fn().mockReturnValue(of(true)),
    };

    tagServiceMock = {
      batch: vi.fn().mockReturnValue(of([])),
    };

    seoServiceMock = {
      setPageMeta: vi.fn(),
      setArticleTags: vi.fn(),
      setTitle: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [PostDetailComponent],
      providers: [
        provideTaiga(),
        provideRouter([]),
        { provide: PostService, useValue: postServiceMock },
        { provide: LanguageService, useValue: languageServiceMock },
        translationProvider(),
        { provide: MarkdownService, useValue: markdownServiceMock },
        { provide: Router, useValue: routerMock },
        { provide: TuiToastService, useValue: toastServiceMock },
        { provide: SeoService, useValue: seoServiceMock },
        { provide: TagService, useValue: tagServiceMock },
        { provide: PLATFORM_ID, useValue: 'browser' },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: {
                get: vi.fn().mockReturnValue('test-post'),
              },
            },
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PostDetailComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('sets meta and article tags from the loaded post', () => {
    (postServiceMock.getBySlug as any).mockReturnValue(
      of({
        id: '1',
        slug: 'test-post',
        bannerUrl: 'https://cdn.example.com/banner.png',
        createdAt: '2026-01-15T00:00:00Z',
        updatedAt: '2026-02-20T00:00:00Z',
        authors: [{ id: 'a1', slug: 'vitor', name: 'Vitor Paulo' }],
        tagIds: ['t1'],
        translations: {
          ENGLISH: { title: 'My Post', content: '# Hello', summary: 'My summary' },
        },
      }),
    );
    (tagServiceMock.batch as any).mockReturnValue(
      of([{ id: 't1', slug: 'angular', translations: { ENGLISH: { name: 'Angular' } } }]),
    );

    fixture.detectChanges();

    expect(seoServiceMock.setPageMeta).toHaveBeenCalledWith({
      title: 'My Post',
      description: 'My summary',
      ogType: 'article',
      image: 'https://cdn.example.com/banner.png',
      publishedTime: '2026-01-15T00:00:00Z',
      modifiedTime: '2026-02-20T00:00:00Z',
      authorName: 'Vitor Paulo',
    });
    expect(seoServiceMock.setArticleTags).toHaveBeenCalledWith(['Angular']);
  });

  it('should show error toast and redirect on API error', () => {
    (postServiceMock.getBySlug as any).mockReturnValue(throwError(() => new Error('Not found')));

    fixture.detectChanges();

    expect(toastServiceMock.open).toHaveBeenCalledWith('Failed to load posts. Please try again.', {
      appearance: 'error',
      autoClose: 5000,
      data: '@tui.circle-x',
    });
    expect(routerMock.navigate).toHaveBeenCalledWith(['']);
  });

  it('should show error toast when markdown rendering fails', async () => {
    (postServiceMock.getBySlug as any).mockReturnValue(
      of({
        id: '1',
        slug: 'test-post',
        translations: {
          ENGLISH: { title: 'Test', content: '# Test' },
        },
      })
    );
    (markdownServiceMock.renderMarkdown as any).mockRejectedValue(new Error('Render failed'));

    fixture.detectChanges();
    await fixture.whenStable();

    expect(toastServiceMock.open).toHaveBeenCalledWith('Sorry, this post could not be rendered.', {
      appearance: 'error',
      autoClose: 5000,
      data: '@tui.circle-x',
    });
  });

  it('should block further react clicks while a react request is pending', async () => {
    (postServiceMock as any).reactTo = vi.fn().mockReturnValue(new Promise(() => {}));

    component.post.set({
      id: '1',
      slug: 'test-post',
      loveCount: 0,
      celebrateCount: 0,
      geniusCount: 0,
      helpCount: 0,
      reactionCount: 0,
    } as any);

    void component.onReact('LOVE');
    await component.onReact('LOVE'); // busy guard: second click resolves without a second request

    expect((postServiceMock as any).reactTo).toHaveBeenCalledTimes(1);
    expect(component.reactionBusy()).toBe(true);
  });

  it('should allow react again only after the pending request completes', async () => {
    let release: (value: unknown) => void;
    (postServiceMock as any).reactTo = vi.fn().mockImplementation(
      () =>
        new Promise((resolve) => {
          release = resolve;
        })
    );

    component.post.set({
      id: '1',
      slug: 'test-post',
      loveCount: 0,
      celebrateCount: 0,
      geniusCount: 0,
      helpCount: 0,
      reactionCount: 0,
    } as any);

    const first = component.onReact('LOVE');
    const second = component.onReact('LOVE'); // blocked: single in-flight submission
    release!({ loveCount: 1, celebrateCount: 0, geniusCount: 0, helpCount: 0, reactionCount: 1 });
    await Promise.all([first, second]);

    expect((postServiceMock as any).reactTo).toHaveBeenCalledWith('test-post', 'LOVE');

    void component.onReact('LOVE'); // new click after completion → new attempt
    expect((postServiceMock as any).reactTo).toHaveBeenCalledTimes(2);
  });

  it('extracts and renders the TOC when the rendered content has headings', async () => {
    (postServiceMock.getBySlug as any).mockReturnValue(
      of({
        id: '1',
        slug: 'test-post',
        translations: {
          ENGLISH: { title: 'Test', content: '## My Section' },
        },
      }),
    );
    (markdownServiceMock.renderMarkdown as any).mockResolvedValue(
      '<h2 id="my-section">My Section</h2><h3 id="nested-part">Nested Part</h3><p>Body</p>',
    );

    fixture.detectChanges();
    await fixture.whenStable();
    await vi.waitFor(() => expect(component.toc().length).toBe(2));
    fixture.detectChanges();

    expect(component.toc()).toEqual([
      { id: 'my-section', text: 'My Section', level: 2 },
      { id: 'nested-part', text: 'Nested Part', level: 3 },
    ]);

    const links = Array.from(
      fixture.nativeElement.querySelectorAll('aside nav a') as HTMLAnchorElement[],
    );
    expect(links.map((link) => link.getAttribute('href'))).toEqual([
      '#my-section',
      '#nested-part',
    ]);
    expect(fixture.nativeElement.textContent).toContain('On this page');
  });

  it('does not render the TOC when the content has no headings', async () => {
    (postServiceMock.getBySlug as any).mockReturnValue(
      of({
        id: '1',
        slug: 'test-post',
        translations: {
          ENGLISH: { title: 'Test', content: 'plain text' },
        },
      }),
    );

    fixture.detectChanges();
    await fixture.whenStable();
    await vi.waitFor(() => expect(component.toc().length).toBe(0));

    expect(component.toc()).toEqual([]);
    expect(fixture.nativeElement.querySelector('aside nav')).toBeNull();
  });

  it('renders the ad banner below the TOC area as a new-tab link', async () => {
    (postServiceMock.getBySlug as any).mockReturnValue(
      of({
        id: '1',
        slug: 'test-post',
        translations: {
          ENGLISH: { title: 'Test', content: 'plain text' },
        },
      }),
    );

    fixture.detectChanges();
    await fixture.whenStable();
    await vi.waitFor(() => expect(component.loading()).toBe(false));
    fixture.detectChanges();

    const adLink: HTMLAnchorElement = fixture.nativeElement.querySelector(
      'aside a[href="https://hypehost.com.br/?aff=78"]',
    );
    expect(adLink).toBeTruthy();
    expect(adLink.target).toBe('_blank');
    expect(adLink.rel).toBe('noopener noreferrer');

    const adImage = adLink.querySelector('img');
    expect(adImage?.getAttribute('src')).toBe('/ads/hypehost-banner.png');
    expect(adImage?.alt).toBe('Advertisement');
  });

  it('smooth-scrolls to the heading when a TOC item is clicked', async () => {
    (postServiceMock.getBySlug as any).mockReturnValue(
      of({
        id: '1',
        slug: 'test-post',
        translations: {
          ENGLISH: { title: 'Test', content: '## My Section' },
        },
      }),
    );
    (markdownServiceMock.renderMarkdown as any).mockResolvedValue('<h2 id="my-section">My Section</h2>');

    fixture.detectChanges();
    await fixture.whenStable();
    await vi.waitFor(() => expect(component.toc().length).toBe(1));
    fixture.detectChanges();

    const heading = fixture.nativeElement.querySelector('#my-section');
    const scrollSpy = vi.fn();
    heading.scrollIntoView = scrollSpy;

    const link: HTMLAnchorElement = fixture.nativeElement.querySelector('aside nav a');
    link.dispatchEvent(new MouseEvent('click', { cancelable: true }));

    expect(scrollSpy).toHaveBeenCalledWith({ behavior: 'smooth' });
  });

  it('renders the full TOC expanded with level indentation and no toggles', async () => {
    (postServiceMock.getBySlug as any).mockReturnValue(
      of({
        id: '1',
        slug: 'test-post',
        translations: {
          ENGLISH: { title: 'Test', content: '# Alpha\n## Beta\n### Gamma' },
        },
      }),
    );
    (markdownServiceMock.renderMarkdown as any).mockResolvedValue(
      '<h1 id="alpha">Alpha</h1><h2 id="beta">Beta</h2><h3 id="gamma">Gamma</h3>',
    );

    fixture.detectChanges();
    await fixture.whenStable();
    await vi.waitFor(() => expect(component.toc().length).toBe(3));
    fixture.detectChanges();

    const links = Array.from(
      fixture.nativeElement.querySelectorAll('aside nav a') as HTMLAnchorElement[],
    );
    expect(links.map((link) => link.getAttribute('href'))).toEqual([
      '#alpha',
      '#beta',
      '#gamma',
    ]);

    const itemClasses = links.map((link) => link.parentElement?.className ?? '');
    expect(itemClasses[0]).not.toContain('ml-4');
    expect(itemClasses[1]).toContain('ml-4');
    expect(itemClasses[2]).toContain('ml-8');

    const buttons = fixture.nativeElement.querySelectorAll('aside nav button');
    expect(buttons).toHaveLength(0);
  });
});
