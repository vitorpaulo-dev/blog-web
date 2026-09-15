import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { TuiButton } from '@taiga-ui/core';
import { TuiNavigation } from '@taiga-ui/layout';
import { TuiChevron, TuiFade } from '@taiga-ui/kit';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { TranslationService } from '../../../core/i18n/translation.service';
import { ClerkService } from '../../../core/auth/clerk.service';

@Component({
	selector: 'app-dashboard-layout',
	standalone: true,
	imports: [RouterOutlet, RouterLink, TuiButton, TuiNavigation, TuiFade, TranslatePipe, TuiChevron],
	templateUrl: './dashboard-layout.component.html',
	styleUrl: './dashboard-layout.component.css',
})
export class DashboardLayoutComponent {
	protected readonly clerkService = inject(ClerkService);
	private readonly translationService = inject(TranslationService);
	private readonly router = inject(Router);

	protected readonly expanded = signal(true);

	protected readonly userName = computed(() => {
		const user = this.clerkService.user();

		return user?.fullName ?? user?.firstName ?? this.translationService.translate('dashboard.nav.userFallback');
	});

	protected readonly userAvatar = computed(() => this.clerkService.user()?.imageUrl || 'vitor-avatar.png');

	protected openProfile(): void {
		this.clerkService.openUserProfile();
	}

	protected async logout(): Promise<void> {
		await this.clerkService.signOut();

		void this.router.navigateByUrl('/');
	}
}
