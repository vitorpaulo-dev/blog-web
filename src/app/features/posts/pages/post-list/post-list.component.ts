import { Component, effect, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TuiAppearance, TuiButton, TuiTextfield } from '@taiga-ui/core';
import { TuiChip, TuiPagination, TuiToastService } from '@taiga-ui/kit';
import { HugeiconsIconComponent } from '@hugeicons/angular';
import {
	Calendar01Icon,
	Clock01Icon,
	EyeIcon,
	Loading03Icon,
	Search01Icon,
	SmilePlusIcon,
	Tag01Icon,
	Timer02Icon,
} from '@hugeicons/core-free-icons';
import { PostDto, PostService } from '../../data-access/post.service';
import { CommonModule } from '@angular/common';
import { excerpt } from '../../../../core/util/text.util';
import { LanguageService } from '../../../../core/i18n/language.service';

@Component({
	selector: 'app-post-list',
	standalone: true,
	imports: [
		CommonModule,
		FormsModule,
		RouterLink,
		HugeiconsIconComponent,
		TuiChip,
		TuiPagination,
	],
	template: `
		<div class="py-2">
			<h1 class="text-3xl font-bold tracking-tight">Posts</h1>

			@if (loading()) {
				<div class="text-muted text-sm w-full inline-flex justify-center items-center h-full">
					<hugeicons-icon [icon]="Loading03Icon" [size]="32" [strokeWidth]="1.5" />
				</div>
			} @else if (posts().length === 0) {
				<div class="relative rounded-xl border border-border bg-surface px-8 pt-10 pb-3 text-center shadow-sm">
					<div
						class="absolute left-1/2 top-0 -translate-x-1/2 text-7xl font-serif leading-none text-muted/20"
					>
						"
					</div>

					<blockquote class="relative font-serif text-xl italic leading-relaxed text-foreground sm:text-2xl">
						"Although I am ready to defend what I have said, many people expect me to defend what others
						have attributed to me."
					</blockquote>

					<footer class="mt-6 text-sm font-medium tracking-wide text-muted">T. S.</footer>
				</div>
			} @else {
				<div class="w-full">
					@for (post of posts(); track post.id; let index = $index) {
						@if (index > 0) {
							<div class="py-4">
								<hr />
							</div>
						}

						<a
							[routerLink]="['/post', post.slug]"
							class="flex flex-col md:flex-row items-center w-full hover:bg-surface transition-all p-2 md:px-4 rounded-lg group"
						>
							@if (post.bannerUrl) {
								<div
									class="md:mr-5 aspect-video w-80 rounded-xl border border-border bg-surface overflow-hidden"
								>
									<img
										[src]="post.bannerUrl"
										[alt]="postContent(post)?.title"
										class="aspect-video object-cover border-b border-border group-hover:scale-105 transition-all"
									/>
								</div>
							}
							<div class="py-2 md:py-5 flex flex-col gap-3 w-full">
								<div
									class="flex items-center gap-2 text-xs text-muted font-mono group-hover:text-muted/50 transition-all"
								>
									<hugeicons-icon [icon]="Calendar01Icon" [size]="14" [strokeWidth]="1.5" />
									<span>{{ post.createdAt | date: 'dd MMM yyyy' }}</span>

									<span aria-hidden="true">·</span>

									<hugeicons-icon [icon]="Timer02Icon" [size]="16" [strokeWidth]="1.5" />
									<span>{{ post.estimatedReading || 5 }} min</span>
								</div>
								<h3
									class="truncate w-full text-lg font-semibold leading-tight text-foreground group-hover:text-accent transition-colors"
								>
									{{ postContent(post)?.title }}
								</h3>
								<p
									class="text-sm text-muted leading-relaxed line-clamp-3 group-hover:text-muted/50 transition-all"
								>
									{{ excerpt(postContent(post)?.content || '') }}
								</p>
							</div>

							<div class="flex flex-wrap gap-1.5 h-full items-center justify-end">
								@for (tag of post.tags; track tag.id) {
									<span tuiChip>
										<hugeicons-icon [icon]="Tag01Icon" [size]="12" [strokeWidth]="1.5" />
										{{ tagContent(tag)?.name }}
									</span>
								}
							</div>
						</a>
					}
				</div>
				
				<tui-pagination [activePadding]="1" [index]="page()" [length]="totalPages()" (indexChange)="page.set($event)"/>
			}
		</div>
	`,
})
export class PostListComponent {
	private readonly postService = inject(PostService);
	private readonly languageService = inject(LanguageService);
	private readonly toastService = inject(TuiToastService);

	query = '';
	posts = signal<PostDto[]>([]);
	loading = signal(false);

	page = signal(0);
	totalPages = signal(1);
	totalElements = signal(0);

	constructor() {
		effect(() => {
			this.languageService.language();
			this.page();
			this.load();
		});
	}

	postContent(post: PostDto) {
		const lang = this.languageService.language();
		return post.translations?.[lang] ?? post.translations?.['ENGLISH'] ?? null;
	}

	tagContent(tag: { translations: Record<string, { name?: string }> }) {
		const lang = this.languageService.language();
		return tag.translations?.[lang] ?? tag.translations?.['ENGLISH'] ?? null;
	}

	load(): void {
		this.loading.set(true);
		console.log('Loading page', this.page());
		this.postService
			.search({
				query: { query: this.query || undefined, language: this.languageService.language() },
				page: this.page(),
				size: 10,
				sort: 'createdAt',
				direction: 'DESC',
			})
			.subscribe({
				next: (res) => {
					this.posts.set(res.content);
					this.totalPages.set(res.totalPages);
					this.totalElements.set(res.totalElements);
					this.loading.set(false);
				},
			error: () => {
				this.loading.set(false);
				this.toastService.open('Failed to load posts. Please try again.', {
					appearance: 'error',
					autoClose: 5000,
					data: '@tui.circle-x',
				}).subscribe();
			},
			});
	}

	protected readonly Timer02Icon = Timer02Icon;
	protected readonly Loading03Icon = Loading03Icon;
	protected readonly Calendar01Icon = Calendar01Icon;
	protected readonly Tag01Icon = Tag01Icon;
	protected readonly excerpt = excerpt;
}
