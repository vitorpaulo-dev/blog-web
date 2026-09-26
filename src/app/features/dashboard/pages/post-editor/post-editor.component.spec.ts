import { ComponentFixture, TestBed } from '@angular/core/testing';
import { translationProvider } from '../../../../core/i18n/testing';
import { PostEditorComponent } from './post-editor.component';
import { provideTaiga } from '@taiga-ui/core';
import { provideRouter, Router } from '@angular/router';
import { PostService } from '../../../posts/data-access/post.service';
import { MarkdownService } from '../../../posts/data-access/markdown.service';
import { ProjectService } from '../../../projects/data-access/project.service';
import { TagService } from '../../../tags/data-access/tag.service';
import { TuiToastService } from '@taiga-ui/kit';
import { ActivatedRoute } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
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
        translationProvider(),
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
        translationProvider(),
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
        translationProvider(),
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
        translationProvider(),
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
      tagIds: [],
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

  it('should bind summary into translations payload', () => {
    const mockResponse = {
      id: 'new-id',
      slug: 'new-post',
      status: 'DRAFT',
    };
    (postServiceMock.create as any).mockReturnValue(of(mockResponse));

    const forms = component.translationForms();
    forms.ENGLISH.title.setValue('Title');
    forms.ENGLISH.content.setValue('Content');
    forms.ENGLISH.summary.setValue('Card summary');

    component.save('DRAFT');

    const payload = (postServiceMock.create as any).mock.calls[0][0];
    expect(payload.translations.ENGLISH.summary).toBe('Card summary');
  });

  it('should populate summary from loaded post', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [PostEditorComponent],
      providers: [
        translationProvider(),
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
      status: 'DRAFT',
      translations: {
        ENGLISH: { title: 'Test', content: 'Content', summary: 'Loaded summary' },
      },
    };
    (postServiceMock.getById as any).mockReturnValue(of(mockPost));

    const editFixture = TestBed.createComponent(PostEditorComponent);
    const editComponent = editFixture.componentInstance;

    editComponent.ngOnInit();

    expect(editComponent.translationForms().ENGLISH.summary.value).toBe('Loaded summary');
  });

  it('should include selected tag ids in the create payload', () => {
    const mockResponse = {
      id: 'new-id',
      slug: 'new-post',
      status: 'DRAFT',
    };
    (postServiceMock.create as any).mockReturnValue(of(mockResponse));

    const forms = component.translationForms();
    forms.ENGLISH.title.setValue('Test Title');
    forms.ENGLISH.content.setValue('Test Content');
    component.form.controls.tags.setValue([
      { id: 'tag-1', name: 'Alpha' },
      { id: 'tag-2', name: 'Beta' },
    ]);

    component.save('DRAFT');

    const payload = (postServiceMock.create as any).mock.calls[0][0];
    expect(payload.tagIds).toEqual(['tag-1', 'tag-2']);
    expect(payload.projectIds).toBeUndefined();
  });

  it('should omit tag ids from the create payload when nothing is selected', () => {
    const mockResponse = {
      id: 'new-id',
      slug: 'new-post',
      status: 'DRAFT',
    };
    (postServiceMock.create as any).mockReturnValue(of(mockResponse));

    const forms = component.translationForms();
    forms.ENGLISH.title.setValue('Test Title');
    forms.ENGLISH.content.setValue('Test Content');

    component.save('DRAFT');

    const payload = (postServiceMock.create as any).mock.calls[0][0];
    expect(payload.tagIds).toBeUndefined();
  });

  it('should keep selected tags when editing a post and send their ids on save', () => {
    TestBed.resetTestingModule();

    const tagServiceMock = {
      search: vi.fn().mockReturnValue(of({ content: [], totalPages: 0, totalElements: 0 })),
      batch: vi.fn().mockReturnValue(
        of([{ id: 'tag-1', slug: 'alpha', translations: { ENGLISH: { name: 'Alpha' } } }])
      ),
    };
    const projectServiceMock = {
      search: vi.fn().mockReturnValue(of({ content: [], totalPages: 0, totalElements: 0 })),
      getByIds: vi.fn().mockReturnValue(of([])),
    };

    TestBed.configureTestingModule({
      imports: [PostEditorComponent],
      providers: [
        translationProvider(),
        provideTaiga(),
        provideRouter([]),
        { provide: PostService, useValue: postServiceMock },
        { provide: MarkdownService, useValue: markdownServiceMock },
        { provide: TagService, useValue: tagServiceMock },
        { provide: ProjectService, useValue: projectServiceMock },
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
      tagIds: ['tag-1'],
      projectIds: [],
    };
    (postServiceMock.getById as any).mockReturnValue(of(mockPost));
    (postServiceMock.update as any).mockReturnValue(
      of({ id: 'test-id', slug: 'test-post', status: 'PUBLISHED' })
    );

    const editFixture = TestBed.createComponent(PostEditorComponent);
    const editComponent = editFixture.componentInstance;

    editComponent.ngOnInit();

    expect(editComponent.form.controls.tags.value).toEqual([{ id: 'tag-1', name: 'Alpha' }]);

    editComponent.save('PUBLISHED');

    const payload = (postServiceMock.update as any).mock.calls[0][1];
    expect(payload.tagIds).toEqual(['tag-1']);
  });

  it('should clear the tag loading flag once tag options arrive', () => {
    TestBed.resetTestingModule();

    const tagSearch$ = new Subject<any>();
    const tagServiceMock = {
      search: vi.fn().mockReturnValue(tagSearch$),
      batch: vi.fn(),
    };
    const projectServiceMock = {
      search: vi.fn().mockReturnValue(of({ content: [], totalPages: 0, totalElements: 0 })),
      getByIds: vi.fn().mockReturnValue(of([])),
    };

    TestBed.configureTestingModule({
      imports: [PostEditorComponent],
      providers: [
        translationProvider(),
        provideTaiga(),
        provideRouter([]),
        { provide: PostService, useValue: postServiceMock },
        { provide: MarkdownService, useValue: markdownServiceMock },
        { provide: TagService, useValue: tagServiceMock },
        { provide: ProjectService, useValue: projectServiceMock },
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
    });

    const editFixture = TestBed.createComponent(PostEditorComponent);
    const editComponent = editFixture.componentInstance;

    expect(editComponent.tagsLoading()).toBe(true);

    editComponent.ngOnInit();

    expect(editComponent.tagsLoading()).toBe(true);

    tagSearch$.next({
      content: [{ id: 'tag-1', slug: 'alpha', translations: { ENGLISH: { name: 'Alpha' } } }],
      totalPages: 1,
      totalElements: 1,
    });

    expect(editComponent.tagsLoading()).toBe(false);
    expect(editComponent.availableTags()).toEqual([{ id: 'tag-1', name: 'Alpha' }]);
  });
});
