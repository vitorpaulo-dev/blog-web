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
});
