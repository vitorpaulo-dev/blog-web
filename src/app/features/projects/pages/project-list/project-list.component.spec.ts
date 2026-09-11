import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ProjectListComponent } from './project-list.component';
import { provideTaiga } from '@taiga-ui/core';
import { provideRouter } from '@angular/router';
import { ProjectService } from '../../data-access/project.service';
import { LanguageService } from '../../../../core/i18n/language.service';
import { TuiToastService } from '@taiga-ui/kit';
import { of, throwError } from 'rxjs';
import { signal } from '@angular/core';

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

describe('ProjectListComponent', () => {
  let component: ProjectListComponent;
  let fixture: ComponentFixture<ProjectListComponent>;
  let projectServiceMock: Partial<ProjectService>;
  let languageServiceMock: Partial<LanguageService>;
  let toastServiceMock: Partial<TuiToastService>;

  beforeEach(async () => {
    projectServiceMock = {
      search: vi.fn(),
    };

    languageServiceMock = {
      language: signal('ENGLISH' as any),
      setLanguage: vi.fn(),
    };

    toastServiceMock = {
      open: vi.fn().mockReturnValue(of(true)),
    };

    await TestBed.configureTestingModule({
      imports: [ProjectListComponent],
      providers: [
        provideTaiga(),
        provideRouter([]),
        { provide: ProjectService, useValue: projectServiceMock },
        { provide: LanguageService, useValue: languageServiceMock },
        { provide: TuiToastService, useValue: toastServiceMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ProjectListComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load projects on init', () => {
    const mockResponse = {
      content: [
        {
          id: '1',
          slug: 'test-project',
          logoUrl: null,
          bannerUrl: null,
          programmingLanguage: 'TypeScript',
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
      query: { language: 'ENGLISH' },
      page: 0,
      size: 10,
      sort: 'createdAt',
      direction: 'DESC',
    });
    expect(component.projects().length).toBe(1);
    expect(component.loading()).toBe(false);
  });

  it('should show error toast when loading fails', () => {
    (projectServiceMock.search as any).mockReturnValue(throwError(() => new Error('Failed')));

    component.load();

    expect(toastServiceMock.open).toHaveBeenCalledWith('Failed to load projects. Please try again.', {
      appearance: 'error',
      autoClose: 5000,
      data: '@tui.circle-x',
    });
    expect(component.loading()).toBe(false);
  });

  it('should show loading state while fetching', () => {
    (projectServiceMock.search as any).mockReturnValue(of({ content: [], totalPages: 0, totalElements: 0 }));

    component.load();

    // After synchronous subscribe, loading should be false
    expect(component.loading()).toBe(false);
  });

  it('should show empty state when no projects', () => {
    (projectServiceMock.search as any).mockReturnValue(of({ content: [], totalPages: 0, totalElements: 0 }));

    component.load();

    expect(component.projects().length).toBe(0);
    expect(component.totalElements()).toBe(0);
  });

  it('should update page and total pages on load', () => {
    const mockResponse = {
      content: [],
      totalPages: 5,
      totalElements: 50,
    };
    (projectServiceMock.search as any).mockReturnValue(of(mockResponse));

    component.load();

    expect(component.totalPages()).toBe(5);
    expect(component.totalElements()).toBe(50);
  });

  it('should compute cardItems from projects', () => {
    const mockResponse = {
      content: [
        {
          id: '1',
          slug: 'proj-1',
          logoUrl: 'https://example.com/logo.png',
          bannerUrl: null,
          programmingLanguage: 'TypeScript,Angular',
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
