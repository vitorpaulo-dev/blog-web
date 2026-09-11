import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TagEditorComponent } from './tag-editor.component';
import { provideTaiga } from '@taiga-ui/core';
import { provideRouter, Router } from '@angular/router';
import { TagService } from '../../../tags/data-access/tag.service';
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

describe('TagEditorComponent', () => {
  let component: TagEditorComponent;
  let fixture: ComponentFixture<TagEditorComponent>;
  let tagServiceMock: Partial<TagService>;
  let toastServiceMock: Partial<TuiToastService>;
  let routerMock: Partial<Router>;

  beforeEach(async () => {
    tagServiceMock = {
      getById: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    };

    toastServiceMock = {
      open: vi.fn().mockReturnValue(of(true)),
    };

    routerMock = {
      navigate: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [TagEditorComponent],
      providers: [
        provideTaiga(),
        provideRouter([]),
        { provide: TagService, useValue: tagServiceMock },
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

    fixture = TestBed.createComponent(TagEditorComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should not be in edit mode by default', () => {
    expect(component.isEdit()).toBe(false);
  });

  it('should not load tag during SSR', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [TagEditorComponent],
      providers: [
        provideTaiga(),
        provideRouter([]),
        { provide: TagService, useValue: tagServiceMock },
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

    const serverFixture = TestBed.createComponent(TagEditorComponent);
    const serverComponent = serverFixture.componentInstance;

    serverComponent.ngOnInit();

    expect(tagServiceMock.getById).not.toHaveBeenCalled();
  });

  it('should load tag in edit mode when id is present', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [TagEditorComponent],
      providers: [
        provideTaiga(),
        provideRouter([]),
        { provide: TagService, useValue: tagServiceMock },
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

    const mockTag = {
      id: 'test-id',
      slug: 'java',
      translations: {
        ENGLISH: { name: 'Java' },
        PORTUGUESE: { name: 'Java PT' },
      },
    };
    (tagServiceMock.getById as any).mockReturnValue(of(mockTag));

    const editFixture = TestBed.createComponent(TagEditorComponent);
    const editComponent = editFixture.componentInstance;

    editComponent.ngOnInit();

    expect(editComponent.isEdit()).toBe(true);
    expect(editComponent.translationForms().ENGLISH.name.value).toBe('Java');
    expect(editComponent.translationForms().PORTUGUESE.name.value).toBe('Java PT');
  });

  it('should show error toast and redirect when tag not found', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [TagEditorComponent],
      providers: [
        provideTaiga(),
        provideRouter([]),
        { provide: TagService, useValue: tagServiceMock },
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

    (tagServiceMock.getById as any).mockReturnValue(throwError(() => new Error('Not found')));

    const editFixture = TestBed.createComponent(TagEditorComponent);
    const editComponent = editFixture.componentInstance;

    editComponent.ngOnInit();

    expect(toastServiceMock.open).toHaveBeenCalledWith('Failed to load tag. Redirecting to dashboard...', {
      appearance: 'error',
      autoClose: 5000,
      data: '@tui.circle-x',
    });
    expect(routerMock.navigate).toHaveBeenCalledWith(['/dashboard/tag']);
  });

  it('should not save when form is invalid', () => {
    // English name is empty by default -> form invalid
    expect(component.isFormValid()).toBe(false);

    component.save();

    expect(tagServiceMock.create).not.toHaveBeenCalled();
  });

  it('should show success toast when tag is created', () => {
    (tagServiceMock.create as any).mockReturnValue(of({ id: 'new-id', slug: 'java', translations: {} }));

    const forms = component.translationForms();
    forms.ENGLISH.name.setValue('Java');

    component.save();

    expect(tagServiceMock.create).toHaveBeenCalled();
    expect(toastServiceMock.open).toHaveBeenCalledWith('Tag created successfully', {
      appearance: 'success',
      autoClose: 3000,
      data: '@tui.check',
    });
  });

  it('should show success toast when tag is updated', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [TagEditorComponent],
      providers: [
        provideTaiga(),
        provideRouter([]),
        { provide: TagService, useValue: tagServiceMock },
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

    const mockTag = {
      id: 'test-id',
      slug: 'java',
      translations: {
        ENGLISH: { name: 'Java' },
      },
    };
    (tagServiceMock.getById as any).mockReturnValue(of(mockTag));
    (tagServiceMock.update as any).mockReturnValue(of({ id: 'test-id', slug: 'java', translations: {} }));

    const editFixture = TestBed.createComponent(TagEditorComponent);
    const editComponent = editFixture.componentInstance;

    editComponent.ngOnInit();

    const forms = editComponent.translationForms();
    forms.ENGLISH.name.setValue('Updated Java');

    editComponent.save();

    expect(tagServiceMock.update).toHaveBeenCalled();
    expect(toastServiceMock.open).toHaveBeenCalledWith('Tag updated successfully', {
      appearance: 'success',
      autoClose: 3000,
      data: '@tui.check',
    });
  });

  it('should show error toast when save fails', () => {
    (tagServiceMock.create as any).mockReturnValue(throwError(() => new Error('Failed')));

    const forms = component.translationForms();
    forms.ENGLISH.name.setValue('Java');

    component.save();

    expect(toastServiceMock.open).toHaveBeenCalledWith('Failed to save tag. Please try again.', {
      appearance: 'error',
      autoClose: 5000,
      data: '@tui.circle-x',
    });
  });

  it('should navigate back to dashboard', () => {
    component.goBack();

    expect(routerMock.navigate).toHaveBeenCalledWith(['/dashboard/tag']);
  });

  it('should filter out empty translations on save', () => {
    (tagServiceMock.create as any).mockReturnValue(of({ id: 'new-id', slug: 'java', translations: {} }));

    const forms = component.translationForms();
    forms.ENGLISH.name.setValue('Java');
    // PORTUGUESE name left empty

    component.save();

    expect(tagServiceMock.create).toHaveBeenCalledWith(
      expect.objectContaining({
        translations: {
          ENGLISH: { name: 'Java' },
        },
      })
    );
  });
});
