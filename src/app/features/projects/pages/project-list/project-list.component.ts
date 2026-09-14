import { Component, computed, effect, inject, PLATFORM_ID, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TuiChip, TuiPagination, TuiToastService } from '@taiga-ui/kit';
import { HugeiconsIconComponent } from '@hugeicons/angular';
import { EyeIcon, Loading03Icon, SourceCodeIcon } from '@hugeicons/core-free-icons';
import { CommonModule, isPlatformServer } from '@angular/common';
import { LanguageService } from '../../../../core/i18n/language.service';
import { TranslatePipe } from '../../../../core/i18n/translate.pipe';
import { TranslationService } from '../../../../core/i18n/translation.service';
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
		HugeiconsIconComponent,
		TuiPagination,
		TuiChip,
		ContentCardComponent,
		TranslatePipe,
	],
	template: `
		<div class="py-2">
			<h1 class="text-3xl font-bold tracking-tight">{{ 'projects.title' | translate }}</h1>

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

	projects = signal<ProjectDto[]>([]);
	loading = signal(false);
	tagMap = signal<Map<string, TagDto>>(new Map());

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
			routePrefix: '/project',
			metaIcon: EyeIcon,
			metaText: `${project.viewCount} ${this.translationService.translate('common.views', undefined, lang)}`,
			chips: (project.tagIds ?? []).map(id => ({
				icon: SourceCodeIcon,
				label: tagNameOf(tags.get(id), lang),
			})),
		}));
	});

	constructor() {
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

	protected readonly Loading03Icon = Loading03Icon;
}
