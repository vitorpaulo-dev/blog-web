import {
	AfterViewInit,
	Component,
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

import { PostDto, PostService } from '../../data-access/post.service';

import { HugeiconsIconComponent } from '@hugeicons/angular';
import {
	ArrowLeft01Icon,
	Calendar01Icon,
	EyeIcon,
	SmilePlusIcon,
	Tag01Icon,
	Timer02Icon,
	Share01Icon,
} from '@hugeicons/core-free-icons';

import { TuiAppearance, TuiButton } from '@taiga-ui/core';
import { TuiChip } from '@taiga-ui/kit';

import { MarkdownService } from '../../data-access/markdown.service';
import { GiscusComponent } from '../../components/giscus.component';
import { LanguageService } from '../../../../core/i18n/language.service';

@Component({
	selector: 'app-post-detail',
	standalone: true,
	schemas: [CUSTOM_ELEMENTS_SCHEMA],
	imports: [CommonModule, RouterLink, TuiButton, HugeiconsIconComponent, TuiAppearance, TuiChip, GiscusComponent],
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
				<h1
					class="text-3xl md:text-4xl font-bold tracking-tight leading-tight max-w-4xl break-words"
				>
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

							{{ tag.translations[lang()]?.name }}
						</a>
					}
				</div>

				<article
					#articleEl
					class="prose prose-invert max-w-none mt-8 break-words"
					[innerHTML]="html()"
				></article>
				
				<hr class="my-8">

				<section class="flex flex-wrap items-center justify-between gap-2">
					<div class="flex flex-wrap gap-2">
						<button tuiChip class="inline-flex items-center gap-2">
							<img
								src="/reactions/red-heart.png"
								alt="Love"
								class="w-5"
							/>
							<span>Loved it</span>
							<span class="font-mono text-muted text-xs">{{ p.loveCount }}</span>
						</button>

						<button tuiChip class="inline-flex items-center gap-2">
							<img
								src="/reactions/party-popper.png"
								alt="Celebrate"
								class="w-5"
							/>
							<span>Hell yeah</span>
							<span class="font-mono text-muted text-xs">{{ p.celebrateCount }}</span>
						</button>

						<button tuiChip class="inline-flex items-center gap-2">
							<img
								src="/reactions/exploding-head.png"
								alt="Mind blown"
								class="w-5"
							/>
							<span>Mind blown</span>
							<span class="font-mono text-muted text-xs">{{ p.geniusCount }}</span>
						</button>

						<button tuiChip class="inline-flex items-center gap-2">
							<img
								src="/reactions/suffering-cat.webp"
								alt="Suffering cat"
								class="w-5"
							/>
							<span>What?!</span>
							<span class="font-mono text-muted text-xs">{{ p.helpCount }}</span>
						</button>
					</div>

					<button tuiChip class="inline-flex items-center gap-2" (click)="sharePost()">
						<hugeicons-icon [icon]="shareIcon" [size]="16" [strokeWidth]="2.5" />
						<span>Share</span>
					</button>
				</section>

				<hr class="my-8">

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
	private readonly platformId = inject(PLATFORM_ID);
	private readonly router = inject(Router);
	private readonly markdownService = inject(MarkdownService);
	private readonly languageService = inject(LanguageService);

	readonly isBrowser = isPlatformBrowser(this.platformId);

	readonly Calendar01Icon = Calendar01Icon;
	readonly EyeIcon = EyeIcon;
	readonly Tag01Icon = Tag01Icon;
	readonly ArrowLeft01Icon = ArrowLeft01Icon;
	readonly Timer02Icon = Timer02Icon;
	readonly shareIcon = Share01Icon;

	readonly post = signal<PostDto | null>(null);
	readonly loading = signal(true);
	readonly error = signal<string | null>(null);
	readonly html = signal<string | SafeHtml>('');
	readonly lang = this.languageService.language.asReadonly();
	readonly slug = this.route.snapshot.paramMap.get('slug');

	@ViewChild('articleEl')
	articleEl!: ElementRef<HTMLElement>;

	content() {
		const p = this.post();
		if (!p) return null;
		return p.translations?.[this.lang()] ?? null;
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
			},
			error: () => {
				this.loading.set(false);
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
		navigator.clipboard.writeText(text).then(() => {
			console.log('Link copied to clipboard');
		}).catch(() => {
			const textarea = document.createElement('textarea');
			textarea.value = text;
			document.body.appendChild(textarea);
			textarea.select();
			document.execCommand('copy');
			document.body.removeChild(textarea);
		});
	}

	protected readonly SmilePlusIcon = SmilePlusIcon;
}
