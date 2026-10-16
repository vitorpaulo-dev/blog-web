import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ProjectListComponent } from './project-list.component';
import { provideTaiga } from '@taiga-ui/core';
import { provideRouter } from '@angular/router';
import { ProjectDto, ProjectService } from '../../data-access/project.service';
import { GenericPageableResponse } from '../../../posts/data-access/post.service';
import { TagDto, TagService } from '../../../tags/data-access/tag.service';
import { LanguageService } from '../../../../core/i18n/language.service';
import { translationProvider } from '../../../../core/i18n/testing';
import { TuiToastService } from '@taiga-ui/kit';
import { never, of, Subject, throwError } from 'rxjs';
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

describe('ProjectListComponent', () => {
  let component: ProjectListComponent;
  let fixture: ComponentFixture<ProjectListComponent>;
  let projectServiceMock: Partial<ProjectService>;
  let tagServiceMock: Partial<TagService>;
  let languageServiceMock: Partial<LanguageService>;
  let toastServiceMock: Partial<TuiToastService>;
  let seoServiceMock: { setPageMeta: ReturnType<typeof vi.fn>; setArticleTags: ReturnType<typeof vi.fn>; setTitle: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    projectServiceMock = {
      search: vi.fn(),
    };

    tagServiceMock = {
      batch: vi.fn().mockReturnValue(of([
        { id: '1', slug: 'typescript', translations: { ENGLISH: { name: 'TypeScript' } } },
        { id: '2', slug: 'angular', translations: { ENGLISH: { name: 'Angular' } } },
      ])),
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
      imports: [ProjectListComponent],
      providers: [
        provideTaiga(),
        provideRouter([]),
        { provide: ProjectService, useValue: projectServiceMock },
        { provide: TagService, useValue: tagServiceMock },
        { provide: LanguageService, useValue: languageServiceMock },
        translationProvider(),
        { provide: TuiToastService, useValue: toastServiceMock },
        { provide: SeoService, useValue: seoServiceMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ProjectListComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('sets list meta on init', () => {
    expect(seoServiceMock.setPageMeta).toHaveBeenCalledWith({
      title: 'Projects',
      description:
        'I write about programming, technology, and the projects I build, sharing things I learn, experiments I try, and ideas I find interesting along the way.',
    });
  });

  it('should load projects on init', async () => {
    const mockResponse = {
      content: [
        {
          id: '1',
          slug: 'test-project',
          logoUrl: null,
          bannerUrl: null,
          tagIds: ['1'],
          viewCount: 10,
          createdAt: '2025-01-01T00:00:00Z',
          translations: {
            ENGLISH: { title: 'Test Project', description: 'A description' },
          },
        },
      ],
      totalPages: 1,
      totalElements: 1,
    };
    (projectServiceMock.search as any).mockReturnValue(of(mockResponse));

    component.load();

    expect(projectServiceMock.search).toHaveBeenCalledWith({
      query: {},
      page: 0,
      size: 10,
      sort: 'createdAt',
      direction: 'DESC',
    });
    await vi.waitFor(() => {
      expect(component.projects().length).toBe(1);
      expect(component.loading()).toBe(false);
    });
  });

  it('should show error toast when loading fails', async () => {
    (projectServiceMock.search as any).mockReturnValue(throwError(() => new Error('Failed')));

    component.load();

    await vi.waitFor(() => {
      expect(toastServiceMock.open).toHaveBeenCalledWith('Failed to load projects. Please try again.', {
        appearance: 'error',
        autoClose: 5000,
        data: '@tui.circle-x',
      });
      expect(component.loading()).toBe(false);
    });
  });

  it('should show loading state while fetching', async () => {
    (projectServiceMock.search as any).mockReturnValue(of({ content: [], totalPages: 0, totalElements: 0 }));

    component.load();

    await vi.waitFor(() => expect(component.loading()).toBe(false));
  });

  it('should show empty state when no projects', async () => {
    (projectServiceMock.search as any).mockReturnValue(of({ content: [], totalPages: 0, totalElements: 0 }));

    component.load();

    await vi.waitFor(() => {
      expect(component.projects().length).toBe(0);
      expect(component.totalElements()).toBe(0);
    });
  });

  it('should update page and total pages on load', async () => {
    const mockResponse = {
      content: [],
      totalPages: 5,
      totalElements: 50,
    };
    (projectServiceMock.search as any).mockReturnValue(of(mockResponse));

    component.load();

    await vi.waitFor(() => {
      expect(component.totalPages()).toBe(5);
      expect(component.totalElements()).toBe(50);
    });
  });

  it('should compute cardItems from projects', async () => {
    const mockResponse = {
      content: [
        {
          id: '1',
          slug: 'proj-1',
          logoUrl: 'https://example.com/logo.png',
          bannerUrl: null,
          tagIds: ['1', '2'],
          viewCount: 25,
          createdAt: '2025-03-01T00:00:00Z',
          translations: {
            ENGLISH: { title: 'My Project', description: 'Description text here' },
          },
        },
      ],
      totalPages: 1,
      totalElements: 1,
    };
    (projectServiceMock.search as any).mockReturnValue(of(mockResponse));

    component.load();

    await vi.waitFor(() => {
      const cards = component.cardItems();
      expect(cards.length).toBe(1);
      expect(cards[0].slug).toBe('proj-1');
      expect(cards[0].title).toBe('My Project');
      expect(cards[0].imageUrl).toBe('https://example.com/logo.png');
      expect(cards[0].routePrefix).toBe('/project');
      expect(cards[0].metaText).toBe('25 views');
      expect(cards[0].chips.length).toBe(2);
      expect(cards[0].chips[0].label).toBe('TypeScript');
      expect(cards[0].chips[1].label).toBe('Angular');
    });
  });

  it('renders skeleton cards instead of content cards while loading', () => {
    (projectServiceMock.search as any).mockReturnValue(new Subject());

    fixture.detectChanges();

    expect(component.loading()).toBe(true);
    expect(fixture.nativeElement.querySelectorAll('[tuiSkeleton]').length).toBeGreaterThan(0);
    expect(fixture.nativeElement.querySelector('app-content-card')).toBeNull();
  });

  it('renders content cards and removes skeletons after projects load', async () => {
    (projectServiceMock.search as any).mockReturnValue(
      of({
        content: [
          {
            id: '1',
            slug: 'proj-1',
            translations: { ENGLISH: { title: 'My Project', description: 'Description' } },
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

function projectListTestBed(platformId: 'browser' | 'server') {
  const projectServiceMock = {
    search: vi.fn().mockReturnValue(
      of({
        content: [{ id: '1', slug: 'server-project', logoUrl: null, bannerUrl: null, tagIds: ['t1'], viewCount: 3, createdAt: '2025-01-01T00:00:00Z', translations: { ENGLISH: { title: 'Server Project', description: 'X' } } }],
        totalPages: 1,
        totalElements: 1,
      }),
    ),
  };
  const tagServiceMock = {
    batch: vi.fn().mockReturnValue(of([{ id: 't1', slug: 'angular', translations: { ENGLISH: { name: 'Angular' } } }])),
  };
  const toastServiceMock = { open: vi.fn().mockReturnValue(of(true)) };

  TestBed.configureTestingModule({
    imports: [ProjectListComponent],
    providers: [
      provideTaiga(),
      provideRouter([]),
      { provide: PLATFORM_ID, useValue: platformId },
      { provide: ProjectService, useValue: projectServiceMock },
      { provide: TagService, useValue: tagServiceMock },
      { provide: LanguageService, useValue: { language: signal('ENGLISH' as never), setLanguage: vi.fn(), prefixed: (path: string) => path } },
      translationProvider(),
      { provide: TuiToastService, useValue: toastServiceMock },
      { provide: SeoService, useValue: { setPageMeta: vi.fn(), setArticleTags: vi.fn(), setTitle: vi.fn() } },
    ],
  });

  return { projectServiceMock, tagServiceMock, toastServiceMock };
}

describe('ProjectListComponent (server platform)', () => {
  let mocks: ReturnType<typeof projectListTestBed>;
  let fixture: ComponentFixture<ProjectListComponent>;

  beforeEach(() => {
    mocks = projectListTestBed('server');
    fixture = TestBed.createComponent(ProjectListComponent);
  });

  it('fetches during server rendering and seeds the transfer state', async () => {
    fixture.detectChanges();
    await fixture.whenStable();

    expect(mocks.projectServiceMock.search).toHaveBeenCalledTimes(1);
    expect(mocks.tagServiceMock.batch).toHaveBeenCalledWith(['t1']);

    const transferState = TestBed.inject(TransferState);
    expect(
      transferState.get(makeStateKey<GenericPageableResponse<ProjectDto>>('project-list-search'), null)
        ?.content.map((project) => project.slug),
    ).toEqual(['server-project']);
    expect(
      transferState.get(makeStateKey<TagDto[]>('project-list-tags'), null)?.map((tag) => tag.id),
    ).toEqual(['t1']);
  });

  it('renders without toasting and writes no seed when the server fetch fails', async () => {
    mocks.projectServiceMock.search.mockReturnValue(throwError(() => new Error('api down')));

    fixture.detectChanges();
    await fixture.whenStable();

    expect(mocks.toastServiceMock.open).not.toHaveBeenCalled();
    expect(fixture.componentInstance.loading()).toBe(false);
    expect(
      TestBed.inject(TransferState).get(makeStateKey<GenericPageableResponse<ProjectDto>>('project-list-search'), null),
    ).toBeNull();
  });
});

describe('ProjectListComponent (hydration seed)', () => {
  let mocks: ReturnType<typeof projectListTestBed>;

  beforeEach(() => {
    mocks = projectListTestBed('browser');
  });

  it('hydrates from the server seed without refetching', async () => {
    const transferState = TestBed.inject(TransferState);
    transferState.set(makeStateKey<GenericPageableResponse<ProjectDto>>('project-list-search'), {
      content: [{ id: '1', slug: 'seeded-project', logoUrl: null, bannerUrl: null, tagIds: ['t1'], viewCount: 3, createdAt: '2025-01-01T00:00:00Z', translations: { ENGLISH: { title: 'Seeded Project', description: 'X' } } }],
      totalPages: 1,
      totalElements: 1,
    } as unknown as GenericPageableResponse<ProjectDto>);
    transferState.set(makeStateKey<TagDto[]>('project-list-tags'), [
      { id: 't1', slug: 'angular', translations: { ENGLISH: { name: 'Angular' } } },
    ] as unknown as TagDto[]);
    mocks.projectServiceMock.search.mockReturnValue(never());

    const fixture = TestBed.createComponent(ProjectListComponent);
    fixture.detectChanges();

    expect(mocks.projectServiceMock.search).not.toHaveBeenCalled();
    expect(fixture.componentInstance.projects().map((project) => project.slug)).toEqual(['seeded-project']);
    expect(fixture.componentInstance.tagMap().size).toBe(1);
    expect(fixture.componentInstance.loading()).toBe(false);
    expect(fixture.nativeElement.textContent).toContain('Seeded Project');
  });
});
