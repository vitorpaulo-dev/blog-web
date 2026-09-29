import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PLATFORM_ID, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { LoginComponent } from './login.component';
import { ClerkService } from '../../../../core/auth/clerk.service';
import { SeoService } from '../../../../core/seo/seo.service';

describe('LoginComponent', () => {
	let fixture: ComponentFixture<LoginComponent>;
	let clerkServiceMock: {
		init: ReturnType<typeof vi.fn>;
		isLoaded: ReturnType<typeof signal<boolean>>;
		mountSignIn: ReturnType<typeof vi.fn>;
		unmountSignIn: ReturnType<typeof vi.fn>;
	};

	beforeEach(async () => {
		clerkServiceMock = {
			init: vi.fn().mockResolvedValue(undefined),
			isLoaded: signal(true),
			mountSignIn: vi.fn(),
			unmountSignIn: vi.fn(),
		};

		const seoServiceMock = { setTitle: vi.fn() };

		await TestBed.configureTestingModule({
			imports: [LoginComponent],
			providers: [
				{ provide: ClerkService, useValue: clerkServiceMock },
				{ provide: SeoService, useValue: seoServiceMock },
				{ provide: PLATFORM_ID, useValue: 'browser' },
				{
					provide: ActivatedRoute,
					useValue: {
						snapshot: {
							queryParamMap: { get: vi.fn().mockReturnValue(null) },
						},
					},
				},
			],
		}).compileComponents();

		fixture = TestBed.createComponent(LoginComponent);
	});

	it('mounts the sign-in flow without a sign-up target', async () => {
		fixture.detectChanges();
		await fixture.whenStable();

		expect(clerkServiceMock.mountSignIn).toHaveBeenCalledTimes(1);

		const props = clerkServiceMock.mountSignIn.mock.calls[0][1] as Record<string, unknown>;
		expect('signUpUrl' in props).toBe(false);
	});

	it('suppresses the sign-up footer action through the supported appearance element override', async () => {
		fixture.detectChanges();
		await fixture.whenStable();

		const props = clerkServiceMock.mountSignIn.mock.calls[0][1] as {
			appearance: { elements: Record<string, { display: string }> };
		};

		expect(props.appearance.elements['footerAction__signIn']).toEqual({ display: 'none' });
	});

	it('redirects to the safe default when no redirect_url is provided', async () => {
		fixture.detectChanges();
		await fixture.whenStable();

		const props = clerkServiceMock.mountSignIn.mock.calls[0][1] as Record<string, unknown>;
		expect(props['forceRedirectUrl']).toBe('/');
	});
});
