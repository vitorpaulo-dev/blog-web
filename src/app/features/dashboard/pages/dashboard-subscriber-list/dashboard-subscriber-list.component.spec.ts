import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DashboardSubscriberListComponent } from './dashboard-subscriber-list.component';
import { provideTaiga } from '@taiga-ui/core';
import { provideRouter } from '@angular/router';
import { NewsletterService, SubscriberDto } from '../../data-access/newsletter.service';
import { LanguageService } from '../../../../core/i18n/language.service';
import { translationProvider } from '../../../../core/i18n/testing';
import { TuiToastService } from '@taiga-ui/kit';
import { TuiDialogService } from '@taiga-ui/core';
import { of, throwError } from 'rxjs';
import { PLATFORM_ID, signal } from '@angular/core';

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

describe('DashboardSubscriberListComponent', () => {
  let component: DashboardSubscriberListComponent;
  let fixture: ComponentFixture<DashboardSubscriberListComponent>;
  let newsletterServiceMock: Partial<NewsletterService>;
  let languageServiceMock: Partial<LanguageService>;
  let toastServiceMock: Partial<TuiToastService>;
  let dialogServiceMock: Partial<TuiDialogService>;

  const subscriber: SubscriberDto = {
    id: '1',
    email: 'reader@example.com',
    status: 'ACTIVE',
    language: 'ENGLISH',
    frequency: 'EVERY_POST',
    createdAt: '2026-01-01',
  };

  beforeEach(async () => {
    newsletterServiceMock = {
      listSubscribers: vi.fn(),
      unsubscribeSubscriber: vi.fn(),
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
      imports: [DashboardSubscriberListComponent],
      providers: [
        provideTaiga(),
        provideRouter([]),
        { provide: NewsletterService, useValue: newsletterServiceMock },
        { provide: LanguageService, useValue: languageServiceMock },
        translationProvider(),
        { provide: TuiToastService, useValue: toastServiceMock },
        { provide: TuiDialogService, useValue: dialogServiceMock },
        { provide: PLATFORM_ID, useValue: 'browser' },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardSubscriberListComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should not load subscribers during SSR', () => {
    (newsletterServiceMock.listSubscribers as any)
      .mockReturnValue(of({ content: [], totalPages: 1, totalElements: 0 }));

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [DashboardSubscriberListComponent],
      providers: [
        provideTaiga(),
        provideRouter([]),
        { provide: NewsletterService, useValue: newsletterServiceMock },
        { provide: LanguageService, useValue: languageServiceMock },
        translationProvider(),
        { provide: TuiToastService, useValue: toastServiceMock },
        { provide: TuiDialogService, useValue: dialogServiceMock },
        { provide: PLATFORM_ID, useValue: 'server' },
      ],
    });

    const serverFixture = TestBed.createComponent(DashboardSubscriberListComponent);
    const serverComponent = serverFixture.componentInstance;

    serverComponent.load();

    expect(newsletterServiceMock.listSubscribers).not.toHaveBeenCalled();
  });

  it('should load subscribers on browser', () => {
    (newsletterServiceMock.listSubscribers as any)
      .mockReturnValue(of({ content: [subscriber], totalPages: 1, totalElements: 1 }));

    component.load();

    expect(newsletterServiceMock.listSubscribers).toHaveBeenCalled();
    expect(component.subscribers().length).toBe(1);
    expect(component.loading()).toBe(false);
  });

  it('should send search filters and pagination', () => {
    (newsletterServiceMock.listSubscribers as any)
      .mockReturnValue(of({ content: [], totalPages: 1, totalElements: 0 }));

    component.searchControl.setValue('reader');
    component.statusControl.setValue('ACTIVE');
    component.load();

    expect(newsletterServiceMock.listSubscribers).toHaveBeenCalledWith({
      query: { email: 'reader', status: 'ACTIVE', language: undefined, frequency: undefined },
      page: 0,
      size: 10,
      sort: 'createdAt',
      direction: 'DESC',
    });
  });

  it('should set error on load failure', () => {
    (newsletterServiceMock.listSubscribers as any).mockReturnValue(throwError(() => new Error('Failed')));

    component.load();

    expect(component.error()).toBe('Failed to load subscribers.');
    expect(component.loading()).toBe(false);
  });

  it('should unsubscribe and reload after confirmation', () => {
    (newsletterServiceMock.unsubscribeSubscriber as any).mockReturnValue(of(subscriber));
    (newsletterServiceMock.listSubscribers as any)
      .mockReturnValue(of({ content: [], totalPages: 1, totalElements: 0 }));

    component.askUnsubscribe('test-id');

    expect(dialogServiceMock.open).toHaveBeenCalled();
    expect(newsletterServiceMock.unsubscribeSubscriber).toHaveBeenCalledWith('test-id');
    expect(toastServiceMock.open).toHaveBeenCalledWith('Subscriber unsubscribed successfully', {
      appearance: 'success',
      autoClose: 3000,
      data: '@tui.check',
    });
  });

  it('should show error toast when unsubscribe fails', () => {
    (newsletterServiceMock.unsubscribeSubscriber as any).mockReturnValue(throwError(() => new Error('Failed')));
    (newsletterServiceMock.listSubscribers as any)
      .mockReturnValue(of({ content: [], totalPages: 1, totalElements: 0 }));

    component.askUnsubscribe('test-id');

    expect(toastServiceMock.open).toHaveBeenCalledWith('Failed to unsubscribe subscriber. Please try again.', {
      appearance: 'error',
      autoClose: 5000,
      data: '@tui.circle-x',
    });
  });

  it('should not unsubscribe when confirm dialog is dismissed', () => {
    (dialogServiceMock.open as any).mockReturnValue(of(false));

    component.askUnsubscribe('test-id');

    expect(newsletterServiceMock.unsubscribeSubscriber).not.toHaveBeenCalled();
  });

  it('should not reload on same page', () => {
    component.page.set(0);
    (newsletterServiceMock.listSubscribers as any)
      .mockReturnValue(of({ content: [], totalPages: 1, totalElements: 0 }));

    component.onPage(0);

    expect(newsletterServiceMock.listSubscribers).not.toHaveBeenCalled();
  });

  it('should reload on different page', () => {
    component.page.set(0);
    (newsletterServiceMock.listSubscribers as any)
      .mockReturnValue(of({ content: [], totalPages: 1, totalElements: 20 }));

    component.onPage(1);

    expect(newsletterServiceMock.listSubscribers).toHaveBeenCalled();
    expect(component.page()).toBe(1);
  });
});
