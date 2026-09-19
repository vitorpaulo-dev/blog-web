import {
	AfterViewInit,
	Component, computed,
	CUSTOM_ELEMENTS_SCHEMA,
	effect,
	ElementRef,
	inject,
	PLATFORM_ID,
	signal,
	ViewChild,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { type SafeHtml } from '@angular/platform-browser';

import { PostDto, PostService, ProjectDto, ReactionResponse, ReactionType } from '../../data-access/post.service';
import { ProjectService } from '../../../projects/data-access/project.service';
import { TagService, TagDto } from '../../../tags/data-access/tag.service';

import { HugeiconsIconComponent } from '@hugeicons/angular';
import {
	ArrowLeft01Icon,
	Calendar01Icon,
	EyeIcon,
	SmilePlusIcon,
	Tag01Icon,
	Timer02Icon,
	Share01Icon,
	Layers01Icon,
	GithubIcon,
	GlobalIcon,
	SourceCodeIcon,
} from '@hugeicons/core-free-icons';

import { TuiAppearance, TuiButton } from '@taiga-ui/core';
import { TuiChip, TuiToastService } from '@taiga-ui/kit';

import { MarkdownService } from '../../data-access/markdown.service';
import { AudioPlayerComponent } from '../../components/audio-player.component';
import { ImageSignContainerDirective, ImageSignDirective } from '../../../../shared/directives/image-sign.directive';
import { GiscusComponent } from '../../components/giscus.component';
import { LanguageService } from '../../../../core/i18n/language.service';
import { TranslatePipe } from '../../../../core/i18n/translate.pipe';
import { TranslationService } from '../../../../core/i18n/translation.service';
import { LocalizedDatePipe } from '../../../../core/i18n/localized-date.pipe';
import { SeoService } from '../../../../core/seo/seo.service';
import { excerpt, firstTranslation } from '../../../../core/util/text.util';
import { buildTagMap, collectTagIds, tagName as tagNameOfUtil } from '../../../../core/util/tag.util';
import {
	ContentCardComponent,
	ContentCardItem,
} from '../../../../shared/components/content-card/content-card.component';

@Component({
	selector: 'app-post-detail',
	standalone: true,
	schemas: [CUSTOM_ELEMENTS_SCHEMA],
	imports: [
		CommonModule,
		RouterLink,
		TuiButton,
		HugeiconsIconComponent,
		TuiAppearance,
		TuiChip,
		GiscusComponent,
		AudioPlayerComponent,
		ContentCardComponent,
		TranslatePipe,
		LocalizedDatePipe,
		ImageSignContainerDirective,
		ImageSignDirective,
	],
	template: `
		<div class="max-w-4xl mx-auto">
			<a [routerLink]="postListLink()" tuiButton tuiAppearance="flat" size="s" class="mb-4 gap-1">
				<hugeicons-icon [icon]="ArrowLeft01Icon" [size]="16" [strokeWidth]="1.5" />

				{{ 'posts.backToList' | translate }}
			</a>

			@if (loading()) {
				<p class="text-muted">{{ 'common.loading' | translate }}</p>
			} @else if (error()) {
				<p class="text-red-400" role="alert">
					{{ error() }}
				</p>
			} @else if (post(); as p) {
				@if (p.bannerUrl) {
					<img
						[appImageSign]="p.bannerUrl"
						[src]="p.bannerUrl"
						[alt]="content()?.title"
						class="w-full aspect-video object-cover rounded-xl border border-border mb-6"
					/>
				}
				<h1 class="text-3xl md:text-4xl font-bold tracking-tight leading-tight max-w-4xl break-words">
					{{ content()?.title }}
				</h1>
				
				<div class="mt-4 flex flex-wrap items-center gap-3 text-sm text-muted">
					<span class="inline-flex items-center gap-1">
						<hugeicons-icon [icon]="Calendar01Icon" [size]="16" [strokeWidth]="1.5" />

						{{ p.createdAt | localizedDate: 'dd MMM yyyy' }}
					</span>

					<span>·</span>

					<span class="inline-flex items-center gap-1">
						<hugeicons-icon [icon]="Timer02Icon" [size]="16" [strokeWidth]="1.5" />

						{{ p.estimatedReading || 5 }} {{ 'common.min' | translate }}
					</span>

					<span>·</span>

					<span class="inline-flex items-center gap-1">
						<hugeicons-icon [icon]="EyeIcon" [size]="16" [strokeWidth]="1.5" />

						{{ p.viewCount }} {{ 'common.views' | translate }}
					</span>

					<span>·</span>

					<span class="inline-flex items-center gap-1">
						<hugeicons-icon [icon]="SmilePlusIcon" [size]="16" [strokeWidth]="1.5" />

						{{ p.reactionCount }} {{ 'common.reactions' | translate }}
					</span>
				</div>

				<div class="mt-3 flex flex-wrap gap-2">
					@for (author of p.authors; track author.id) {
						<a tuiChip [href]="'/author/' + author.slug">
							<img [src]="author.avatarUrl" class="rounded-xl" [alt]="author.name" loading="lazy" />

							{{ author.name }}
						</a>
					}

					@for (tag of postTags(); track tag.id) {
						<span tuiChip>
							<hugeicons-icon [icon]="Tag01Icon" [size]="12" [strokeWidth]="1.5" />
		
							{{ tagNameOf(tag, lang()) }}
						</span>
					}
				</div>

				<app-audio-player [audio]="p.audio" [estimatedReading]="p.estimatedReading" />

				<article
					#articleEl
					class="prose prose-invert max-w-none mt-8 break-words"
					[innerHTML]="html()" appImageSignContainer
				></article>

				@if (projects().length > 0) {
					<hr class="my-8" />
					<section>
						<h3 class="text-lg font-semibold mb-4 flex items-center gap-2">
							<hugeicons-icon [icon]="projectsIcon" [size]="20" [strokeWidth]="1.5" />
							{{ 'posts.relatedProjects' | translate }}
						</h3>
						<div class="flex flex-col gap-4">
							@for (card of cardItems(); track card.slug; let index = $index) {
								<app-content-card [item]="card" [showDivider]="index > 0" class="border border-accent-secondary rounded-lg" />
							}
						</div>
					</section>
				}

				<hr class="my-8" />

				<section class="flex flex-wrap items-center justify-between gap-2">
					@if (reactionError(); as reactionErrorText) {
						<p class="w-full text-red-400" role="alert">{{ reactionErrorText }}</p>
					}
					<div class="flex flex-wrap gap-2">
						<button tuiChip class="inline-flex items-center gap-2" [disabled]="reactionBusy()" (click)="onReact('LOVE')">
							<img loading="lazy" src="/reactions/red-heart.png" [alt]="'common.reactionLovedIt' | translate" class="w-5" />
							<span>{{ 'common.reactionLovedIt' | translate }}</span>
							<span class="font-mono text-muted text-xs">{{ p.loveCount }}</span>
						</button>

						<button tuiChip class="inline-flex items-center gap-2" [disabled]="reactionBusy()" (click)="onReact('CELEBRATE')">
							<img loading="lazy" src="/reactions/party-popper.png" [alt]="'common.reactionHellYeah' | translate" class="w-5" />
							<span>{{ 'common.reactionHellYeah' | translate }}</span>
							<span class="font-mono text-muted text-xs">{{ p.celebrateCount }}</span>
						</button>

						<button tuiChip class="inline-flex items-center gap-2" [disabled]="reactionBusy()" (click)="onReact('GENIUS')">
							<img loading="lazy" src="/reactions/exploding-head.png" [alt]="'common.reactionMindBlown' | translate" class="w-5" />
							<span>{{ 'common.reactionMindBlown' | translate }}</span>
							<span class="font-mono text-muted text-xs">{{ p.geniusCount }}</span>
						</button>

						<button tuiChip class="inline-flex items-center gap-2" [disabled]="reactionBusy()" (click)="onReact('HELP')">
							<img loading="lazy" src="/reactions/suffering-cat.webp" [alt]="'common.reactionWhat' | translate" class="w-5" />
							<span>{{ 'common.reactionWhat' | translate }}</span>
							<span class="font-mono text-muted text-xs">{{ p.helpCount }}</span>
						</button>
					</div>

					<button tuiChip class="inline-flex items-center gap-2" (click)="sharePost()">
						<hugeicons-icon [icon]="shareIcon" [size]="16" [strokeWidth]="2.5" />
						<span>{{ 'common.share' | translate }}</span>
					</button>
				</section>

				<hr class="my-8" />

				<div>
					<h3 class="text-lg font-semibold mb-3">{{ 'posts.comments' | translate }}</h3>

					<app-giscus></app-giscus>
				</div>
			}
		</div>
	`,
})
export class PostDetailComponent implements AfterViewInit {
	private readonly route = inject(ActivatedRoute);
	private readonly postService = inject(PostService);
	private readonly projectService = inject(ProjectService);
	private readonly tagService = inject(TagService);
	private readonly platformId = inject(PLATFORM_ID);
	private readonly router = inject(Router);
	private readonly markdownService = inject(MarkdownService);
	private readonly languageService = inject(LanguageService);
	private readonly translationService = inject(TranslationService);
	private readonly toastService = inject(TuiToastService);
	private readonly seoService = inject(SeoService);

	readonly isBrowser = isPlatformBrowser(this.platformId);

	readonly Calendar01Icon = Calendar01Icon;
	readonly EyeIcon = EyeIcon;
	readonly Tag01Icon = Tag01Icon;
	readonly ArrowLeft01Icon = ArrowLeft01Icon;
	readonly Timer02Icon = Timer02Icon;
	readonly shareIcon = Share01Icon;
	readonly projectsIcon = Layers01Icon;

	readonly post = signal<PostDto | null>(null);
	readonly projects = signal<ProjectDto[]>([]);
	readonly loading = signal(true);
	readonly error = signal<string | null>(null);
	readonly html = signal<string | SafeHtml>('');
	readonly tagMap = signal<Map<string, TagDto>>(new Map());
	readonly projectTagMap = signal<Map<string, TagDto>>(new Map());
	readonly reactionBusy = signal(false);
	readonly reactionError = signal<string | null>(null);
	readonly lang = this.languageService.language.asReadonly();
	readonly postListLink = computed(() => this.languageService.prefixed('/post'));
	readonly projectListLink = computed(() => this.languageService.prefixed('/project'));
	readonly slug = this.route.snapshot.paramMap.get('slug');

	readonly postTags = computed<TagDto[]>(() => {
		const post = this.post();
		if (!post) return [];
		const tags = this.tagMap();
		return (post.tagIds ?? []).map(id => tags.get(id)).filter((t): t is TagDto => !!t);
	});

	cardItems = computed<ContentCardItem[]>(() => {
		const tags = this.projectTagMap();
		const lang = this.lang();
		return this.projects().map(project => ({
			slug: project.slug,
			title: firstTranslation(project.translations)?.title ?? '',
			excerpt: excerpt(firstTranslation(project.translations)?.description ?? ''),
			imageUrl: project.logoUrl || project.bannerUrl,
			date: project.createdAt,
			routePrefix: this.projectListLink(),
			metaIcon: EyeIcon,
			metaText: `${project.viewCount} ${this.translationService.translate('common.views', undefined, lang)}`,
			chips: (project.tagIds ?? []).map(id => ({
				icon: SourceCodeIcon,
				label: tagNameOfUtil(tags.get(id), lang),
			})),
		}));
	});

	@ViewChild('articleEl')
	articleEl!: ElementRef<HTMLElement>;

	content() {
		const p = this.post();
		if (!p) return null;
		return firstTranslation(p.translations) ?? null;
	}

	tagNameOf(tag: TagDto | undefined, lang: string): string {
		return tagNameOfUtil(tag, lang as never);
	}

	constructor() {
		if (!this.slug) {
			void this.router.navigate(['']);
			return;
		}

		effect(() => {
			this.loadPost(this.slug!);
		});
	}

	private loadPost(slug: string): void {
		this.loading.set(true);
		this.postService.getBySlug(slug).subscribe({
			next: (post) => {
				this.post.set(post);
				const c = this.content();
				if (c) {
					void this.renderMarkdown(c.content);
				}
				this.setPageMeta(post);
				this.loadTags(post);
				if (post.projectIds && post.projectIds.length > 0) {
					this.projectService.getByIds(post.projectIds, this.lang()).subscribe({
						next: (projects) => {
							this.projects.set(projects);
							this.loadProjectTags(projects);
						},
						error: () => this.projects.set([]),
					});
				}
			},
			error: () => {
				this.loading.set(false);
				this.toastService
					.open(this.translationService.translate('posts.failedToLoad'), {
						appearance: 'error',
						autoClose: 5000,
						data: '@tui.circle-x',
					})
					.subscribe();
				void this.router.navigate(['']);
			},
		});
	}

	private setPageMeta(post: PostDto): void {
		const content = this.content();

		this.seoService.setPageMeta({
			title: content?.title ?? post.slug,
			description: content?.summary || excerpt(content?.content) || '',
			ogType: 'article',
			image: post.bannerUrl ?? null,
			publishedTime: post.createdAt,
			modifiedTime: post.updatedAt,
			authorName: post.authors?.[0]?.name ?? null,
		});
	}

	private loadTags(post: PostDto): void {
		const ids = collectTagIds([post]);
		if (ids.length === 0) {
			this.tagMap.set(new Map());
			this.seoService.setArticleTags([]);
			return;
		}
		this.tagService.batch(ids).subscribe({
			next: (tags) => {
				this.tagMap.set(buildTagMap(tags));
				this.seoService.setArticleTags(
					tags.map((tag) => tagNameOfUtil(tag, this.lang())).filter((name) => name.length > 0),
				);
			},
			error: () => this.tagMap.set(new Map()),
		});
	}

	private loadProjectTags(projects: ProjectDto[]): void {
		const ids = collectTagIds(projects);
		if (ids.length === 0) {
			this.projectTagMap.set(new Map());
			return;
		}
		this.tagService.batch(ids).subscribe({
			next: (tags) => this.projectTagMap.set(buildTagMap(tags)),
			error: () => this.projectTagMap.set(new Map()),
		});
	}

	readonly onReact = async (reactionType: ReactionType): Promise<void> => {
		const post = this.post();
		if (!this.isBrowser || !post || this.reactionBusy()) return;

		this.reactionBusy.set(true);
		this.reactionError.set(null);

		try {
			const result = await this.postService.reactTo(this.slug!, reactionType);
			this.applyReactionCounts(post, result);
		} catch {
			const message = this.translationService.translate('common.reactionFailed');
			this.reactionError.set(message);
			this.toastService.open(message, {
				appearance: 'error',
				autoClose: 5000,
				data: '@tui.circle-x',
			}).subscribe();
		} finally {
			this.reactionBusy.set(false);
		}
	};

	private applyReactionCounts(post: PostDto, result: ReactionResponse): void {
		this.post.set({
			...post,
			loveCount: result.loveCount,
			celebrateCount: result.celebrateCount,
			geniusCount: result.geniusCount,
			helpCount: result.helpCount,
			reactionCount: result.reactionCount,
		});
	}

	ngAfterViewInit(): void {
		if (this.isBrowser) {
			setTimeout(() => {
				void this.markdownService.renderArticle(this.articleEl);
			}, 1000);
		}
	}

	private async renderMarkdown(content: string): Promise<void> {
		this.error.set(null);

		try {
			this.html.set(await this.markdownService.renderMarkdown(content, this.isBrowser));
			this.loading.set(false);
		} catch (error) {
			this.loading.set(false);
			this.error.set(this.translationService.translate('posts.failedToRender'));
			this.toastService
				.open(this.translationService.translate('posts.failedToRender'), {
					appearance: 'error',
					autoClose: 5000,
					data: '@tui.circle-x',
				})
				.subscribe();
		}
	}

	sharePost(): void {
		if (!this.isBrowser) return;

		const post = this.post();
		if (!post) return;

		const url = window.location.href;
		const text = this.content()?.title || '';

		if (navigator.share) {
			navigator.share({ title: text, url }).catch(() => {
				this.copyToClipboard(url);
			});
		} else {
			this.copyToClipboard(url);
		}
	}

	private copyToClipboard(text: string): void {
		if (navigator.clipboard && navigator.clipboard.writeText) {
			navigator.clipboard
				.writeText(text)
				.then(() => {
					this.toastService
						.open(this.translationService.translate('common.linkCopied'), {
							appearance: 'success',
							autoClose: 3000,
							data: '@tui.check',
						})
						.subscribe();
				})
				.catch(() => {
					this.fallbackCopy(text);
				});
		} else {
			this.fallbackCopy(text);
		}
	}

	private fallbackCopy(text: string): void {
		const textarea = document.createElement('textarea');
		textarea.value = text;
		textarea.style.position = 'fixed';
		textarea.style.opacity = '0';
		document.body.appendChild(textarea);
		textarea.select();
		try {
			document.execCommand('copy');
			this.toastService
				.open(this.translationService.translate('common.linkCopied'), {
					appearance: 'success',
					autoClose: 3000,
					data: '@tui.check',
				})
				.subscribe();
		} catch {
			this.toastService
				.open(this.translationService.translate('common.failedToCopy'), {
					appearance: 'error',
					autoClose: 3000,
					data: '@tui.circle-x',
				})
				.subscribe();
		}
		document.body.removeChild(textarea);
	}

	protected readonly SmilePlusIcon = SmilePlusIcon;
	protected readonly githubIcon = GithubIcon;
	protected readonly websiteIcon = GlobalIcon;
	protected readonly SourceCodeIcon = SourceCodeIcon;
	protected readonly excerpt = excerpt;
}
