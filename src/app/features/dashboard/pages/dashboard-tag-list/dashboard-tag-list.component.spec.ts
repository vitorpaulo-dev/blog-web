import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DashboardTagListComponent } from './dashboard-tag-list.component';
import { provideTaiga } from '@taiga-ui/core';
import { provideRouter } from '@angular/router';
import { TagService } from '../../../tags/data-access/tag.service';
import { LanguageService } from '../../../../core/i18n/language.service';
import { translationProvider } from '../../../../core/i18n/testing';
import { TuiToastService } from '@taiga-ui/kit';
import { TuiDialogService } from '@taiga-ui/core';
import { of, throwError } from 'rxjs';
import { PLATFORM_ID } from '@angular/core';
import { signal } from '@angular/core';

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

describe('DashboardTagListComponent', () => {
  let component: DashboardTagListComponent;
  let fixture: ComponentFixture<DashboardTagListComponent>;
  let tagServiceMock: Partial<TagService>;
  let languageServiceMock: Partial<LanguageService>;
  let toastServiceMock: Partial<TuiToastService>;
  let dialogServiceMock: Partial<TuiDialogService>;

  beforeEach(async () => {
    tagServiceMock = {
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
      imports: [DashboardTagListComponent],
      providers: [
        provideTaiga(),
        provideRouter([]),
        { provide: TagService, useValue: tagServiceMock },
        { provide: LanguageService, useValue: languageServiceMock },
        translationProvider(),
        { provide: TuiToastService, useValue: toastServiceMock },
        { provide: TuiDialogService, useValue: dialogServiceMock },
        { provide: PLATFORM_ID, useValue: 'browser' },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardTagListComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should not load tags during SSR', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [DashboardTagListComponent],
      providers: [
        provideTaiga(),
        provideRouter([]),
        { provide: TagService, useValue: tagServiceMock },
        { provide: LanguageService, useValue: languageServiceMock },
        translationProvider(),
        { provide: TuiToastService, useValue: toastServiceMock },
        { provide: TuiDialogService, useValue: dialogServiceMock },
        { provide: PLATFORM_ID, useValue: 'server' },
      ],
    });

    const serverFixture = TestBed.createComponent(DashboardTagListComponent);
    const serverComponent = serverFixture.componentInstance;

    serverComponent.load();

    expect(tagServiceMock.search).not.toHaveBeenCalled();
  });

  it('should load tags on browser', () => {
    (tagServiceMock.search as any).mockReturnValue(
      of({ content: [{ id: '1', slug: 'java', translations: { ENGLISH: { name: 'Java' } } }], totalPages: 1, totalElements: 1 })
    );

    component.load();

    expect(tagServiceMock.search).toHaveBeenCalled();
    expect(component.tags().length).toBe(1);
    expect(component.loading()).toBe(false);
  });

  it('should set error on load failure', () => {
    (tagServiceMock.search as any).mockReturnValue(throwError(() => new Error('Failed')));

    component.load();

    expect(component.error()).toBe('Failed to load tags.');
    expect(component.loading()).toBe(false);
  });

  it('should show success toast when tag is deleted', () => {
    (tagServiceMock.delete as any).mockReturnValue(of(undefined));
    (tagServiceMock.search as any).mockReturnValue(of({ content: [], totalPages: 1, totalElements: 0 }));

    component.askDeleteOne('test-id');

    expect(dialogServiceMock.open).toHaveBeenCalled();
    expect(toastServiceMock.open).toHaveBeenCalledWith('Tag deleted successfully', {
      appearance: 'success',
      autoClose: 3000,
      data: '@tui.check',
    });
  });

  it('should show error toast when delete fails', () => {
    (tagServiceMock.delete as any).mockReturnValue(throwError(() => new Error('Failed')));

    component.askDeleteOne('test-id');

    expect(toastServiceMock.open).toHaveBeenCalledWith('Failed to delete tag. Please try again.', {
      appearance: 'error',
      autoClose: 5000,
      data: '@tui.circle-x',
    });
  });

  it('should return tag name in current language', () => {
    const tag = {
      id: '1',
      slug: 'java',
      translations: {
        ENGLISH: { name: 'Java' },
        PORTUGUESE: { name: 'Java PT' },
      } as any,
    };

    (languageServiceMock.language as any).set('ENGLISH');
    expect(component.tagName(tag)).toBe('Java');

    (languageServiceMock.language as any).set('PORTUGUESE');
    expect(component.tagName(tag)).toBe('Java PT');
  });

  it('should fallback to English when current language translation missing', () => {
    const tag = {
      id: '1',
      slug: 'java',
      translations: {
        ENGLISH: { name: 'Java' },
      } as any,
    };

    (languageServiceMock.language as any).set('PORTUGUESE');
    expect(component.tagName(tag)).toBe('Java');
  });

  it('should not reload on same page', () => {
    component.page.set(0);
    (tagServiceMock.search as any).mockReturnValue(of({ content: [], totalPages: 1, totalElements: 0 }));

    component.onPage(0);

    expect(tagServiceMock.search).not.toHaveBeenCalled();
  });

  it('should reload on different page', () => {
    component.page.set(0);
    (tagServiceMock.search as any).mockReturnValue(of({ content: [], totalPages: 2, totalElements: 20 }));

    component.onPage(1);

    expect(tagServiceMock.search).toHaveBeenCalled();
    expect(component.page()).toBe(1);
  });
});
