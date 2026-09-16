import { Component, computed, effect, inject, PLATFORM_ID, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { TuiAppearance, TuiButton, TuiDropdown, TuiError, TuiInput, TuiLink, TuiTextfield } from '@taiga-ui/core';
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
import { Frequency as SubscriberFrequency, NewsletterService } from '../../../dashboard/data-access/newsletter.service';
import { RouterLink } from '@angular/router';
import { CommonModule, isPlatformServer } from '@angular/common';
import { TuiCardLarge } from '@taiga-ui/layout';
import { TuiChevron, TuiDataListWrapper, TuiSelect, TuiToastService } from '@taiga-ui/kit';
import { excerpt, firstTranslation } from '../../../../core/util/text.util';
import { buildTagMap, collectTagIds, tagName as tagNameOf } from '../../../../core/util/tag.util';
import { LanguageService, Language } from '../../../../core/i18n/language.service';
import { TranslatePipe } from '../../../../core/i18n/translate.pipe';
import { TranslationService } from '../../../../core/i18n/translation.service';
import { ContentCardComponent, ContentCardItem } from '../../../../shared/components/content-card/content-card.component';
import { TurnstileService } from '../../../../core/captcha/turnstile.service';

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
		TuiInput,
		TuiSelect,
		TuiChevron,
		TuiDropdown,
		TuiDataListWrapper,
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
							<p class="ml-2 text-foreground font-bold truncate max-w-60 md:max-w-5xl">
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

			<section
				aria-labelledby="newsletter-title"
				class="border-t border-border py-16 sm:py-20 lg:py-24"
			>
				<div class="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:items-start lg:gap-16">
					<!-- Copy -->
					<div class="lg:col-span-7">
						<p class="mb-3 font-mono text-xs font-medium uppercase tracking-wide text-accent">
							{{ 'home.newsletterEyebrow' | translate }}
						</p>
						<h2
							id="newsletter-title"
							class="whitespace-pre-line text-4xl font-bold leading-[1.1] tracking-tight text-foreground sm:text-5xl"
						>
							{{ 'home.newsletterHeading' | translate }}
						</h2>
						<p class="mt-4 max-w-md text-base leading-relaxed text-muted">
							{{ 'home.newsletterDescription' | translate }}
						</p>
					</div>

					<!-- Form card -->
				<div class="relative lg:col-span-5">
					<div aria-hidden="true" class="pointer-events-none absolute -top-16 right-6 size-44 rounded-full bg-accent/10 blur-3xl"></div>
					<div class="relative rounded-xl border border-border bg-surface p-6 sm:p-8">
						<div class="flex items-center gap-3 border-b border-border/60 pb-5">
							<span class="flex size-9 shrink-0 items-center justify-center rounded-lg border border-accent/40 bg-accent/10 text-accent">
								<hugeicons-icon [icon]="Mail01Icon" [size]="18" [strokeWidth]="1.5" />
							</span>
							<h3
								id="newsletter-form-heading"
								class="font-mono text-xs font-medium uppercase tracking-widest text-muted"
							>
								{{ 'home.subscribeLabel' | translate }}
							</h3>
						</div>

						<form
							[formGroup]="newsletterForm"
							(ngSubmit)="subscribe()"
							aria-labelledby="newsletter-form-heading"
							class="mt-6 flex flex-col gap-6"
						>
							<div>
								<p class="mb-2 font-mono text-xs uppercase tracking-widest text-muted">
									{{ 'home.emailLabel' | translate }}
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
								@if (newsletterForm.get('email')?.invalid && newsletterForm.get('email')?.touched) {
									<p role="alert" class="mt-1.5 text-xs text-red-600 dark:text-red-400">
										{{ 'home.emailError' | translate }}
									</p>
								}
							</div>

							<button
								tuiButton
								type="submit"
								tuiAppearance="primary"
								class="!w-full justify-center gap-2 transition-all duration-100 active:scale-[0.98] motion-reduce:transition-none motion-reduce:active:scale-100"
								[disabled]="newsletterForm.invalid || subscribeBusy()"
								[attr.aria-busy]="subscribeBusy()"
							>
								@if (subscribeBusy()) {
									{{ 'home.subscribing' | translate }}
								} @else {
									{{ 'home.subscribe' | translate }}
									<hugeicons-icon
										[icon]="ArrowRight01Icon"
										[size]="18"
										[strokeWidth]="1.5"
										class="transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none"
									/>
								}
							</button>

							<div class="flex flex-col gap-5 border-t border-border/60 pt-6">
								<div>
									<p class="mb-2 font-mono text-xs uppercase tracking-widest text-muted">
										{{ 'home.languageLabel' | translate }}
									</p>
									<tui-textfield tuiChevron [content]="languageOption" [stringify]="stringifyLanguage">
										<input tuiSelect formControlName="language" />
										<tui-data-list-wrapper *tuiDropdown [itemContent]="languageOption" [items]="languages" />
									</tui-textfield>
								</div>

								<div>
									<p class="mb-2 font-mono text-xs uppercase tracking-widest text-muted">
										{{ 'home.frequencyLabel' | translate }}
									</p>
									<div role="group" class="flex gap-1 rounded-xl border border-border bg-background p-1">
										<button
											type="button"
											(click)="selectFrequency('EVERY_POST')"
											[disabled]="subscribeBusy()"
											[attr.aria-pressed]="newsletterForm.controls.frequency.value === 'EVERY_POST'"
											[class]="isFrequency('EVERY_POST') ? frequencyPillActive : frequencyPillIdle"
											class="flex-1 rounded-lg px-3 py-1.5 text-center font-mono text-xs uppercase tracking-wide transition-all duration-100 active:scale-[0.98] motion-reduce:transition-none motion-reduce:active:scale-100"
										>
											{{ 'home.frequencyEveryPost' | translate }}
										</button>
										<button
											type="button"
											(click)="selectFrequency('MONTHLY_DIGEST')"
											[disabled]="subscribeBusy()"
											[attr.aria-pressed]="newsletterForm.controls.frequency.value === 'MONTHLY_DIGEST'"
											[class]="isFrequency('MONTHLY_DIGEST') ? frequencyPillActive : frequencyPillIdle"
											class="flex-1 rounded-lg px-3 py-1.5 text-center font-mono text-xs uppercase tracking-wide transition-all duration-100 active:scale-[0.98] motion-reduce:transition-none motion-reduce:active:scale-100"
										>
											{{ 'home.frequencyMonthlyDigest' | translate }}
										</button>
									</div>
								</div>
							</div>
						</form>
					</div>
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

			<ng-template #languageOption let-value>
				<span class="flex items-center gap-2">
					<span aria-hidden="true" class="text-base leading-none">{{ value === 'PORTUGUESE' ? '🇧🇷' : '🇺🇸' }}</span>
					<span class="text-sm font-medium">{{ value === 'PORTUGUESE' ? 'Português' : 'English' }}</span>
				</span>
			</ng-template>
		</div>
	`,
})
export class HomePageComponent {
	private readonly platformId = inject(PLATFORM_ID);
	private readonly postService = inject(PostService);
	private readonly tagService = inject(TagService);
	private readonly languageService = inject(LanguageService);
	private readonly translationService = inject(TranslationService);
	private readonly toastService = inject(TuiToastService);
	private readonly turnstileService = inject(TurnstileService);
	private readonly newsletterService = inject(NewsletterService);

	readonly newsletterForm = new FormGroup({
		email: new FormControl('', {
			nonNullable: true,
			validators: [Validators.required, Validators.email],
		}),
		language: new FormControl<Language>(this.languageService.language(), {
			nonNullable: true,
			validators: [Validators.required],
		}),
		frequency: new FormControl<SubscriberFrequency>('EVERY_POST', {
			nonNullable: true,
			validators: [Validators.required],
		}),
	});

	readonly subscribeBusy = signal(false);

	readonly languages: Language[] = ['ENGLISH', 'PORTUGUESE'];

	protected readonly stringifyLanguage = (language: Language): string =>
		language === 'PORTUGUESE' ? '🇧🇷 Português' : '🇺🇸 English';

	protected readonly frequencyPillActive = 'bg-accent font-bold text-foreground';

	protected readonly frequencyPillIdle = 'font-medium text-muted hover:text-accent';

	selectFrequency(frequency: SubscriberFrequency): void {
		this.newsletterForm.controls.frequency.setValue(frequency);
	}

	isFrequency(frequency: SubscriberFrequency): boolean {
		return this.newsletterForm.controls.frequency.value === frequency;
	}

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

		effect(() => {
			this.newsletterForm.patchValue({ language: this.languageService.language() });
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

	readonly subscribe = async (): Promise<void> => {
		if (this.newsletterForm.invalid || this.subscribeBusy()) {
			this.newsletterForm.markAllAsTouched();
			return;
		}

		this.subscribeBusy.set(true);

		try {
			const token = await this.turnstileService.getToken();

			if (!token) {
				this.openToast(this.translationService.translate('home.subscribeUnavailable'));
				return;
			}

			const { email, language, frequency } = this.newsletterForm.getRawValue();
			await firstValueFrom(this.newsletterService.subscribe({ email, language, frequency }, token));

			this.openToast(this.translationService.translate('home.subscribeSuccess'), 'success', 3000, '@tui.check');
			this.resetForm();
			this.turnstileService.reset();
		} catch {
			this.openToast(this.translationService.translate('home.subscribeError'));
			this.turnstileService.reset();
		} finally {
			this.subscribeBusy.set(false);
		}
	};

	private resetForm(): void {
		this.newsletterForm.reset({
			email: '',
			language: this.languageService.language(),
			frequency: 'EVERY_POST',
		});
	}

	private openToast(
		message: string,
		appearance: 'success' | 'error' = 'error',
		autoClose = 5000,
		data = '@tui.circle-x',
	): void {
		this.toastService.open(message, { appearance, autoClose, data }).subscribe();
	}

	protected readonly ArrowRight01Icon = ArrowRight01Icon;
	protected readonly Loading03Icon = Loading03Icon;
	protected readonly SparklesIcon = SparklesIcon;
	protected readonly GithubIcon = GithubIcon;
	protected readonly Mail01Icon = Mail01Icon;
}
