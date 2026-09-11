import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ProjectEditorComponent } from './project-editor.component';
import { provideTaiga } from '@taiga-ui/core';
import { provideRouter, Router, ActivatedRoute } from '@angular/router';
import { ProjectService } from '../../../projects/data-access/project.service';
import { UploadService } from '../../../../core/upload/upload.service';
import { TuiToastService } from '@taiga-ui/kit';
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

describe('ProjectEditorComponent', () => {
  let component: ProjectEditorComponent;
  let fixture: ComponentFixture<ProjectEditorComponent>;
  let projectServiceMock: Partial<ProjectService>;
  let uploadServiceMock: Partial<UploadService>;
  let toastServiceMock: Partial<TuiToastService>;
  let routerMock: Partial<Router>;

  beforeEach(async () => {
    projectServiceMock = {
      getById: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    };

    uploadServiceMock = {
      upload: vi.fn(),
    };

    toastServiceMock = {
      open: vi.fn().mockReturnValue(of(true)),
    };

    routerMock = {
      navigate: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [ProjectEditorComponent],
      providers: [
        provideTaiga(),
        provideRouter([]),
        { provide: ProjectService, useValue: projectServiceMock },
        { provide: UploadService, useValue: uploadServiceMock },
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

    fixture = TestBed.createComponent(ProjectEditorComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should not load project during SSR', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [ProjectEditorComponent],
      providers: [
        provideTaiga(),
        provideRouter([]),
        { provide: ProjectService, useValue: projectServiceMock },
        { provide: UploadService, useValue: uploadServiceMock },
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

    const serverFixture = TestBed.createComponent(ProjectEditorComponent);
    const serverComponent = serverFixture.componentInstance;

    serverComponent.ngOnInit();

    expect(projectServiceMock.getById).not.toHaveBeenCalled();
  });

  it('should show error toast and redirect when project not found', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [ProjectEditorComponent],
      providers: [
        provideTaiga(),
        provideRouter([]),
        { provide: ProjectService, useValue: projectServiceMock },
        { provide: UploadService, useValue: uploadServiceMock },
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

    (projectServiceMock.getById as any).mockReturnValue(throwError(() => new Error('Not found')));

    const editFixture = TestBed.createComponent(ProjectEditorComponent);
    const editComponent = editFixture.componentInstance;

    editComponent.ngOnInit();

    expect(toastServiceMock.open).toHaveBeenCalledWith('Failed to load project. Redirecting to dashboard...', {
      appearance: 'error',
      autoClose: 5000,
      data: '@tui.circle-x',
    });
    expect(routerMock.navigate).toHaveBeenCalledWith(['/dashboard/project']);
  });

  it('should report form as invalid when English title is empty', () => {
    expect(component.isFormValid()).toBe(false);
  });

  it('should report form as valid when English title is set', () => {
    const forms = component.translationForms();
    forms.ENGLISH.title.setValue('Valid Title');

    expect(component.isFormValid()).toBe(true);
  });

  it('should show success toast when project is created', () => {
    const mockResponse = {
      id: 'new-id',
      slug: 'new-project',
      status: 'DRAFT',
    };
    (projectServiceMock.create as any).mockReturnValue(of(mockResponse));

    const forms = component.translationForms();
    forms.ENGLISH.title.setValue('New Project');

    component.save('DRAFT');

    expect(projectServiceMock.create).toHaveBeenCalled();
    expect(toastServiceMock.open).toHaveBeenCalledWith('Project created successfully', {
      appearance: 'success',
      autoClose: 3000,
      data: '@tui.check',
    });
  });

  it('should show success toast when project is updated', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [ProjectEditorComponent],
      providers: [
        provideTaiga(),
        provideRouter([]),
        { provide: ProjectService, useValue: projectServiceMock },
        { provide: UploadService, useValue: uploadServiceMock },
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

    const mockProject = {
      id: 'test-id',
      slug: 'test-project',
      logoUrl: null,
      bannerUrl: null,
      githubUrl: null,
      websiteUrl: null,
      programmingLanguage: 'TypeScript',
      status: 'PUBLISHED',
      translations: {
        ENGLISH: { title: 'Original', description: 'Desc' },
      },
    };
    (projectServiceMock.getById as any).mockReturnValue(of(mockProject));

    const mockResponse = {
      id: 'test-id',
      slug: 'test-project',
      status: 'PUBLISHED',
    };
    (projectServiceMock.update as any).mockReturnValue(of(mockResponse));

    const editFixture = TestBed.createComponent(ProjectEditorComponent);
    const editComponent = editFixture.componentInstance;

    editComponent.ngOnInit();

    const forms = editComponent.translationForms();
    forms.ENGLISH.title.setValue('Updated Title');

    editComponent.save('PUBLISHED');

    expect(projectServiceMock.update).toHaveBeenCalledWith('test-id', expect.objectContaining({
      status: 'PUBLISHED',
    }));
    expect(toastServiceMock.open).toHaveBeenCalledWith('Project updated successfully', {
      appearance: 'success',
      autoClose: 3000,
      data: '@tui.check',
    });
  });

  it('should show error toast when save fails', () => {
    (projectServiceMock.create as any).mockReturnValue(throwError(() => new Error('Failed')));

    const forms = component.translationForms();
    forms.ENGLISH.title.setValue('Test Title');

    component.save('DRAFT');

    expect(toastServiceMock.open).toHaveBeenCalledWith('Failed to save project. Please try again.', {
      appearance: 'error',
      autoClose: 5000,
      data: '@tui.circle-x',
    });
  });

  it('should not save when form is invalid', () => {
    component.save('DRAFT');

    expect(projectServiceMock.create).not.toHaveBeenCalled();
  });

  it('should switch active language', () => {
    expect(component.activeLang()).toBe('ENGLISH');

    component.activeLang.set('PORTUGUESE');

    expect(component.activeLang()).toBe('PORTUGUESE');
  });

  it('should navigate back to dashboard', () => {
    component.goBack();

    expect(routerMock.navigate).toHaveBeenCalledWith(['/dashboard/project']);
  });

  it('should load existing project in edit mode', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [ProjectEditorComponent],
      providers: [
        provideTaiga(),
        provideRouter([]),
        { provide: ProjectService, useValue: projectServiceMock },
        { provide: UploadService, useValue: uploadServiceMock },
        { provide: TuiToastService, useValue: toastServiceMock },
        { provide: Router, useValue: routerMock },
        { provide: PLATFORM_ID, useValue: 'browser' },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: {
                get: vi.fn().mockReturnValue('existing-id'),
              },
            },
          },
        },
      ],
    });

    const mockProject = {
      id: 'existing-id',
      slug: 'existing-project',
      logoUrl: 'https://example.com/logo.png',
      bannerUrl: 'https://example.com/banner.png',
      githubUrl: 'https://github.com/test',
      websiteUrl: 'https://test.com',
      tags: [
        { id: 'tag-1', slug: 'typescript', translations: { ENGLISH: { name: 'TypeScript' } } },
        { id: 'tag-2', slug: 'angular', translations: { ENGLISH: { name: 'Angular' } } },
      ],
      status: 'DRAFT',
      translations: {
        ENGLISH: { title: 'Existing Title', description: 'Existing Desc' },
        PORTUGUESE: { title: 'Título', description: 'Descrição' },
      },
    };
    (projectServiceMock.getById as any).mockReturnValue(of(mockProject));

    const editFixture = TestBed.createComponent(ProjectEditorComponent);
    const editComponent = editFixture.componentInstance;

    editComponent.ngOnInit();

    expect(editComponent.isEdit()).toBe(true);
    expect(editComponent.slug()).toBe('existing-project');
    expect(editComponent.currentStatus()).toBe('DRAFT');
    expect(editComponent.form.controls.logoUrl.value).toBe('https://example.com/logo.png');
    expect(editComponent.form.controls.githubUrl.value).toBe('https://github.com/test');
    expect(editComponent.form.controls.tagIds.value).toEqual([
      { id: 'tag-1', slug: 'typescript', translations: { ENGLISH: { name: 'TypeScript' } } },
      { id: 'tag-2', slug: 'angular', translations: { ENGLISH: { name: 'Angular' } } },
    ]);

    const forms = editComponent.translationForms();
    expect(forms.ENGLISH.title.value).toBe('Existing Title');
    expect(forms.PORTUGUESE.title.value).toBe('Título');
  });
});
