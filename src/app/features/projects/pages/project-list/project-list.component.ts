import { Component, computed, effect, inject, makeStateKey, PendingTasks, PLATFORM_ID, signal, TransferState } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { TuiPagination, TuiSkeleton, TuiToastService } from '@taiga-ui/kit';
import { EyeIcon, SourceCodeIcon } from '@hugeicons/core-free-icons';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { GenericPageableResponse } from '../../../posts/data-access/post.service';
import { LanguageService } from '../../../../core/i18n/language.service';
import { TranslatePipe } from '../../../../core/i18n/translate.pipe';
import { TranslationService } from '../../../../core/i18n/translation.service';
import { SeoService } from '../../../../core/seo/seo.service';
import { UploadService } from '../../../../core/upload/upload.service';
import { isRawKey } from '../../../../shared/directives/image-sign.directive';
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
						<app-content-card [item]="card" [showDivider]="index > 0" [eager]="index === 0" />
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
	private readonly pendingTasks = inject(PendingTasks);
	private readonly transferState = inject(TransferState);
	private readonly uploadService = inject(UploadService);
	private readonly searchSeedKey = makeStateKey<GenericPageableResponse<ProjectDto>>('project-list-search');
	private readonly tagsSeedKey = makeStateKey<TagDto[]>('project-list-tags');

	private skipNextLoad = false;

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

		this.applyServerSeed();

		effect(() => {
			this.languageService.language();
			this.page();
			this.load();
		});
	}

	load(): void {
		if (this.skipNextLoad) {
			this.skipNextLoad = false;
			return;
		}

		this.pendingTasks.run(async () => {
			this.loading.set(true);

			try {
				const res = await firstValueFrom(this.projectService.search({
					query: {},
					page: this.page(),
					size: 10,
					sort: 'createdAt',
					direction: 'DESC',
				}));

				if (!isPlatformBrowser(this.platformId)) {
					await this.signFirstBanner(res);
				}

				this.projects.set(res.content);
				this.totalPages.set(res.totalPages);
				this.totalElements.set(res.totalElements);
				this.loading.set(false);
				await this.loadTags(res.content);

				if (!isPlatformBrowser(this.platformId)) {
					this.transferState.set(this.searchSeedKey, res);
				}
			} catch {
				this.loading.set(false);

				if (!isPlatformBrowser(this.platformId)) {
					return;
				}

				this.toastService.open(this.translationService.translate('projects.failedToLoad'), {
					appearance: 'error',
					autoClose: 5000,
					data: '@tui.circle-x',
				}).subscribe();
			}
		});
	}

	private applyServerSeed(): void {
		if (!isPlatformBrowser(this.platformId)) {
			return;
		}

		const seeded = this.transferState.get(this.searchSeedKey, null);

		if (!seeded) {
			return;
		}

		this.skipNextLoad = true;
		this.projects.set(seeded.content);
		this.totalPages.set(seeded.totalPages);
		this.totalElements.set(seeded.totalElements);
		this.loading.set(false);

		const seededTags = this.transferState.get(this.tagsSeedKey, null);

		if (seededTags) {
			this.tagMap.set(buildTagMap(seededTags));
		}
	}

	private async loadTags(projects: ProjectDto[]): Promise<void> {
		const ids = collectTagIds(projects);

		if (ids.length === 0) {
			this.tagMap.set(new Map());
			return;
		}

		try {
			const tags = await firstValueFrom(this.tagService.batch(ids));
			this.tagMap.set(buildTagMap(tags));

			if (!isPlatformBrowser(this.platformId)) {
				this.transferState.set(this.tagsSeedKey, tags);
			}
		} catch {
			this.tagMap.set(new Map());
		}
	}

	private async signFirstBanner(res: GenericPageableResponse<ProjectDto>): Promise<void> {
		const first = res.content[0];
		const key = first ? first.logoUrl || first.bannerUrl : null;

		if (!key || !isRawKey(key)) {
			return;
		}

		try {
			const urls = await firstValueFrom(this.uploadService.sign([key]));
			const url = urls[key];

			if (!url) {
				return;
			}

			if (first.logoUrl) {
				first.logoUrl = url;
			} else {
				first.bannerUrl = url;
			}
		} catch {}
	}
}
