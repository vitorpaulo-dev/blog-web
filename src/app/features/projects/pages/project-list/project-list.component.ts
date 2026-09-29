import { Component, computed, effect, inject, PLATFORM_ID, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TuiPagination, TuiSkeleton, TuiToastService } from '@taiga-ui/kit';
import { EyeIcon, SourceCodeIcon } from '@hugeicons/core-free-icons';
import { CommonModule, isPlatformServer } from '@angular/common';
import { LanguageService } from '../../../../core/i18n/language.service';
import { TranslatePipe } from '../../../../core/i18n/translate.pipe';
import { TranslationService } from '../../../../core/i18n/translation.service';
import { SeoService } from '../../../../core/seo/seo.service';
import { excerpt, firstTranslation } from '../../../../core/util/text.util';
import { buildTagMap, collectTagIds, tagName as tagNameOf } from '../../../../core/util/tag.util';
import { ProjectDto, ProjectService } from '../../data-access/project.service';
import { TagService, TagDto } from '../../../tags/data-access/tag.service';
import { ContentCardComponent, ContentCardItem } from '../../../../shared/components/content-card/content-card.component';

@Component({
	selector: 'app-project-list',
	standalone: true,
	imports: [
		CommonModule,
		FormsModule,
		TuiPagination,
		TuiSkeleton,
		ContentCardComponent,
		TranslatePipe,
	],
	template: `
		<div class="py-2">
			<h1 class="text-3xl font-bold tracking-tight">{{ 'projects.title' | translate }}</h1>

			@if (loading()) {
				<div class="flex flex-col" aria-hidden="true">
					@for (row of skeletonRows; track row; let last = $last) {
						<div class="flex flex-col md:flex-row items-center w-full gap-3 p-3 rounded-lg">
							<div class="w-full md:w-56 lg:w-64 shrink-0 aspect-video rounded-xl" [tuiSkeleton]="true"></div>

							<div class="flex flex-col justify-center gap-1.5 min-w-0 flex-1 w-full">
								<div class="h-4 w-40 rounded" [tuiSkeleton]="true"></div>
								<div class="h-6 w-2/3 rounded" [tuiSkeleton]="true"></div>
								<div class="h-3 w-full rounded" [tuiSkeleton]="true"></div>
								<div class="h-3 w-11/12 rounded" [tuiSkeleton]="true"></div>
								<div class="h-3 w-3/5 rounded" [tuiSkeleton]="true"></div>
							</div>

							<div class="flex flex-row md:flex-col flex-wrap items-end justify-end gap-1.5 shrink-0">
								<div class="h-6 w-16 rounded-full" [tuiSkeleton]="true"></div>
								<div class="h-6 w-16 rounded-full" [tuiSkeleton]="true"></div>
								<div class="h-6 w-16 rounded-full" [tuiSkeleton]="true"></div>
							</div>
						</div>

						@if (!last) {
							<div class="py-4">
								<hr />
							</div>
						}
					}
				</div>
			} @else if (projects().length === 0) {
				<div class="relative rounded-xl border border-border bg-surface px-8 pt-10 pb-3 text-center shadow-sm">
					<div
						class="absolute left-1/2 top-0 -translate-x-1/2 text-7xl font-serif leading-none text-muted/20"
					>
						"
					</div>

					<blockquote class="relative font-serif text-xl italic leading-relaxed text-foreground sm:text-2xl">
						"{{ 'projects.emptyQuote' | translate }}"
					</blockquote>

					<footer class="mt-6 text-sm font-medium tracking-wide text-muted">{{ 'projects.emptyAttribution' | translate }}</footer>
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
	private readonly tagService = inject(TagService);
	private readonly languageService = inject(LanguageService);
	private readonly translationService = inject(TranslationService);
	private readonly toastService = inject(TuiToastService);
	private readonly platformId = inject(PLATFORM_ID);
	private readonly seoService = inject(SeoService);

	projects = signal<ProjectDto[]>([]);
	loading = signal(false);
	tagMap = signal<Map<string, TagDto>>(new Map());

	protected readonly skeletonRows = [1, 2, 3, 4, 5];

	page = signal(0);
	totalPages = signal(1);
	totalElements = signal(0);

	cardItems = computed<ContentCardItem[]>(() => {
		const tags = this.tagMap();
		const lang = this.languageService.language();
		return this.projects().map(project => ({
			slug: project.slug,
			title: firstTranslation(project.translations)?.title ?? '',
			excerpt: firstTranslation(project.translations)?.summary ?? excerpt(firstTranslation(project.translations)?.description ?? ''),
			imageUrl: project.logoUrl || project.bannerUrl,
			date: project.createdAt,
			routePrefix: this.languageService.prefixed('/project'),
			metaIcon: EyeIcon,
			metaText: `${project.viewCount} ${this.translationService.translate('common.views', undefined, lang)}`,
			chips: (project.tagIds ?? []).map(id => ({
				icon: SourceCodeIcon,
				label: tagNameOf(tags.get(id), lang),
			})),
		}));
	});

	constructor() {
		this.seoService.setPageMeta({
			title: 'Projects',
			description: 'I write about programming, technology, and the projects I build, sharing things I learn, experiments I try, and ideas I find interesting along the way.',
		});

		effect(() => {
			this.languageService.language();
			this.page();
			this.load();
		});
	}

	load(): void {
		if (isPlatformServer(this.platformId)) {
			return;
		}

		this.loading.set(true);
		this.projectService
			.search({
				query: {},
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
					this.loadTags(res.content);
				},
			error: () => {
				this.loading.set(false);
				this.toastService.open(this.translationService.translate('projects.failedToLoad'), {
					appearance: 'error',
					autoClose: 5000,
					data: '@tui.circle-x',
				}).subscribe();
			},
			});
	}

	private loadTags(projects: ProjectDto[]): void {
		const ids = collectTagIds(projects);
		if (ids.length === 0) {
			this.tagMap.set(new Map());
			return;
		}
		this.tagService.batch(ids).subscribe({
			next: (tags) => this.tagMap.set(buildTagMap(tags)),
			error: () => this.tagMap.set(new Map()),
		});
	}
}
