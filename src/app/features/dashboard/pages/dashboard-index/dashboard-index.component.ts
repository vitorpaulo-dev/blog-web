import { Component, DestroyRef, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { CommonModule, isPlatformBrowser, isPlatformServer } from '@angular/common';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BaseChartDirective, provideCharts, withDefaultRegisterables } from 'ng2-charts';
import { ChartConfiguration } from 'chart.js';

import { TuiButton } from '@taiga-ui/core';
import { HugeiconsIconComponent } from '@hugeicons/angular';
import { Loading03Icon, PlusSignIcon, Mail01Icon } from '@hugeicons/core-free-icons';

import { DashboardService, DashboardStats, Top, TopItem } from '../../data-access/dashboard.service';
import { ClerkService } from '../../../../core/auth/clerk.service';
import { TranslatePipe } from '../../../../core/i18n/translate.pipe';
import { TranslationService } from '../../../../core/i18n/translation.service';

const TITLE_MAX_LENGTH = 18;

function greetingForHour(hour: number): string {
	return hour < 12
		? 'dashboard.index.greetingMorning'
		: hour < 18
			? 'dashboard.index.greetingAfternoon'
			: 'dashboard.index.greetingEvening';
}

@Component({
	selector: 'app-dashboard-index',
	standalone: true,
	imports: [CommonModule, RouterLink, TuiButton, TranslatePipe, HugeiconsIconComponent, BaseChartDirective],
	providers: [provideCharts(withDefaultRegisterables())],
	template: `
		<div class="mx-auto px-4 py-8 sm:px-6">
			<div class="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div class="min-w-0">
					<h1 class="text-2xl font-bold">{{ greetingKey() | translate: { name: userName() } }}</h1>
				</div>

				<div class="flex flex-wrap items-center gap-3">
					<a
						tuiButton
						appearance="outline"
						size="m"
						href="https://resend.com"
						target="_blank"
						rel="noopener noreferrer"
					>
						<span class="flex items-center gap-2">
							<hugeicons-icon [icon]="Mail01Icon" [size]="16" [strokeWidth]="1.5" />
							{{ 'dashboard.index.sendNewsletter' | translate }}
						</span>
					</a>

					<a
						tuiButton
						appearance="outline"
						size="m"
						routerLink="/dashboard/project/new"
					>
						<span class="flex items-center gap-2">
							<hugeicons-icon [icon]="PlusSignIcon" [size]="16" [strokeWidth]="1.5" />
							{{ 'dashboard.index.newProject' | translate }}
						</span>
					</a>

					<a
						tuiButton
						appearance="primary"
						size="m"
						routerLink="/dashboard/post/new"
					>
						<span class="flex items-center gap-2">
							<hugeicons-icon [icon]="PlusSignIcon" [size]="16" [strokeWidth]="1.5" />
							{{ 'dashboard.index.newPost' | translate }}
						</span>
					</a>
				</div>
			</div>

			@if (loading()) {
				<div class="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
					<div class="h-28 rounded-xl border border-border bg-surface animate-pulse"></div>
					<div class="h-28 rounded-xl border border-border bg-surface animate-pulse"></div>
					<div class="h-28 rounded-xl border border-border bg-surface animate-pulse"></div>
					<div class="h-28 rounded-xl border border-border bg-surface animate-pulse"></div>
					<div class="h-28 rounded-xl border border-border bg-surface animate-pulse"></div>
					<div class="h-28 rounded-xl border border-border bg-surface animate-pulse"></div>
				</div>
			} @else if (error()) {
				<div class="relative rounded-xl border border-border bg-surface px-8 py-10 text-center shadow-sm text-muted text-sm">
					{{ error() }}
				</div>
			} @else {
				<div class="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
					<div class="rounded-xl border border-border bg-surface p-4 shadow-sm">
						<p class="text-muted text-xs">{{ 'dashboard.index.totalPosts' | translate }}</p>
						<p class="text-2xl font-bold mt-1">{{ stats()?.totalPosts }}</p>
					</div>
					<div class="rounded-xl border border-border bg-surface p-4 shadow-sm">
						<p class="text-muted text-xs">{{ 'dashboard.index.publishedPosts' | translate }}</p>
						<p class="text-2xl font-bold mt-1">{{ stats()?.publishedPosts }}</p>
					</div>
					<div class="rounded-xl border border-border bg-surface p-4 shadow-sm">
						<p class="text-muted text-xs">{{ 'dashboard.index.totalProjects' | translate }}</p>
						<p class="text-2xl font-bold mt-1">{{ stats()?.totalProjects }}</p>
					</div>
					<div class="rounded-xl border border-border bg-surface p-4 shadow-sm">
						<p class="text-muted text-xs">{{ 'dashboard.index.totalViews' | translate }}</p>
						<p class="text-2xl font-bold mt-1">{{ stats()?.totalViews }}</p>
					</div>
					<div class="rounded-xl border border-border bg-surface p-4 shadow-sm">
						<p class="text-muted text-xs">{{ 'dashboard.index.totalReactions' | translate }}</p>
						<p class="text-2xl font-bold mt-1">{{ stats()?.totalReactions }}</p>
					</div>
					<div class="rounded-xl border border-border bg-surface p-4 shadow-sm">
						<p class="text-muted text-xs">{{ 'dashboard.index.activeSubscribers' | translate }}</p>
						<p class="text-2xl font-bold mt-1">{{ stats()?.activeSubscribers }}</p>
					</div>
				</div>

				@if (isEmpty()) {
					<div class="relative rounded-xl border border-border bg-surface px-8 py-10 text-center shadow-sm">
						<p class="text-sm mb-4">{{ 'dashboard.index.noContent' | translate }}</p>
						<a tuiButton appearance="primary" size="m" routerLink="/dashboard/post/new">
							{{ 'dashboard.index.createFirstPost' | translate }}
						</a>
					</div>
				} @else if (chartsEnabled()) {
					<div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
						<div class="rounded-xl border border-border bg-surface p-4 shadow-sm">
							<h2 class="text-sm font-semibold mb-3">{{ 'dashboard.index.postsTopViews' | translate }}</h2>
							<div class="relative h-64">
								<canvas
									baseChart
									type="bar"
									[data]="postsAllTimeChart().data"
									[options]="postsAllTimeChart().options"
								></canvas>
							</div>
						</div>

						<div class="rounded-xl border border-border bg-surface p-4 shadow-sm">
							<h2 class="text-sm font-semibold mb-3">{{ 'dashboard.index.postsLast24h' | translate }}</h2>
							<div class="relative h-64">
								<canvas
									baseChart
									type="bar"
									[data]="postsLast24hChart().data"
									[options]="postsLast24hChart().options"
								></canvas>
							</div>
						</div>

						<div class="rounded-xl border border-border bg-surface p-4 shadow-sm">
							<h2 class="text-sm font-semibold mb-3">{{ 'dashboard.index.projectsTopViews' | translate }}</h2>
							<div class="relative h-64">
								<canvas
									baseChart
									type="bar"
									[data]="projectsAllTimeChart().data"
									[options]="projectsAllTimeChart().options"
								></canvas>
							</div>
						</div>

						<div class="rounded-xl border border-border bg-surface p-4 shadow-sm">
							<h2 class="text-sm font-semibold mb-3">{{ 'dashboard.index.projectsLast24h' | translate }}</h2>
							<div class="relative h-64">
								<canvas
									baseChart
									type="bar"
									[data]="projectsLast24hChart().data"
									[options]="projectsLast24hChart().options"
								></canvas>
							</div>
						</div>
					</div>
				}
			}
		</div>
	`,
})
export class DashboardIndexComponent {
	private readonly dashboardService = inject(DashboardService);
	private readonly translationService = inject(TranslationService);
	private readonly clerkService = inject(ClerkService);
	private readonly platformId = inject(PLATFORM_ID);
	private readonly destroyRef = inject(DestroyRef);

	readonly stats = signal<DashboardStats | null>(null);
	readonly topPosts = signal<Top>({ allTime: [], last24h: [] });
	readonly topProjects = signal<Top>({ allTime: [], last24h: [] });
	readonly loading = signal(true);
	readonly error = signal<string | null>(null);

	readonly isBrowser = isPlatformBrowser(this.platformId);

	readonly greetingKey = signal('dashboard.index.greetingMorning');

	readonly userName = computed(() => {
		const user = this.clerkService.user();

		return user?.fullName ?? user?.firstName ?? this.translationService.translate('dashboard.nav.userFallback');
	});

	readonly isEmpty = computed(() => (this.stats()?.totalPosts ?? 0) === 0 && (this.stats()?.totalProjects ?? 0) === 0);

	readonly chartsEnabled = computed(() => this.isBrowser && !this.isEmpty());

	readonly postsAllTimeChart = computed(() => buildChart(this.topPosts().allTime));
	readonly postsLast24hChart = computed(() => buildChart(this.topPosts().last24h));
	readonly projectsAllTimeChart = computed(() => buildChart(this.topProjects().allTime));
	readonly projectsLast24hChart = computed(() => buildChart(this.topProjects().last24h));

	constructor() {
		if (isPlatformServer(this.platformId)) return;

		this.greetingKey.set(greetingForHour(new Date().getHours()));
		this.load();
	}

	load(): void {
		if (isPlatformServer(this.platformId)) return;

		this.loading.set(true);
		this.error.set(null);

		this.dashboardService
			.getStats()
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: (response) => {
					this.stats.set(response);
					this.loading.set(false);
				},
				error: () => {
					this.error.set(this.translationService.translate('dashboard.index.failedToLoad'));
					this.loading.set(false);
				},
			});

		this.dashboardService
			.getTopPosts(5)
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: (response) => this.topPosts.set(response),
				error: () => this.error.set(this.translationService.translate('dashboard.index.failedToLoad')),
			});

		this.dashboardService
			.getTopProjects(5)
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: (response) => this.topProjects.set(response),
				error: () => this.error.set(this.translationService.translate('dashboard.index.failedToLoad')),
			});
	}

	protected readonly PlusSignIcon = PlusSignIcon;
	protected readonly Mail01Icon = Mail01Icon;
	protected readonly Loading03Icon = Loading03Icon;
}

function buildChart(items: TopItem[]) {
	return {
		data: {
			labels: items.map((item) => truncateTitle(item.title)),
			datasets: [
				{ label: 'Views', data: items.map((item) => item.viewCount), backgroundColor: 'rgba(59,130,246,0.7)' },
				{ label: 'Reactions', data: items.map((item) => item.reactionCount), backgroundColor: 'rgba(239,68,68,0.7)' },
			],
		},
		options: {
			responsive: true,
			maintainAspectRatio: false,
			scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
			plugins: { legend: { position: 'top' as const } },
		},
	} satisfies { data: ChartConfiguration<'bar'>['data']; options: ChartConfiguration<'bar'>['options'] };
}

function truncateTitle(title: string): string {
	const normalized = title?.trim();
	if (!normalized) return '';
	return normalized.length <= TITLE_MAX_LENGTH ? normalized : `${normalized.slice(0, TITLE_MAX_LENGTH)}…`;
}
