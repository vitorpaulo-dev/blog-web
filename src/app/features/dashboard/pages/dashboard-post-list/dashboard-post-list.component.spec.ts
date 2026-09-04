import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DashboardPostListComponent } from './dashboard-post-list.component';
import { provideTaiga } from '@taiga-ui/core';
import { provideRouter } from '@angular/router';
import { PostService } from '../../../posts/data-access/post.service';
import { LanguageService } from '../../../../core/i18n/language.service';
import { TuiToastService } from '@taiga-ui/kit';
import { TuiDialogService } from '@taiga-ui/core';
import { of, throwError } from 'rxjs';
import { PLATFORM_ID } from '@angular/core';
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

describe('DashboardPostListComponent', () => {
  let component: DashboardPostListComponent;
  let fixture: ComponentFixture<DashboardPostListComponent>;
  let postServiceMock: Partial<PostService>;
  let languageServiceMock: Partial<LanguageService>;
  let toastServiceMock: Partial<TuiToastService>;
  let dialogServiceMock: Partial<TuiDialogService>;

  beforeEach(async () => {
    postServiceMock = {
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
      imports: [DashboardPostListComponent],
      providers: [
        provideTaiga(),
        provideRouter([]),
        { provide: PostService, useValue: postServiceMock },
        { provide: LanguageService, useValue: languageServiceMock },
        { provide: TuiToastService, useValue: toastServiceMock },
        { provide: TuiDialogService, useValue: dialogServiceMock },
        { provide: PLATFORM_ID, useValue: 'browser' },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardPostListComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should not load posts during SSR', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [DashboardPostListComponent],
      providers: [
        provideTaiga(),
        provideRouter([]),
        { provide: PostService, useValue: postServiceMock },
        { provide: LanguageService, useValue: languageServiceMock },
        { provide: TuiToastService, useValue: toastServiceMock },
        { provide: TuiDialogService, useValue: dialogServiceMock },
        { provide: PLATFORM_ID, useValue: 'server' },
      ],
    });

    const serverFixture = TestBed.createComponent(DashboardPostListComponent);
    const serverComponent = serverFixture.componentInstance;

    serverComponent.load();

    expect(postServiceMock.search).not.toHaveBeenCalled();
  });

  it('should show success toast when post is deleted', () => {
    (postServiceMock.delete as any).mockReturnValue(of({}));
    (postServiceMock.search as any).mockReturnValue(of({ content: [], totalPages: 1, totalElements: 0 }));

    component.askDeleteOne('test-id');

    expect(dialogServiceMock.open).toHaveBeenCalled();
    expect(toastServiceMock.open).toHaveBeenCalledWith('Post deleted successfully', {
      appearance: 'success',
      autoClose: 3000,
      data: '@tui.check',
    });
  });

  it('should show error toast when delete fails', () => {
    (postServiceMock.delete as any).mockReturnValue(throwError(() => new Error('Failed')));

    component.askDeleteOne('test-id');

    expect(toastServiceMock.open).toHaveBeenCalledWith('Failed to delete post. Please try again.', {
      appearance: 'error',
      autoClose: 5000,
      data: '@tui.circle-x',
    });
  });

  it('should show success toast when mass delete succeeds', () => {
    component.toggle('id1');
    component.toggle('id2');
    (postServiceMock.delete as any).mockReturnValue(of({}));
    (postServiceMock.search as any).mockReturnValue(of({ content: [], totalPages: 1, totalElements: 0 }));

    component.massDelete();

    expect(dialogServiceMock.open).toHaveBeenCalled();
    expect(toastServiceMock.open).toHaveBeenCalledWith('2 posts deleted successfully', {
      appearance: 'success',
      autoClose: 3000,
      data: '@tui.check',
    });
  });

  it('should show error toast when mass delete fails', () => {
    component.toggle('id1');
    (postServiceMock.delete as any).mockReturnValue(throwError(() => new Error('Failed')));

    component.massDelete();

    expect(toastServiceMock.open).toHaveBeenCalledWith('Failed to delete posts. Please try again.', {
      appearance: 'error',
      autoClose: 5000,
      data: '@tui.circle-x',
    });
  });
});
