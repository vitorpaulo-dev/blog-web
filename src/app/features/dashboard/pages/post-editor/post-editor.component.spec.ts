import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PostEditorComponent } from './post-editor.component';
import { provideTaiga } from '@taiga-ui/core';
import { provideRouter, Router } from '@angular/router';
import { PostService } from '../../../posts/data-access/post.service';
import { MarkdownService } from '../../../posts/data-access/markdown.service';
import { TuiToastService } from '@taiga-ui/kit';
import { ActivatedRoute } from '@angular/router';
import { of, throwError } from 'rxjs';
import { PLATFORM_ID } from '@angular/core';

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

describe('PostEditorComponent', () => {
  let component: PostEditorComponent;
  let fixture: ComponentFixture<PostEditorComponent>;
  let postServiceMock: Partial<PostService>;
  let markdownServiceMock: Partial<MarkdownService>;
  let toastServiceMock: Partial<TuiToastService>;
  let routerMock: Partial<Router>;

  beforeEach(async () => {
    postServiceMock = {
      getById: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    };

    markdownServiceMock = {
      renderMarkdown: vi.fn().mockResolvedValue('<p>Test</p>'),
    };

    toastServiceMock = {
      open: vi.fn().mockReturnValue(of(true)),
    };

    routerMock = {
      navigate: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [PostEditorComponent],
      providers: [
        provideTaiga(),
        provideRouter([]),
        { provide: PostService, useValue: postServiceMock },
        { provide: MarkdownService, useValue: markdownServiceMock },
        { provide: TuiToastService, useValue: toastServiceMock },
        { provide: Router, useValue: routerMock },
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
    }).compileComponents();

    fixture = TestBed.createComponent(PostEditorComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should not load post during SSR', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [PostEditorComponent],
      providers: [
        provideTaiga(),
        provideRouter([]),
        { provide: PostService, useValue: postServiceMock },
        { provide: MarkdownService, useValue: markdownServiceMock },
        { provide: TuiToastService, useValue: toastServiceMock },
        { provide: Router, useValue: routerMock },
        { provide: PLATFORM_ID, useValue: 'server' },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: {
                get: vi.fn().mockReturnValue('test-id'),
              },
            },
          },
        },
      ],
    });

    const serverFixture = TestBed.createComponent(PostEditorComponent);
    const serverComponent = serverFixture.componentInstance;

    serverComponent.ngOnInit();

    expect(postServiceMock.getById).not.toHaveBeenCalled();
  });

  it('should show error toast and redirect when post not found', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [PostEditorComponent],
      providers: [
        provideTaiga(),
        provideRouter([]),
        { provide: PostService, useValue: postServiceMock },
        { provide: MarkdownService, useValue: markdownServiceMock },
        { provide: TuiToastService, useValue: toastServiceMock },
        { provide: Router, useValue: routerMock },
        { provide: PLATFORM_ID, useValue: 'browser' },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: {
                get: vi.fn().mockReturnValue('test-id'),
              },
            },
          },
        },
      ],
    });

    (postServiceMock.getById as any).mockReturnValue(throwError(() => new Error('Not found')));

    const editFixture = TestBed.createComponent(PostEditorComponent);
    const editComponent = editFixture.componentInstance;

    editComponent.ngOnInit();

    expect(toastServiceMock.open).toHaveBeenCalledWith('Failed to load post. Redirecting to dashboard...', {
      appearance: 'error',
      autoClose: 5000,
      data: '@tui.circle-x',
    });
    expect(routerMock.navigate).toHaveBeenCalledWith(['/dashboard/post']);
  });

  it('should not have success signal (removed)', () => {
    expect((component as any).success).toBeUndefined();
  });

  it('should show success toast when post is created', () => {
    const mockResponse = {
      id: 'new-id',
      slug: 'new-post',
      status: 'DRAFT',
    };
    (postServiceMock.create as any).mockReturnValue(of(mockResponse));

    // Set valid form values
    const forms = component.translationForms();
    forms.ENGLISH.title.setValue('Test Title');
    forms.ENGLISH.content.setValue('Test Content');

    component.save('DRAFT');

    expect(toastServiceMock.open).toHaveBeenCalledWith('Post created successfully', {
      appearance: 'success',
      autoClose: 3000,
      data: '@tui.check',
    });
  });

  it('should show success toast when post is updated', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [PostEditorComponent],
      providers: [
        provideTaiga(),
        provideRouter([]),
        { provide: PostService, useValue: postServiceMock },
        { provide: MarkdownService, useValue: markdownServiceMock },
        { provide: TuiToastService, useValue: toastServiceMock },
        { provide: Router, useValue: routerMock },
        { provide: PLATFORM_ID, useValue: 'browser' },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: {
                get: vi.fn().mockReturnValue('test-id'),
              },
            },
          },
        },
      ],
    });

    const mockPost = {
      id: 'test-id',
      slug: 'test-post',
      status: 'PUBLISHED',
      bannerUrl: '',
      translations: {
        ENGLISH: { title: 'Test', content: 'Content' },
      },
      tags: [],
      projects: [],
    };
    (postServiceMock.getById as any).mockReturnValue(of(mockPost));

    const mockResponse = {
      id: 'test-id',
      slug: 'test-post',
      status: 'PUBLISHED',
    };
    (postServiceMock.update as any).mockReturnValue(of(mockResponse));

    const editFixture = TestBed.createComponent(PostEditorComponent);
    const editComponent = editFixture.componentInstance;

    editComponent.ngOnInit();
    
    // Set valid form values
    const forms = editComponent.translationForms();
    forms.ENGLISH.title.setValue('Updated Title');
    forms.ENGLISH.content.setValue('Updated Content');
    
    editComponent.save('PUBLISHED');

    expect(toastServiceMock.open).toHaveBeenCalledWith('Post updated successfully', {
      appearance: 'success',
      autoClose: 3000,
      data: '@tui.check',
    });
  });

  it('should show error toast when save fails', () => {
    (postServiceMock.create as any).mockReturnValue(throwError(() => new Error('Failed')));

    // Set valid form values
    const forms = component.translationForms();
    forms.ENGLISH.title.setValue('Test Title');
    forms.ENGLISH.content.setValue('Test Content');

    component.save('DRAFT');

    expect(toastServiceMock.open).toHaveBeenCalledWith('Failed to save post. Please try again.', {
      appearance: 'error',
      autoClose: 5000,
      data: '@tui.circle-x',
    });
  });
});
