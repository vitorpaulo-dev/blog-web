import { Component, computed, effect, inject, signal } from '@angular/core';
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
import { RouterLink } from '@angular/router';
import { CommonModule, DatePipe } from '@angular/common';
import { TuiCardLarge, TuiForm } from '@taiga-ui/layout';
import { TuiChip, TuiToastService } from '@taiga-ui/kit';
import { excerpt, firstTranslation } from '../../../../core/util/text.util';
import { LanguageService } from '../../../../core/i18n/language.service';
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
		DatePipe,
		TuiForm,
		TuiInput,
		TuiAppearance,
		TuiChip,
		ContentCardComponent,
	],
	template: `
		<div class="min-h-dvh bg-background text-foreground">
			<section aria-label="Featured" class="mx-auto pt-2">
				<a
					routerLink="/post/das"
					class="group rounded-xl border border-accent bg-surface transition-all hover:opacity-80 px-2 md:px-4 py-3 flex flex-row md:items-center justify-between gap-3"
				>
					<div class="text-sm inline-flex items-center font-mono">
						<hugeicons-icon [icon]="SparklesIcon" [size]="26" [strokeWidth]="1.5" />
						<p class="ml-2 text-foreground font-bold truncate max-w-80">This will be the post title.</p>
					</div>

					<hugeicons-icon [icon]="ArrowRight01Icon" [size]="22" [strokeWidth]="1.5" />
				</a>
			</section>
			<section aria-labelledby="recent-title" class="mx-auto md:pt-6 pt-4 pb-6 md:pb-10">
				<div class="w-full inline-flex items-end justify-between gap-4 mb-6">
					<h2 class="text-2xl md:text-3xl font-bold tracking-tight text-foreground">Recent posts</h2>
					<button
						tuiButton
						size="s"
						tuiAppearance="flat"
						routerLink="/post"
						[disabled]="postsLoading() || posts().length === 0"
					>
						All posts
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
							"Although I am ready to defend what I have said, many people expect me to defend what others
							have attributed to me."
						</blockquote>

						<footer class="mt-6 text-sm font-medium tracking-wide text-muted">T. S.</footer>
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
						class="col-span-1 md:col-span-1 select-none pointer-events-none object-cover rounded-xl border border-border bg-surface overflow-hidden flex items-center justify-center text-muted"
					/>
					<div class="col-span-1 md:col-span-2">
						<p class="text-xs uppercase tracking-widest text-accent font-light mb-2 font-mono">About me</p>
						<h2 class="text-2xl md:text-3xl font-bold tracking-tight text-foreground">Hi, I'm Vitor!</h2>
						<div class="mt-4 space-y-4 text-muted leading-relaxed">
							<p>
								I've been messing with computers for most of my life.<br />
								I started coding when I was 10, mostly because I wanted to understand how things worked
								and, eventually, make them do things they weren't supposed to do.<br />
								Now, I'm a full-stack developer, though I've always found myself gravitating toward
								backend work, AI and the kind of problems where the first solution usually isn't the
								right one.<br />
								<br />
								I made this blog because I wanted a place to write about what I'm building, breaking,
								learning, and figuring out. Some of it will probably be useful. Some of it might just be
								me going down a rabbit hole for a few days.<br />
								No big master plan. Just me building things, learning along the way, and writing about
								it.
							</p>
						</div>
					</div>
				</div>
			</section>
			<section aria-labelledby="newsletter-title" class="py-6 md:py-10 border-t border-border">
				<div class="grid grid-cols-1 md:grid-cols-3 gap-8">
					<div class="col-span-1 md:col-span-2">
						<p class="text-xs uppercase tracking-widest text-accent font-light mb-2 font-mono">
							Newsletter
						</p>
						<h1 class="font-bold text-4xl">
							One email<br />
							when I publish.<br />
							Nothing else.
						</h1>
						<p class="text-muted font-mono">
							Roughly twice a month. Real post-mortems, the occasional war story, and links to the source
							when I can share it. Unsubscribe in one click.
						</p>
					</div>
					<div tuiAppearance="outline" class="bg-surface border border-border p-4 rounded-xl">
						<form
							tuiForm="m"
							[formGroup]="newsletterForm"
							(ngSubmit)="subscribe()"
							aria-label="Newsletter subscription"
						>
							<label tuiLabel>
								<p class="text-lg font-medium font-mono py-1.5 text-muted">
									Subscribe to my newsletter:
								</p>

								<tui-textfield>
									<input
										tuiInput
										type="email"
										formControlName="email"
										placeholder="you@domain.dev"
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
								Subscribe
								<hugeicons-icon [icon]="ArrowRight01Icon" [size]="22" [strokeWidth]="1.5" />
							</button>
						</form>
					</div>
				</div>
			</section>

			<section aria-labelledby="opensource" class="py-6 md:py-10 border-t border-border">
				<p class="text-xs uppercase tracking-widest text-accent font-light mb-2 font-mono">BUILT IN OPEN</p>
				<h1 class="font-bold text-2xl">
					This blog is built by an agent squad<br />And you can read every line.
				</h1>
				<p class="text-muted font-mono">
					The posts, the layout, and the build pipeline are written and maintained by a small squad of
					specialized agents. The full source templates, content, and tooling lives on GitHub, so you can fork
					it, argue with it, or just see how the sausage is made.
				</p>

				<a tuiButton routerLink="/opensource" class="mt-4 mr-4">
					How the agent squad works
					<hugeicons-icon [icon]="ArrowRight01Icon" [size]="22" [strokeWidth]="1.5" />
				</a>

				<a tuiButton href="https://github.com/vitorpaulo-dev/" class="mt-4" tuiAppearance="outline">
					View source on GitHub
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

	private readonly postService = inject(PostService);
	private readonly languageService = inject(LanguageService);
	private readonly toastService = inject(TuiToastService);

	posts = signal<PostDto[]>([]);
	postsLoading = signal(true);
	readonly lang = this.languageService.language.asReadonly();

	cardItems = computed<ContentCardItem[]>(() =>
		this.posts().map(post => ({
			slug: post.slug,
			title: firstTranslation(post.translations)?.title ?? '',
			excerpt: excerpt(firstTranslation(post.translations)?.content ?? ''),
			imageUrl: post.bannerUrl ?? null,
			date: post.createdAt,
			routePrefix: '/post',
			metaIcon: Timer02Icon,
			metaText: `${post.estimatedReading || 5} min`,
			chips: post.tags.map(tag => ({
				icon: Tag01Icon,
				label: firstTranslation(tag.translations)?.name ?? '',
			})),
		}))
	);

	constructor() {
		effect(() => {
			this.loadRecent();
		});
	}

	private loadRecent(): void {
		this.postsLoading.set(true);
		this.postService
			.search({
				query: { query: undefined, language: this.lang() },
				page: 0,
				size: 5,
				sort: 'createdAt',
				direction: 'DESC',
			})
			.subscribe({
				next: (r) => {
					this.posts.set(r.content);
					this.postsLoading.set(false);
				},
			error: () => {
				this.postsLoading.set(false);
				this.toastService.open('Failed to load posts. Please try again.', {
					appearance: 'error',
					autoClose: 5000,
					data: '@tui.circle-x',
				}).subscribe();
			},
			});
	}

	protected subscribe(): void {
		if (this.newsletterForm.invalid) {
			this.newsletterForm.markAllAsTouched();
			return;
		}

		const { email } = this.newsletterForm.getRawValue();

		console.log('Subscribe:', email);
	}

	protected readonly RssConnected01Icon = RssConnected01Icon;
	protected readonly ArrowRight01Icon = ArrowRight01Icon;
	protected readonly Database01Icon = Database01Icon;
	protected readonly Mail01Icon = Mail01Icon;
	protected readonly Loading03Icon = Loading03Icon;
	protected readonly SparklesIcon = SparklesIcon;
	protected readonly GithubIcon = GithubIcon;
}
