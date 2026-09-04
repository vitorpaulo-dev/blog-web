import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HomePageComponent } from './home-page.component';
import { provideTaiga } from '@taiga-ui/core';
import { provideRouter } from '@angular/router';
import { PostService } from '../../../posts/data-access/post.service';
import { LanguageService } from '../../../../core/i18n/language.service';
import { throwError } from 'rxjs';
import { TuiToastService } from '@taiga-ui/kit';
import { of } from 'rxjs';
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

describe('HomePageComponent', () => {
  let component: HomePageComponent;
  let fixture: ComponentFixture<HomePageComponent>;
  let postServiceMock: Partial<PostService>;
  let languageServiceMock: Partial<LanguageService>;
  let toastServiceMock: Partial<TuiToastService>;

  beforeEach(async () => {
    postServiceMock = {
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
      imports: [HomePageComponent],
      providers: [
        provideTaiga(),
        provideRouter([]),
        { provide: PostService, useValue: postServiceMock },
        { provide: LanguageService, useValue: languageServiceMock },
        { provide: TuiToastService, useValue: toastServiceMock },
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
});
