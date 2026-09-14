import { Component, computed, effect, inject, PLATFORM_ID, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TuiAppearance, TuiButton, TuiError, TuiInput, TuiLink, TuiTextfield } from '@taiga-ui/core';
import { HugeiconsIconComponent } from '@hugeicons/angular';
import {
	ArrowRight01Icon,
	Database01Icon,
	GithubIcon,
	Loading03Icon,
	Mail01Icon,
	RssConnected01Icon,
	SparklesIcon,
	Tag01Icon,
	Timer02Icon,
} from '@hugeicons/core-free-icons';
import { PostDto, PostService } from '../../../posts/data-access/post.service';
import { TagService, TagDto } from '../../../tags/data-access/tag.service';
import { RouterLink } from '@angular/router';
import { CommonModule, isPlatformServer } from '@angular/common';
import { TuiCardLarge, TuiForm } from '@taiga-ui/layout';
import { TuiChip, TuiToastService } from '@taiga-ui/kit';
import { excerpt, firstTranslation } from '../../../../core/util/text.util';
import { buildTagMap, collectTagIds, tagName as tagNameOf } from '../../../../core/util/tag.util';
import { LanguageService } from '../../../../core/i18n/language.service';
import { TranslatePipe } from '../../../../core/i18n/translate.pipe';
import { TranslationService } from '../../../../core/i18n/translation.service';
import { ContentCardComponent, ContentCardItem } from '../../../../shared/components/content-card/content-card.component';

@Component({
	selector: 'app-home-page',
	standalone: true,
	imports: [
		CommonModule,
		RouterLink,
		ReactiveFormsModule,
		TuiButton,
		TuiTextfield,
		HugeiconsIconComponent,
		TuiForm,
		TuiInput,
		TuiAppearance,
		ContentCardComponent,
		TranslatePipe,
	],
	template: `
		<div class="min-h-dvh bg-background text-foreground">
		@if (featured().length > 0) {
			<section aria-label="Featured" class="mx-auto pt-2 flex flex-col gap-2">
				@for (post of featured(); track post.id) {
					<a
						[routerLink]="[postListLink(), post.slug]"
						class="group rounded-xl border border-accent bg-surface transition-all hover:opacity-80 px-2 md:px-4 py-3 flex flex-row md:items-center justify-between gap-3"
					>
						<div class="text-sm inline-flex items-center font-mono">
							<hugeicons-icon [icon]="SparklesIcon" [size]="26" [strokeWidth]="1.5" />
							<p class="ml-2 text-foreground font-bold truncate max-w-5xl">
								{{ firstTranslation(post.translations)?.title }}
							</p>
						</div>

						<hugeicons-icon [icon]="ArrowRight01Icon" [size]="22" [strokeWidth]="1.5" />
					</a>
				}
			</section>
		}
			<section aria-labelledby="recent-title" class="mx-auto md:pt-6 pt-4 pb-6 md:pb-10">
				<div class="w-full inline-flex items-end justify-between gap-4 mb-6">
					<h2 class="text-2xl md:text-3xl font-bold tracking-tight text-foreground">{{ 'home.recentPosts' | translate }}</h2>
					<button
						tuiButton
						size="s"
						tuiAppearance="flat"
						[routerLink]="postListLink()"
						[disabled]="postsLoading() || posts().length === 0"
					>
						{{ 'home.allPosts' | translate }}
						<hugeicons-icon [icon]="ArrowRight01Icon" [size]="16" [strokeWidth]="1.5" />
					</button>
				</div>
				@if (postsLoading()) {
					<div class="text-muted text-sm w-full inline-flex justify-center items-center h-full">
						<hugeicons-icon [icon]="Loading03Icon" [size]="32" [strokeWidth]="1.5" />
					</div>
				} @else if (posts().length === 0) {
					<div
						class="relative rounded-xl border border-border bg-surface px-8 pt-10 pb-3 text-center shadow-sm"
					>
						<div
							class="absolute left-1/2 top-0 -translate-x-1/2 text-7xl font-serif leading-none text-muted/20"
						>
							"
						</div>

					<blockquote
						class="relative font-serif text-xl italic leading-relaxed text-foreground sm:text-2xl"
					>
						"{{ 'home.emptyQuote' | translate }}"
					</blockquote>

					<footer class="mt-6 text-sm font-medium tracking-wide text-muted">{{ 'home.emptyAttribution' | translate }}</footer>
					</div>
				} @else {
					<div class="w-full">
						@for (card of cardItems(); track card.slug; let index = $index) {
							<app-content-card [item]="card" [showDivider]="index > 0" />
						}
					</div>
				}
			</section>
			<section aria-labelledby="about-title" class="mx-auto py-6 md:py-10 border-t border-border">
				<div class="grid grid-cols-1 md:grid-cols-3 gap-8">
					<img
						src="vitor-avatar.png"
						loading="lazy"
						class="col-span-1 md:col-span-1 select-none pointer-events-none object-cover rounded-xl border border-border bg-surface overflow-hidden flex items-center justify-center text-muted"
					/>
					<div class="col-span-1 md:col-span-2">
						<p class="text-xs uppercase tracking-widest text-accent font-light mb-2 font-mono">{{ 'home.aboutEyebrow' | translate }}</p>
						<h2 class="text-2xl md:text-3xl font-bold tracking-tight text-foreground">{{ 'home.aboutHeading' | translate }}</h2>
						<div class="mt-4 space-y-4 text-muted leading-relaxed">
							<p class="whitespace-pre-line">{{ 'home.aboutBody' | translate }}</p>
						</div>
					</div>
				</div>
			</section>
			<section aria-labelledby="newsletter-title" class="py-6 md:py-10 border-t border-border">
				<div class="grid grid-cols-1 md:grid-cols-3 gap-8">
					<div class="col-span-1 md:col-span-2">
					<p class="text-xs uppercase tracking-widest text-accent font-light mb-2 font-mono">
						{{ 'home.newsletterEyebrow' | translate }}
					</p>
						<h1 class="font-bold text-4xl whitespace-pre-line">
							{{ 'home.newsletterHeading' | translate }}
						</h1>
						<p class="text-muted font-mono">
							{{ 'home.newsletterDescription' | translate }}
						</p>
					</div>
					<div tuiAppearance="outline" class="bg-surface border border-border p-4 rounded-xl">
						<form
							tuiForm="m"
							[formGroup]="newsletterForm"
							(ngSubmit)="subscribe()"
							[attr.aria-label]="'home.newsletterEyebrow' | translate"
						>
							<label tuiLabel>
							<p class="text-lg font-medium font-mono py-1.5 text-muted">
								{{ 'home.subscribeLabel' | translate }}
							</p>

								<tui-textfield>
									<input
										tuiInput
										type="email"
										formControlName="email"
										[placeholder]="'home.emailPlaceholder' | translate"
										autocomplete="email"
									/>
								</tui-textfield>
							</label>

							<button
								tuiButton
								type="submit"
								class="w-full"
								tuiAppearance="primary"
								[disabled]="newsletterForm.invalid"
							>
								{{ 'home.subscribe' | translate }}
								<hugeicons-icon [icon]="ArrowRight01Icon" [size]="22" [strokeWidth]="1.5" />
							</button>
						</form>
					</div>
				</div>
			</section>

			<section aria-labelledby="opensource" class="py-6 md:py-10 border-t border-border">
				<p class="text-xs uppercase tracking-widest text-accent font-light mb-2 font-mono">{{ 'home.builtInOpenEyebrow' | translate }}</p>
				<h1 class="font-bold text-2xl whitespace-pre-line">
					{{ 'home.builtInOpenHeading' | translate }}
				</h1>
				<p class="text-muted font-mono">
					{{ 'home.builtInOpenDescription' | translate }}
				</p>

				<a tuiButton routerLink="/opensource" class="mt-4 mr-4">
					{{ 'home.howItWorks' | translate }}
					<hugeicons-icon [icon]="ArrowRight01Icon" [size]="22" [strokeWidth]="1.5" />
				</a>

				<a tuiButton href="https://github.com/vitorpaulo-dev/" class="mt-4" tuiAppearance="outline">
					{{ 'home.viewSource' | translate }}
					<hugeicons-icon [icon]="GithubIcon" [size]="22" [strokeWidth]="1.5" />
				</a>
			</section>
		</div>
	`,
})
export class HomePageComponent {
	protected readonly newsletterForm = new FormGroup({
		email: new FormControl('', {
			nonNullable: true,
			validators: [Validators.required, Validators.email],
		}),
	});

	private readonly platformId = inject(PLATFORM_ID);
	private readonly postService = inject(PostService);
	private readonly tagService = inject(TagService);
	private readonly languageService = inject(LanguageService);
	private readonly translationService = inject(TranslationService);
	private readonly toastService = inject(TuiToastService);

	posts = signal<PostDto[]>([]);
	postsLoading = signal(true);
	featured = signal<PostDto[]>([]);
	tagMap = signal<Map<string, TagDto>>(new Map());
	readonly lang = this.languageService.language.asReadonly();
	readonly postListLink = computed(() => this.languageService.prefixed('/post'));

	cardItems = computed<ContentCardItem[]>(() => {
		const tags = this.tagMap();
		const lang = this.lang();
		return this.posts().map(post => ({
			slug: post.slug,
			title: firstTranslation(post.translations)?.title ?? '',
			excerpt: firstTranslation(post.translations)?.summary ?? excerpt(firstTranslation(post.translations)?.content ?? ''),
			imageUrl: post.bannerUrl ?? null,
			date: post.createdAt,
			routePrefix: this.postListLink(),
			metaIcon: Timer02Icon,
			metaText: `${post.estimatedReading || 5} ${this.translationService.translate('common.min', undefined, lang)}`,
			chips: (post.tagIds ?? []).map(id => ({
				icon: Tag01Icon,
				label: tagNameOf(tags.get(id), lang),
			})),
		}));
	});

	constructor() {
		effect(() => {
			if (isPlatformServer(this.platformId)) {
				return;
			}

			this.loadRecent();
			this.loadFeatured();
		});
	}

	private loadFeatured(): void {
		this.postService.getFeatured(this.languageService.language()).subscribe({
			next: (posts) => this.featured.set(posts),
			error: () => this.featured.set([]),
		});
	}

	protected firstTranslation = firstTranslation;

	private loadRecent(): void {
		this.postsLoading.set(true);
		this.postService
			.search({
				query: { query: undefined },
				page: 0,
				size: 5,
				sort: 'createdAt',
				direction: 'DESC',
			})
			.subscribe({
				next: (r) => {
					this.posts.set(r.content);
					this.postsLoading.set(false);
					this.loadTags(r.content);
				},
		error: () => {
			this.postsLoading.set(false);
			this.toastService.open(this.translationService.translate('home.failedToLoad'), {
				appearance: 'error',
				autoClose: 5000,
				data: '@tui.circle-x',
			}).subscribe();
		},
			});
	}

	private loadTags(posts: PostDto[]): void {
		const ids = collectTagIds(posts);
		if (ids.length === 0) {
			this.tagMap.set(new Map());
			return;
		}
		this.tagService.batch(ids).subscribe({
			next: (tags) => this.tagMap.set(buildTagMap(tags)),
			error: () => this.tagMap.set(new Map()),
		});
	}

	protected subscribe(): void {
		if (this.newsletterForm.invalid) {
			this.newsletterForm.markAllAsTouched();
			return;
		}

		const { email } = this.newsletterForm.getRawValue();
	}

	protected readonly ArrowRight01Icon = ArrowRight01Icon;
	protected readonly Loading03Icon = Loading03Icon;
	protected readonly SparklesIcon = SparklesIcon;
	protected readonly GithubIcon = GithubIcon;
}
