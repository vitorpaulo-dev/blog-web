import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PostDetailComponent } from './post-detail.component';
import { provideTaiga } from '@taiga-ui/core';
import { provideRouter } from '@angular/router';
import { PostService } from '../../data-access/post.service';
import { LanguageService } from '../../../../core/i18n/language.service';
import { MarkdownService } from '../../data-access/markdown.service';
import { ActivatedRoute, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { TuiToastService } from '@taiga-ui/kit';
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

describe('PostDetailComponent', () => {
  let component: PostDetailComponent;
  let fixture: ComponentFixture<PostDetailComponent>;
  let postServiceMock: Partial<PostService>;
  let languageServiceMock: Partial<LanguageService>;
  let markdownServiceMock: Partial<MarkdownService>;
  let routerMock: Partial<Router>;
  let toastServiceMock: Partial<TuiToastService>;

  beforeEach(async () => {
    postServiceMock = {
      getBySlug: vi.fn(),
    };

    languageServiceMock = {
      language: signal('ENGLISH' as any),
      setLanguage: vi.fn(),
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

    await TestBed.configureTestingModule({
      imports: [PostDetailComponent],
      providers: [
        provideTaiga(),
        provideRouter([]),
        { provide: PostService, useValue: postServiceMock },
        { provide: LanguageService, useValue: languageServiceMock },
        { provide: MarkdownService, useValue: markdownServiceMock },
        { provide: Router, useValue: routerMock },
        { provide: TuiToastService, useValue: toastServiceMock },
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

  it('should show error toast and redirect on API error', () => {
    (postServiceMock.getBySlug as any).mockReturnValue(throwError(() => new Error('Not found')));

    fixture.detectChanges();

    expect(toastServiceMock.open).toHaveBeenCalledWith('Failed to load post. Please try again.', {
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
});
