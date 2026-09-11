import { Component, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TuiChip, TuiPagination, TuiToastService } from '@taiga-ui/kit';
import { HugeiconsIconComponent } from '@hugeicons/angular';
import { EyeIcon, Loading03Icon, SourceCodeIcon } from '@hugeicons/core-free-icons';
import { CommonModule } from '@angular/common';
import { LanguageService } from '../../../../core/i18n/language.service';
import { excerpt, firstTranslation } from '../../../../core/util/text.util';
import { ProjectDto, ProjectService } from '../../data-access/project.service';
import { ContentCardComponent, ContentCardItem } from '../../../../shared/components/content-card/content-card.component';

@Component({
	selector: 'app-project-list',
	standalone: true,
	imports: [
		CommonModule,
		FormsModule,
		RouterLink,
		HugeiconsIconComponent,
		TuiPagination,
		TuiChip,
		ContentCardComponent,
	],
	template: `
		<div class="py-2">
			<h1 class="text-3xl font-bold tracking-tight">Projects</h1>

			@if (loading()) {
				<div class="text-muted text-sm w-full inline-flex justify-center items-center h-full">
					<hugeicons-icon [icon]="Loading03Icon" [size]="32" [strokeWidth]="1.5" />
				</div>
			} @else if (projects().length === 0) {
				<div class="relative rounded-xl border border-border bg-surface px-8 pt-10 pb-3 text-center shadow-sm">
					<div
						class="absolute left-1/2 top-0 -translate-x-1/2 text-7xl font-serif leading-none text-muted/20"
					>
						"
					</div>

					<blockquote class="relative font-serif text-xl italic leading-relaxed text-foreground sm:text-2xl">
						"No project is too small to teach you something valuable."
					</blockquote>

					<footer class="mt-6 text-sm font-medium tracking-wide text-muted">Dev Wisdom</footer>
				</div>
			} @else {
				<div class="w-full">
					@for (card of cardItems(); track card.slug; let index = $index) {
						<app-content-card [item]="card" [showDivider]="index > 0" />
					}
				</div>

				<tui-pagination [activePadding]="1" [index]="page()" [length]="totalPages()" (indexChange)="page.set($event)"/>
			}
		</div>
	`,
})
export class ProjectListComponent {
	private readonly projectService = inject(ProjectService);
	private readonly languageService = inject(LanguageService);
	private readonly toastService = inject(TuiToastService);

	projects = signal<ProjectDto[]>([]);
	loading = signal(false);

	page = signal(0);
	totalPages = signal(1);
	totalElements = signal(0);

	cardItems = computed<ContentCardItem[]>(() =>
		this.projects().map(project => ({
			slug: project.slug,
			title: firstTranslation(project.translations)?.title ?? '',
			excerpt: excerpt(firstTranslation(project.translations)?.description ?? ''),
			imageUrl: project.logoUrl || project.bannerUrl,
			date: project.createdAt,
			routePrefix: '/project',
			metaIcon: EyeIcon,
			metaText: `${project.viewCount} views`,
			chips: (project.tags || []).map(tag => ({
				icon: SourceCodeIcon,
				label: firstTranslation(tag.translations)?.name ?? '',
			})),
		}))
	);

	constructor() {
		effect(() => {
			this.languageService.language();
			this.page();
			this.load();
		});
	}

	load(): void {
		this.loading.set(true);
		this.projectService
			.search({
				query: { language: this.languageService.language() },
				page: this.page(),
				size: 10,
				sort: 'createdAt',
				direction: 'DESC',
			})
			.subscribe({
				next: (res) => {
					this.projects.set(res.content);
					this.totalPages.set(res.totalPages);
					this.totalElements.set(res.totalElements);
					this.loading.set(false);
				},
				error: () => {
					this.loading.set(false);
					this.toastService.open('Failed to load projects. Please try again.', {
						appearance: 'error',
						autoClose: 5000,
						data: '@tui.circle-x',
					}).subscribe();
				},
			});
	}

	protected readonly Loading03Icon = Loading03Icon;
}
