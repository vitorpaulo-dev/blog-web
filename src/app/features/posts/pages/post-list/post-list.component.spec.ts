import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PostListComponent } from './post-list.component';
import { provideTaiga } from '@taiga-ui/core';
import { provideRouter } from '@angular/router';
import { GenericPageableResponse, PostDto, PostService } from '../../data-access/post.service';
import { TagDto, TagService } from '../../../tags/data-access/tag.service';
import { LanguageService } from '../../../../core/i18n/language.service';
import { translationProvider } from '../../../../core/i18n/testing';
import { throwError } from 'rxjs';
import { TuiToastService } from '@taiga-ui/kit';
import { never, of, Subject } from 'rxjs';
import { makeStateKey, PLATFORM_ID, signal, TransferState } from '@angular/core';
import { SeoService } from '../../../../core/seo/seo.service';

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

describe('PostListComponent', () => {
  let component: PostListComponent;
  let fixture: ComponentFixture<PostListComponent>;
  let postServiceMock: Partial<PostService>;
  let languageServiceMock: Partial<LanguageService>;
  let toastServiceMock: Partial<TuiToastService>;
  let seoServiceMock: { setPageMeta: ReturnType<typeof vi.fn>; setArticleTags: ReturnType<typeof vi.fn>; setTitle: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    postServiceMock = {
      search: vi.fn(),
    };

    languageServiceMock = {
      language: signal('ENGLISH' as any),
      setLanguage: vi.fn(),
      prefixed: (path: string) => path,
    };

    toastServiceMock = {
      open: vi.fn().mockReturnValue(of(true)),
    };

    seoServiceMock = {
      setPageMeta: vi.fn(),
      setArticleTags: vi.fn(),
      setTitle: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [PostListComponent],
      providers: [
        provideTaiga(),
        provideRouter([]),
        { provide: PostService, useValue: postServiceMock },
        { provide: LanguageService, useValue: languageServiceMock },
        translationProvider(),
        { provide: TuiToastService, useValue: toastServiceMock },
        { provide: SeoService, useValue: seoServiceMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PostListComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('sets list meta on init', () => {
    expect(seoServiceMock.setPageMeta).toHaveBeenCalledWith({
      title: 'Posts',
      description: 'All posts on vitorpaulo.dev. Read about software development, programming, and technology.',
    });
  });

  it('should show error toast when loading posts fails', async () => {
    (postServiceMock.search as any).mockReturnValue(throwError(() => new Error('Failed')));

    component.load();

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
          translations: {
            ENGLISH: { title: 'Test Post', content: 'Content' },
          },
        },
      ],
      totalPages: 1,
      totalElements: 1,
    };
    (postServiceMock.search as any).mockReturnValue(of(mockResponse));

    component.load();

    await vi.waitFor(() => {
      expect(component.posts().length).toBe(1);
      expect(component.loading()).toBe(false);
    });
  });

  it('should not have error signal (removed)', () => {
    expect((component as any).error).toBeUndefined();
  });

  it('renders skeleton cards instead of content cards while loading', () => {
    (postServiceMock.search as any).mockReturnValue(new Subject());

    fixture.detectChanges();

    expect(component.loading()).toBe(true);
    expect(fixture.nativeElement.querySelectorAll('[tuiSkeleton]').length).toBeGreaterThan(0);
    expect(fixture.nativeElement.querySelector('app-content-card')).toBeNull();
  });

  it('renders content cards and removes skeletons after posts load', async () => {
    (postServiceMock.search as any).mockReturnValue(
      of({
        content: [
          {
            id: '1',
            slug: 'test-post',
            translations: { ENGLISH: { title: 'Test Post', content: 'Content' } },
          },
        ],
        totalPages: 1,
        totalElements: 1,
      }),
    );

    component.load();
    await vi.waitFor(() => expect(component.loading()).toBe(false));
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('[tuiSkeleton]')).toHaveLength(0);
    expect(fixture.nativeElement.querySelector('app-content-card')).toBeTruthy();
  });
});

function postListTestBed(platformId: 'browser' | 'server') {
  const postServiceMock = {
    search: vi.fn().mockReturnValue(
      of({
        content: [{ id: '1', slug: 'server-post', tagIds: ['t1'], translations: { ENGLISH: { title: 'Server Post', content: 'X' } } }],
        totalPages: 1,
        totalElements: 1,
      }),
    ),
  };
  const tagServiceMock = {
    batch: vi.fn().mockReturnValue(of([{ id: 't1', slug: 'angular', translations: { ENGLISH: { name: 'Angular' } } }])),
  };
  const languageServiceMock = {
    language: signal('ENGLISH' as never),
    setLanguage: vi.fn(),
    prefixed: (path: string) => path,
  };
  const toastServiceMock = { open: vi.fn().mockReturnValue(of(true)) };

  TestBed.configureTestingModule({
    imports: [PostListComponent],
    providers: [
      provideTaiga(),
      provideRouter([]),
      { provide: PLATFORM_ID, useValue: platformId },
      { provide: PostService, useValue: postServiceMock },
      { provide: TagService, useValue: tagServiceMock },
      { provide: LanguageService, useValue: languageServiceMock },
      translationProvider(),
      { provide: TuiToastService, useValue: toastServiceMock },
      { provide: SeoService, useValue: { setPageMeta: vi.fn(), setArticleTags: vi.fn(), setTitle: vi.fn() } },
    ],
  });

  return { postServiceMock, tagServiceMock, toastServiceMock };
}

describe('PostListComponent (server platform)', () => {
  let mocks: ReturnType<typeof postListTestBed>;
  let fixture: ComponentFixture<PostListComponent>;

  beforeEach(() => {
    mocks = postListTestBed('server');
    fixture = TestBed.createComponent(PostListComponent);
  });

  it('fetches during server rendering and seeds the transfer state', async () => {
    fixture.detectChanges();
    await fixture.whenStable();

    expect(mocks.postServiceMock.search).toHaveBeenCalledTimes(1);
    expect(mocks.tagServiceMock.batch).toHaveBeenCalledWith(['t1']);

    const transferState = TestBed.inject(TransferState);
    expect(
      transferState.get(makeStateKey<GenericPageableResponse<PostDto>>('post-list-search'), null)
        ?.content.map((post) => post.slug),
    ).toEqual(['server-post']);
    expect(
      transferState.get(makeStateKey<TagDto[]>('post-list-tags'), null)?.map((tag) => tag.id),
    ).toEqual(['t1']);
  });

  it('renders without toasting and writes no seed when the server fetch fails', async () => {
    mocks.postServiceMock.search.mockReturnValue(throwError(() => new Error('api down')));

    fixture.detectChanges();
    await fixture.whenStable();

    expect(mocks.toastServiceMock.open).not.toHaveBeenCalled();
    expect(fixture.componentInstance.loading()).toBe(false);
    expect(
      TestBed.inject(TransferState).get(makeStateKey<GenericPageableResponse<PostDto>>('post-list-search'), null),
    ).toBeNull();
  });
});

describe('PostListComponent (hydration seed)', () => {
  let mocks: ReturnType<typeof postListTestBed>;

  beforeEach(() => {
    mocks = postListTestBed('browser');
  });

  it('hydrates from the server seed without refetching, then refetches on navigation changes', async () => {
    const transferState = TestBed.inject(TransferState);
    transferState.set(makeStateKey<GenericPageableResponse<PostDto>>('post-list-search'), {
      content: [{ id: '1', slug: 'seeded-post', tagIds: ['t1'], translations: { ENGLISH: { title: 'Seeded Post', content: 'X' } } }],
      totalPages: 1,
      totalElements: 1,
    } as unknown as GenericPageableResponse<PostDto>);
    transferState.set(makeStateKey<TagDto[]>('post-list-tags'), [
      { id: 't1', slug: 'angular', translations: { ENGLISH: { name: 'Angular' } } },
    ] as unknown as TagDto[]);
    mocks.postServiceMock.search.mockReturnValue(never());

    const fixture = TestBed.createComponent(PostListComponent);
    fixture.detectChanges();
    fixture.detectChanges();

    expect(mocks.postServiceMock.search).not.toHaveBeenCalled();
    expect(fixture.componentInstance.posts().map((post) => post.slug)).toEqual(['seeded-post']);
    expect(fixture.componentInstance.tagMap().size).toBe(1);
    expect(fixture.componentInstance.loading()).toBe(false);
    expect(fixture.nativeElement.textContent).toContain('Seeded Post');
  });
});
