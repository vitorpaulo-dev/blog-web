import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DashboardIndexComponent } from './dashboard-index.component';
import { provideTaiga } from '@taiga-ui/core';
import { provideRouter } from '@angular/router';
import { DashboardService, DashboardStats, Top } from '../../data-access/dashboard.service';
import { LanguageService } from '../../../../core/i18n/language.service';
import { translationProvider } from '../../../../core/i18n/testing';
import { ClerkService } from '../../../../core/auth/clerk.service';
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

describe('DashboardIndexComponent', () => {
  let component: DashboardIndexComponent;
  let fixture: ComponentFixture<DashboardIndexComponent>;
  let dashboardServiceMock: Partial<DashboardService>;
  let clerkServiceMock: Partial<ClerkService>;
  let languageServiceMock: Partial<LanguageService>;

  const stats: DashboardStats = {
    totalPosts: 0,
    publishedPosts: 0,
    draftPosts: 0,
    totalProjects: 0,
    publishedProjects: 0,
    draftProjects: 0,
    totalViews: 0,
    totalReactions: 0,
    totalSubscribers: 0,
    activeSubscribers: 0,
  };

  beforeEach(async () => {
    dashboardServiceMock = {
      getStats: vi.fn().mockReturnValue(of(stats)),
      getTopPosts: vi.fn().mockReturnValue(of({ allTime: [], last24h: [] })),
      getTopProjects: vi.fn().mockReturnValue(of({ allTime: [], last24h: [] })),
    };

    clerkServiceMock = {
      user: signal(null),
      isLoaded: signal(true),
      isSignedIn: signal(true),
    };

    languageServiceMock = {
      language: signal('ENGLISH' as any),
      setLanguage: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [DashboardIndexComponent],
      providers: [
        provideTaiga(),
        provideRouter([]),
        { provide: DashboardService, useValue: dashboardServiceMock },
        { provide: ClerkService, useValue: clerkServiceMock },
        { provide: LanguageService, useValue: languageServiceMock },
        translationProvider(),
        { provide: PLATFORM_ID, useValue: 'browser' },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardIndexComponent);
    component = fixture.componentInstance;
  });

  it('should create and load dashboard data on browser', () => {
    expect(component).toBeTruthy();

    expect(component.stats()).toEqual(stats);
    expect(component.loading()).toBe(false);
    expect(dashboardServiceMock.getStats).toHaveBeenCalled();
    expect(dashboardServiceMock.getTopPosts).toHaveBeenCalledWith(5);
    expect(dashboardServiceMock.getTopProjects).toHaveBeenCalledWith(5);
  });

  it('should show empty state when no content exists', () => {
    expect(component.isEmpty()).toBe(true);
  });

  it('should not show empty state when posts exist', () => {
    (dashboardServiceMock.getStats as any).mockReturnValue(of({ ...stats, totalPosts: 3, totalProjects: 2 }));
    (dashboardServiceMock.getTopPosts as any).mockReturnValue(
      of({ allTime: [{ id: '1', title: 'My Post', slug: 'my-post', viewCount: 10, reactionCount: 2, createdAt: '2026-01-01' }], last24h: [] })
    );

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [DashboardIndexComponent],
      providers: [
        provideTaiga(),
        provideRouter([]),
        { provide: DashboardService, useValue: dashboardServiceMock },
        { provide: ClerkService, useValue: clerkServiceMock },
        { provide: LanguageService, useValue: languageServiceMock },
        translationProvider(),
        { provide: PLATFORM_ID, useValue: 'browser' },
      ],
    });

    const browserFixture = TestBed.createComponent(DashboardIndexComponent);
    const browserComponent = browserFixture.componentInstance;

    expect(browserComponent.stats()?.totalPosts).toBe(3);
    expect(browserComponent.isEmpty()).toBe(false);
    expect(browserComponent.chartsEnabled()).toBe(true);
  });

  it('should use Clerk full name for greeting', () => {
    (clerkServiceMock.user as any).set({ fullName: 'Vitor Paulo', firstName: 'Vitor', imageUrl: null });

    expect(component.userName()).toBe('Vitor Paulo');
  });

  it('should fall back to firstName when fullName is null', () => {
    (clerkServiceMock.user as any).set({ fullName: null, firstName: 'Vitor', imageUrl: null });

    expect(component.userName()).toBe('Vitor');
  });

  it('should pick greeting key by time of day on client', () => {
    const supportedKeys = ['dashboard.index.greetingMorning', 'dashboard.index.greetingAfternoon', 'dashboard.index.greetingEvening'];
    const key1 = (component as any).greetingKey();

    expect(supportedKeys).toContain(key1);
  });

  it('should truncate long chart labels', () => {
    const items = Array.from({ length: 7 }, (_, index) => ({
      id: String(index),
      title: `A Very Long Post Title Number ${index}`,
      slug: `post-${index}`,
      viewCount: 10 + index,
      reactionCount: index,
      createdAt: '2026-01-01',
    }));
    (dashboardServiceMock.getTopPosts as any).mockReturnValue(of({ allTime: items, last24h: items }));

    component.topPosts.set({ allTime: items, last24h: items });

    expect(component.postsAllTimeChart().data.labels.length).toBe(7);
    (component.postsAllTimeChart().data.labels as string[]).forEach((label) => {
      expect(label.length).toBeLessThanOrEqual(19);
    });
  });

  it('should set error on stats load failure', () => {
    (dashboardServiceMock.getStats as any).mockReturnValue(throwError(() => new Error('Failed')));
    (dashboardServiceMock.getTopPosts as any).mockReturnValue(of({ allTime: [], last24h: [] }));
    (dashboardServiceMock.getTopProjects as any).mockReturnValue(of({ allTime: [], last24h: [] }));

    component.load();

    expect(component.error()).toBe('Failed to load dashboard. Please try again.');
    expect(component.loading()).toBe(false);
  });

  it('should not load during SSR', () => {
    TestBed.resetTestingModule();    TestBed.configureTestingModule({
      imports: [DashboardIndexComponent],
      providers: [
        provideTaiga(),
        provideRouter([]),
        { provide: DashboardService, useValue: dashboardServiceMock },
        { provide: ClerkService, useValue: clerkServiceMock },
        { provide: LanguageService, useValue: languageServiceMock },
        translationProvider(),
        { provide: PLATFORM_ID, useValue: 'server' },
      ],
    });

    const serverFixture = TestBed.createComponent(DashboardIndexComponent);
    const serverComponent = serverFixture.componentInstance;

    expect(serverComponent.greetingKey()).toBe('dashboard.index.greetingMorning');

    (dashboardServiceMock.getStats as any).mockClear();
    (dashboardServiceMock.getTopPosts as any).mockClear();
    (dashboardServiceMock.getTopProjects as any).mockClear();
    serverComponent.load();

    expect(dashboardServiceMock.getStats).not.toHaveBeenCalled();
    (dashboardServiceMock.getTopPosts as any).mockClear();
    (dashboardServiceMock.getTopProjects as any).mockClear();
    serverComponent.load();

    expect(dashboardServiceMock.getStats).not.toHaveBeenCalled();
  });

  it('should expose chart options for browser rendering', () => {
    const options = component.postsAllTimeChart().options;

    expect(options.responsive).toBe(true);
    expect(options.maintainAspectRatio).toBe(false);
  });

  it('should render header action buttons in order with expected labels and styles', () => {
    fixture.detectChanges();

    const buttons: HTMLElement[] = Array.from(
      fixture.nativeElement.querySelectorAll('.flex.flex-wrap.items-center.gap-3 [tuiButton]')
    );
    const labels = buttons.map((button: HTMLElement) => button.textContent?.trim());

    expect(labels).toEqual(['Send newsletter', 'New project', 'New post']);

    expect(buttons[0].getAttribute('data-appearance')).toBe('outline');
    expect(buttons[0].getAttribute('href')).toBe('https://resend.com');
    expect(buttons[0].getAttribute('target')).toBe('_blank');

    expect(buttons[1].getAttribute('data-appearance')).toBe('outline');

    expect(buttons[2].getAttribute('data-appearance')).toBe('primary');
    expect(buttons[2].getAttribute('routerLink')).toBe('/dashboard/post/new');
  });
});
