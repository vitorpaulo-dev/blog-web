import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
  inject,
  PLATFORM_ID,
  effect,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { ClerkService } from '../../../../clerk.service';

@Component({
  selector: 'app-login',
  standalone: true,
  template: `
    <div class="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-8">
      <div #signInContainer class="w-full max-w-md"></div>
    </div>
  `,
})
export class LoginComponent implements AfterViewInit, OnDestroy {
  @ViewChild('signInContainer', { static: false })
  signInContainer!: ElementRef<HTMLDivElement>;

  private readonly clerkService = inject(ClerkService);
  private readonly route = inject(ActivatedRoute);
  private readonly platformId = inject(PLATFORM_ID);
  private mounted = false;

  constructor() {
    // Watch for when Clerk is loaded and mount the sign-in component
    if (isPlatformBrowser(this.platformId)) {
      effect(() => {
        if (this.clerkService.isLoaded() && this.signInContainer && !this.mounted) {
          this.mountSignIn();
        }
      });
    }
  }

  async ngAfterViewInit(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;

    // Ensure Clerk is initialized
    await this.clerkService.init();
  }

  private mountSignIn(): void {
    const rawRedirectUrl = this.route.snapshot.queryParamMap.get('redirect_url') || '/';
    const redirectUrl = this.isValidRedirectUrl(rawRedirectUrl) ? rawRedirectUrl : '/';

    this.clerkService.mountSignIn(this.signInContainer.nativeElement, {
      forceRedirectUrl: redirectUrl,
      signUpUrl: '/signup',
    });
    this.mounted = true;
  }

  private isValidRedirectUrl(url: string): boolean {
    return url.startsWith('/') && !url.startsWith('//') && !url.includes('://');
  }

  ngOnDestroy(): void {
    if (!this.mounted) return;
    this.clerkService.unmountSignIn(this.signInContainer.nativeElement);
    this.mounted = false;
  }
}
