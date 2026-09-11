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

import { PostDto, PostService, ProjectDto } from '../../data-access/post.service';
import { ProjectService } from '../../../projects/data-access/project.service';

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
import { GiscusComponent } from '../../components/giscus.component';
import { LanguageService } from '../../../../core/i18n/language.service';
import { excerpt, firstTranslation } from '../../../../core/util/text.util';
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
		ContentCardComponent,
	],
	template: `
		<div class="max-w-4xl mx-auto">
			<a routerLink="/post" tuiButton tuiAppearance="flat" size="s" class="mb-4 gap-1">
				<hugeicons-icon [icon]="ArrowLeft01Icon" [size]="16" [strokeWidth]="1.5" />

				Back to posts
			</a>

			@if (loading()) {
				<p class="text-muted">Loading...</p>
			} @else if (error()) {
				<p class="text-red-400" role="alert">
					{{ error() }}
				</p>
			} @else if (post(); as p) {
				@if (p.bannerUrl) {
					<img
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

						{{ p.createdAt | date: 'dd MMM yyyy' }}
					</span>

					<span>·</span>

					<span class="inline-flex items-center gap-1">
						<hugeicons-icon [icon]="Timer02Icon" [size]="16" [strokeWidth]="1.5" />

						{{ p.estimatedReading || 5 }} min
					</span>

					<span>·</span>

					<span class="inline-flex items-center gap-1">
						<hugeicons-icon [icon]="EyeIcon" [size]="16" [strokeWidth]="1.5" />

						{{ p.viewCount }} views
					</span>

					<span>·</span>

					<span class="inline-flex items-center gap-1">
						<hugeicons-icon [icon]="SmilePlusIcon" [size]="16" [strokeWidth]="1.5" />

						{{ p.reactionCount }} reactions
					</span>
				</div>

				<div class="mt-3 flex flex-wrap gap-2">
					@for (author of p.authors; track author.id) {
						<a tuiChip [href]="'/author/' + author.slug">
							<img [src]="author.avatarUrl" class="rounded-xl" [alt]="author.name" />

							{{ author.name }}
						</a>
					}

					@for (tag of p.tags; track tag.id) {
						<a tuiChip [href]="'/tag/' + tag.slug">
							<hugeicons-icon [icon]="Tag01Icon" [size]="12" [strokeWidth]="1.5" />

							{{ getFirstTranslation(tag.translations)?.name }}
						</a>
					}
				</div>

				<article
					#articleEl
					class="prose prose-invert max-w-none mt-8 break-words"
					[innerHTML]="html()"
				></article>

				@if (projects().length > 0) {
					<hr class="my-8" />
					<section>
						<h3 class="text-lg font-semibold mb-4 flex items-center gap-2">
							<hugeicons-icon [icon]="projectsIcon" [size]="20" [strokeWidth]="1.5" />
							Related Projects
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
					<div class="flex flex-wrap gap-2">
						<button tuiChip class="inline-flex items-center gap-2">
							<img src="/reactions/red-heart.png" alt="Love" class="w-5" />
							<span>Loved it</span>
							<span class="font-mono text-muted text-xs">{{ p.loveCount }}</span>
						</button>

						<button tuiChip class="inline-flex items-center gap-2">
							<img src="/reactions/party-popper.png" alt="Celebrate" class="w-5" />
							<span>Hell yeah</span>
							<span class="font-mono text-muted text-xs">{{ p.celebrateCount }}</span>
						</button>

						<button tuiChip class="inline-flex items-center gap-2">
							<img src="/reactions/exploding-head.png" alt="Mind blown" class="w-5" />
							<span>Mind blown</span>
							<span class="font-mono text-muted text-xs">{{ p.geniusCount }}</span>
						</button>

						<button tuiChip class="inline-flex items-center gap-2">
							<img src="/reactions/suffering-cat.webp" alt="Suffering cat" class="w-5" />
							<span>What?!</span>
							<span class="font-mono text-muted text-xs">{{ p.helpCount }}</span>
						</button>
					</div>

					<button tuiChip class="inline-flex items-center gap-2" (click)="sharePost()">
						<hugeicons-icon [icon]="shareIcon" [size]="16" [strokeWidth]="2.5" />
						<span>Share</span>
					</button>
				</section>

				<hr class="my-8" />

				<div>
					<h3 class="text-lg font-semibold mb-3">Comments</h3>

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
	private readonly platformId = inject(PLATFORM_ID);
	private readonly router = inject(Router);
	private readonly markdownService = inject(MarkdownService);
	private readonly languageService = inject(LanguageService);
	private readonly toastService = inject(TuiToastService);

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
	readonly lang = this.languageService.language.asReadonly();
	readonly slug = this.route.snapshot.paramMap.get('slug');

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
			chips: (project.programmingLanguage || '')
				.split(',')
				.filter(Boolean)
				.map(lang => ({
					icon: SourceCodeIcon,
					label: lang.trim(),
				})),
		}))
	);

	@ViewChild('articleEl')
	articleEl!: ElementRef<HTMLElement>;

	content() {
		const p = this.post();
		if (!p) return null;
		return p.translations ? (Object.values(p.translations)[0] ?? null) : null;
	}

	projectContent(project?: ProjectDto) {
		if (!project) return null;
		return project.translations ? (Object.values(project.translations)[0] ?? null) : null;
	}

	getFirstTranslation(translations?: Record<string, { name?: string }>) {
		return translations ? (Object.values(translations)[0] ?? null) : null;
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
		this.postService.getBySlug(slug, this.lang()).subscribe({
			next: (post) => {
				this.post.set(post);
				const c = this.content();
				if (c) {
					void this.renderMarkdown(c.content);
				}
				if (post.projectIds && post.projectIds.length > 0) {
					this.projectService.getByIds(post.projectIds, this.lang()).subscribe({
						next: (projects) => this.projects.set(projects),
						error: () => this.projects.set([]),
					});
				}
			},
			error: () => {
				this.loading.set(false);
				this.toastService
					.open('Failed to load post. Please try again.', {
						appearance: 'error',
						autoClose: 5000,
						data: '@tui.circle-x',
					})
					.subscribe();
				void this.router.navigate(['']);
			},
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
			this.error.set('Sorry, this post could not be rendered.');
			this.toastService
				.open('Sorry, this post could not be rendered.', {
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
						.open('Link copied to clipboard!', {
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
				.open('Link copied to clipboard!', {
					appearance: 'success',
					autoClose: 3000,
					data: '@tui.check',
				})
				.subscribe();
		} catch {
			this.toastService
				.open('Failed to copy link', {
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
