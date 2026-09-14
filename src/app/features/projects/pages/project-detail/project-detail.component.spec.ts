import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ProjectDetailComponent } from './project-detail.component';
import { provideTaiga } from '@taiga-ui/core';
import { provideRouter, Router, ActivatedRoute } from '@angular/router';
import { ProjectService } from '../../data-access/project.service';
import { LanguageService } from '../../../../core/i18n/language.service';
import { translationProvider } from '../../../../core/i18n/testing';
import { TuiToastService } from '@taiga-ui/kit';
import { of, throwError } from 'rxjs';
import { signal } from '@angular/core';
import { PLATFORM_ID } from '@angular/core';

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

describe('ProjectDetailComponent', () => {
  let component: ProjectDetailComponent;
  let fixture: ComponentFixture<ProjectDetailComponent>;
  let projectServiceMock: Partial<ProjectService>;
  let languageServiceMock: Partial<LanguageService>;
  let routerMock: Partial<Router>;
  let toastServiceMock: Partial<TuiToastService>;

  beforeEach(async () => {
    projectServiceMock = {
      getBySlug: vi.fn(),
    };

    languageServiceMock = {
      language: signal('ENGLISH' as any),
      setLanguage: vi.fn(),
      prefixed: (path: string) => path,
    };

    routerMock = {
      navigate: vi.fn(),
    };

    toastServiceMock = {
      open: vi.fn().mockReturnValue(of(true)),
    };

    await TestBed.configureTestingModule({
      imports: [ProjectDetailComponent],
      providers: [
        provideTaiga(),
        provideRouter([]),
        { provide: ProjectService, useValue: projectServiceMock },
        { provide: LanguageService, useValue: languageServiceMock },
        translationProvider(),
        { provide: Router, useValue: routerMock },
        { provide: TuiToastService, useValue: toastServiceMock },
        { provide: PLATFORM_ID, useValue: 'browser' },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: {
                get: vi.fn().mockReturnValue('test-project'),
              },
            },
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ProjectDetailComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load project by slug on init', () => {
    const mockProject = {
      id: '1',
      slug: 'test-project',
      logoUrl: null,
      bannerUrl: null,
      githubUrl: null,
      websiteUrl: null,
      programmingLanguage: 'TypeScript',
      status: 'PUBLISHED',
      viewCount: 10,
      reactionCount: 5,
      loveCount: 3,
      celebrateCount: 1,
      geniusCount: 1,
      helpCount: 0,
      createdAt: '2025-01-01T00:00:00Z',
      updatedAt: '2025-01-01T00:00:00Z',
      authors: [],
      translations: {
        ENGLISH: { title: 'Test Project', description: 'A description' },
      },
    };
    (projectServiceMock.getBySlug as any).mockReturnValue(of(mockProject));

    fixture.detectChanges();

    expect(projectServiceMock.getBySlug).toHaveBeenCalledWith('test-project');
    expect(component.project()).toBeTruthy();
    expect(component.project()!.slug).toBe('test-project');
    expect(component.loading()).toBe(false);
  });

  it('should show error toast and redirect on API error', () => {
    (projectServiceMock.getBySlug as any).mockReturnValue(throwError(() => new Error('Not found')));

    fixture.detectChanges();

    expect(toastServiceMock.open).toHaveBeenCalledWith('Failed to load projects. Please try again.', {
      appearance: 'error',
      autoClose: 5000,
      data: '@tui.circle-x',
    });
    expect(routerMock.navigate).toHaveBeenCalledWith(['']);
    expect(component.loading()).toBe(false);
  });

  it('should redirect when slug is null', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [ProjectDetailComponent],
      providers: [
        provideTaiga(),
        provideRouter([]),
        { provide: ProjectService, useValue: projectServiceMock },
        { provide: LanguageService, useValue: languageServiceMock },
        translationProvider(),
        { provide: Router, useValue: routerMock },
        { provide: TuiToastService, useValue: toastServiceMock },
        { provide: PLATFORM_ID, useValue: 'browser' },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: {
                get: vi.fn().mockReturnValue(null),
              },
            },
          },
        },
      ],
    });

    const nullSlugFixture = TestBed.createComponent(ProjectDetailComponent);

    expect(routerMock.navigate).toHaveBeenCalledWith(['']);
  });

  it('should display project content', () => {
    const mockProject = {
      id: '1',
      slug: 'test-project',
      logoUrl: 'https://example.com/logo.png',
      bannerUrl: 'https://example.com/banner.png',
      githubUrl: 'https://github.com/test',
      websiteUrl: 'https://test.com',
      programmingLanguage: 'TypeScript,Angular',
      status: 'PUBLISHED',
      viewCount: 42,
      reactionCount: 10,
      loveCount: 5,
      celebrateCount: 2,
      geniusCount: 2,
      helpCount: 1,
      createdAt: '2025-01-15T00:00:00Z',
      updatedAt: '2025-01-15T00:00:00Z',
      authors: [{ id: 'a1', slug: 'author-1', name: 'Author One', avatarUrl: null }],
      translations: {
        ENGLISH: { title: 'My Project', description: 'Project description' },
      },
    };
    (projectServiceMock.getBySlug as any).mockReturnValue(of(mockProject));

    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('My Project');
    expect(el.textContent).toContain('Project description');
    expect(el.textContent).toContain('42 views');
  });

  it('should show loading state initially', () => {
        expect(component.loading()).toBe(true);
  });

  it('should return content via content() method', () => {
    const mockProject = {
      id: '1',
      slug: 'test-project',
      translations: {
        ENGLISH: { title: 'Test', description: 'Desc' },
      },
    };
    (projectServiceMock.getBySlug as any).mockReturnValue(of(mockProject));

    fixture.detectChanges();

    const content = component.content();
    expect(content).toBeTruthy();
    expect(content!.title).toBe('Test');
  });
});
