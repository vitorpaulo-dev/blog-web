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
  selector: 'app-signup',
  standalone: true,
  template: `
    <div class="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-8">
      <div #signUpContainer class="w-full max-w-md"></div>
    </div>
  `,
})
export class SignupComponent implements AfterViewInit, OnDestroy {
  @ViewChild('signUpContainer', { static: false })
  signUpContainer!: ElementRef<HTMLDivElement>;

  private readonly clerkService = inject(ClerkService);
  private readonly route = inject(ActivatedRoute);
  private readonly platformId = inject(PLATFORM_ID);
  private mounted = false;

  constructor() {
    // Watch for when Clerk is loaded and mount the sign-up component
    if (isPlatformBrowser(this.platformId)) {
      effect(() => {
        if (this.clerkService.isLoaded() && this.signUpContainer && !this.mounted) {
          this.mountSignUp();
        }
      });
    }
  }

  async ngAfterViewInit(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;

    // Ensure Clerk is initialized
    await this.clerkService.init();
  }

  private mountSignUp(): void {
    const rawRedirectUrl = this.route.snapshot.queryParamMap.get('redirect_url') || '/';
    const redirectUrl = this.isValidRedirectUrl(rawRedirectUrl) ? rawRedirectUrl : '/';

    this.clerkService.mountSignUp(this.signUpContainer.nativeElement, {
      forceRedirectUrl: redirectUrl,
      signInUrl: '/login',
    });
    this.mounted = true;
  }

  private isValidRedirectUrl(url: string): boolean {
    return url.startsWith('/') && !url.startsWith('//') && !url.includes('://');
  }

  ngOnDestroy(): void {
    if (!this.mounted) return;
    this.clerkService.unmountSignUp(this.signUpContainer.nativeElement);
    this.mounted = false;
  }
}
