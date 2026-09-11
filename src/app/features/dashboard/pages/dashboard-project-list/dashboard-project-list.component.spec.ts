import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DashboardProjectListComponent } from './dashboard-project-list.component';
import { provideTaiga, TuiDialogService } from '@taiga-ui/core';
import { provideRouter } from '@angular/router';
import { ProjectService } from '../../../projects/data-access/project.service';
import { LanguageService } from '../../../../core/i18n/language.service';
import { TuiToastService } from '@taiga-ui/kit';
import { of, throwError } from 'rxjs';
import { PLATFORM_ID, signal } from '@angular/core';

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

describe('DashboardProjectListComponent', () => {
  let component: DashboardProjectListComponent;
  let fixture: ComponentFixture<DashboardProjectListComponent>;
  let projectServiceMock: Partial<ProjectService>;
  let languageServiceMock: Partial<LanguageService>;
  let toastServiceMock: Partial<TuiToastService>;
  let dialogServiceMock: Partial<TuiDialogService>;

  beforeEach(async () => {
    projectServiceMock = {
      search: vi.fn(),
      delete: vi.fn(),
    };

    languageServiceMock = {
      language: signal('ENGLISH' as any),
      setLanguage: vi.fn(),
    };

    toastServiceMock = {
      open: vi.fn().mockReturnValue(of(true)),
    };

    dialogServiceMock = {
      open: vi.fn().mockReturnValue(of(true)),
    };

    await TestBed.configureTestingModule({
      imports: [DashboardProjectListComponent],
      providers: [
        provideTaiga(),
        provideRouter([]),
        { provide: ProjectService, useValue: projectServiceMock },
        { provide: LanguageService, useValue: languageServiceMock },
        { provide: TuiToastService, useValue: toastServiceMock },
        { provide: TuiDialogService, useValue: dialogServiceMock },
        { provide: PLATFORM_ID, useValue: 'browser' },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardProjectListComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should not load projects during SSR', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [DashboardProjectListComponent],
      providers: [
        provideTaiga(),
        provideRouter([]),
        { provide: ProjectService, useValue: projectServiceMock },
        { provide: LanguageService, useValue: languageServiceMock },
        { provide: TuiToastService, useValue: toastServiceMock },
        { provide: TuiDialogService, useValue: dialogServiceMock },
        { provide: PLATFORM_ID, useValue: 'server' },
      ],
    });

    const serverFixture = TestBed.createComponent(DashboardProjectListComponent);
    const serverComponent = serverFixture.componentInstance;

    serverComponent.load();

    expect(projectServiceMock.search).not.toHaveBeenCalled();
  });

  it('should load projects with search', () => {
    const mockResponse = {
      content: [
        {
          id: '1',
          slug: 'proj-1',
          status: 'PUBLISHED',
          viewCount: 10,
          reactionCount: 5,
          createdAt: '2025-01-01T00:00:00Z',
          authors: [],
          translations: {
            ENGLISH: { title: 'Project One', description: 'Desc' },
          },
        },
      ],
      totalPages: 1,
      totalElements: 1,
    };
    (projectServiceMock.search as any).mockReturnValue(of(mockResponse));

    component.load();

    expect(projectServiceMock.search).toHaveBeenCalled();
    expect(component.projects().length).toBe(1);
    expect(component.loading()).toBe(false);
  });

  it('should set error signal when loading fails', () => {
    (projectServiceMock.search as any).mockReturnValue(throwError(() => new Error('Failed')));

    component.load();

    expect(component.error()).toBe('Failed to load projects.');
    expect(component.loading()).toBe(false);
  });

  it('should not reload on same page', () => {
    (projectServiceMock.search as any).mockReturnValue(of({ content: [], totalPages: 1, totalElements: 0 }));

    component.page.set(0);
    component.onPage(0);

    expect(projectServiceMock.search).not.toHaveBeenCalled();
  });

  it('should reload on page change', () => {
    (projectServiceMock.search as any).mockReturnValue(of({ content: [], totalPages: 3, totalElements: 30 }));

    component.onPage(2);

    expect(component.page()).toBe(2);
    expect(projectServiceMock.search).toHaveBeenCalled();
  });

  it('should show success toast when project is deleted', () => {
    (projectServiceMock.delete as any).mockReturnValue(of({}));
    (projectServiceMock.search as any).mockReturnValue(of({ content: [], totalPages: 1, totalElements: 0 }));

    component.askDeleteOne('test-id');

    expect(dialogServiceMock.open).toHaveBeenCalled();
    expect(toastServiceMock.open).toHaveBeenCalledWith('Project deleted successfully', {
      appearance: 'success',
      autoClose: 3000,
      data: '@tui.check',
    });
  });

  it('should show error toast when delete fails', () => {
    (projectServiceMock.delete as any).mockReturnValue(throwError(() => new Error('Failed')));

    component.askDeleteOne('test-id');

    expect(toastServiceMock.open).toHaveBeenCalledWith('Failed to delete project. Please try again.', {
      appearance: 'error',
      autoClose: 5000,
      data: '@tui.circle-x',
    });
  });

  it('should return project title for current language', () => {
    const project = {
      id: '1',
      slug: 'proj-1',
      translations: {
        ENGLISH: { title: 'English Title', description: '' },
        PORTUGUESE: { title: 'Título Português', description: '' },
      },
    } as any;

    expect(component.projectTitle(project)).toBe('English Title');
  });

  it('should fall back to English title when current language title is empty', () => {
    const project = {
      id: '1',
      slug: 'proj-1',
      translations: {
        ENGLISH: { title: 'English Title', description: '' },
        PORTUGUESE: { title: '', description: '' },
      },
    } as any;

    // Language is ENGLISH by default; PORTUGUESE title is empty → falls back to English
    expect(component.projectTitle(project)).toBe('English Title');
  });
});
