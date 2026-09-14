import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DashboardLayoutComponent } from './dashboard-layout.component';
import { provideTaiga } from '@taiga-ui/core';
import { provideRouter, Routes } from '@angular/router';
import { translationProvider } from '../../../core/i18n/testing';
import { ClerkService } from '../../../clerk.service';
import { Router } from '@angular/router';
import { signal } from '@angular/core';
import { Component } from '@angular/core';

@Component({ selector: 'app-test-page', standalone: true, template: '' })
class TestPageComponent {}

const testRoutes: Routes = [
  { path: 'post', component: TestPageComponent },
  { path: 'featured', component: TestPageComponent },
  { path: '**', component: TestPageComponent },
];

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

describe('DashboardLayoutComponent', () => {
  let fixture: ComponentFixture<DashboardLayoutComponent>;
  let clerkServiceMock: Partial<ClerkService>;

  const setup = async (user: unknown): Promise<void> => {
    clerkServiceMock = {
      isLoaded: signal(true),
      isSignedIn: signal(true),
      user: signal(user as never),
      openUserProfile: vi.fn(),
      signOut: vi.fn().mockResolvedValue(undefined),
    };

    await TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [DashboardLayoutComponent],
      providers: [
        provideTaiga(),
        provideRouter(testRoutes),
        translationProvider(),
        { provide: ClerkService, useValue: clerkServiceMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardLayoutComponent);
    fixture.detectChanges();
  };

  it('should create', async () => {
    await setup(null);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render nav links for posts, projects, tags and featured', async () => {
    await setup(null);
    const compiled = fixture.nativeElement as HTMLElement;
    const hrefs = Array.from(
      compiled.querySelectorAll('a[tuiAsideItem], aside a')
    ).map((link: Element) => link.getAttribute('routerLink') ?? link.getAttribute('href'));

    for (const expected of [
      '/dashboard/post',
      '/dashboard/post/new',
      '/dashboard/project',
      '/dashboard/project/new',
      '/dashboard/tag',
      '/dashboard/tag/new',
      '/dashboard/featured',
    ]) {
      expect(hrefs).toContain(expected);
    }
  });

  it('should link the sidebar logo to /dashboard', async () => {
    await setup(null);
    const compiled = fixture.nativeElement as HTMLElement;
    const logo = compiled.querySelector('header a[href="/dashboard"]');

    expect(logo).toBeTruthy();
    expect(logo?.querySelector('img[src="logo.svg"]')).toBeTruthy();
    expect(logo?.querySelector('img[src="favicon.png"]')).toBeTruthy();
  });

  it('should show the signed-in user name', async () => {
    await setup({ fullName: 'Vitor Paulo', imageUrl: 'https://clerk.example/avatar.png' });
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Vitor Paulo');
  });

  it('should render the Clerk avatar image in the sidebar footer', async () => {
    await setup({ fullName: 'Vitor Paulo', imageUrl: 'https://clerk.example/avatar.png' });
    const compiled = fixture.nativeElement as HTMLElement;
    const avatar = compiled.querySelector('footer img');

    expect(avatar?.getAttribute('src')).toBe('https://clerk.example/avatar.png');
    expect(avatar?.getAttribute('alt')).toBe('Vitor Paulo');
  });

  it('should keep images square with object-fit so the aspect ratio survives the collapsed aside', async () => {
    await setup({ fullName: 'Vitor Paulo', imageUrl: 'https://clerk.example/avatar.png' });
    const compiled = fixture.nativeElement as HTMLElement;

    const logoFavicon = compiled.querySelector<HTMLImageElement>(
      'header a.app-aside-logo img[src="favicon.png"]'
    );
    const avatar = compiled.querySelector<HTMLImageElement>('footer img');

    expect(logoFavicon?.classList).toContain('w-8');
    expect(logoFavicon?.classList).toContain('object-contain');
    expect(avatar?.classList).toContain('w-6');
    expect(avatar?.classList).toContain('object-cover');
  });

  it('should fall back to the local avatar asset when the user has no imageUrl', async () => {
    await setup({ fullName: 'Vitor Paulo' });
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('footer img')?.getAttribute('src')).toBe('vitor-avatar.png');
  });

  it('should not render the view-site button', async () => {
    await setup({ fullName: 'Vitor Paulo' });
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).not.toContain('View site');
  });

  it('should fall back to Admin when the user is null (SSR-safe)', async () => {
    await setup(null);
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Admin');
  });

  it('should open the Clerk profile on user action', async () => {
    await setup({ fullName: 'Vitor Paulo' });
    const buttons = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('footer button')
    );
    const profileButton = buttons.find((button) => button.textContent?.includes('Vitor Paulo'));

    profileButton?.dispatchEvent(new Event('click'));
    fixture.detectChanges();

    expect(clerkServiceMock.openUserProfile).toHaveBeenCalled();
  });

  it('should sign out and navigate away from the dashboard on logout', async () => {
    await setup({ fullName: 'Vitor Paulo' });
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/post');

    const buttons = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>('footer button')
    );
    const logoutButton = buttons.find((button) => button.getAttribute('aria-label') === 'Logout');

    expect(logoutButton).toBeTruthy();
    expect(logoutButton?.textContent?.trim()).toBe('');

    logoutButton?.dispatchEvent(new Event('click'));
    await new Promise((resolve) => setTimeout(resolve));
    await fixture.whenStable();

    expect(clerkServiceMock.signOut).toHaveBeenCalled();
    expect(router.url).toBe('/');
  });

  it('should sit the logout icon button beside the user name in the same footer row', async () => {
    await setup({ fullName: 'Vitor Paulo' });
    const compiled = fixture.nativeElement as HTMLElement;
    const profileButton = Array.from(
      compiled.querySelectorAll<HTMLElement>('footer button')
    ).find((button) => button.textContent?.includes('Vitor Paulo'));
    const row = profileButton?.parentElement;

    expect(row).toBeTruthy();
    expect(row?.querySelector('button[aria-label="Logout"]')).toBeTruthy();
  });

  it('should hide the logout button when the sidebar is collapsed', async () => {
    await setup({ fullName: 'Vitor Paulo' });
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelector('button[aria-label="Logout"]')).toBeTruthy();

    collapse(fixture);

    await fixture.whenStable();
    fixture.detectChanges();

    expect(compiled.querySelector('button[aria-label="Logout"]')).toBeNull();
  });

  it('should only carry the _expanded class while the sidebar is expanded', async () => {
    await setup({ fullName: 'Vitor Paulo' });
    const compiled = fixture.nativeElement as HTMLElement;
    const aside = compiled.querySelector('aside');

    expect(aside?.classList).toContain('_expanded');

    collapse(fixture);

    await fixture.whenStable();
    fixture.detectChanges();

    expect(aside?.classList).not.toContain('_expanded');
  });

  function collapse(componentFixture: ComponentFixture<DashboardLayoutComponent>): void {
    const component = componentFixture.componentInstance as unknown as {
      expanded: { set(value: boolean): void };
    };

    component.expanded.set(false);
  }
});
