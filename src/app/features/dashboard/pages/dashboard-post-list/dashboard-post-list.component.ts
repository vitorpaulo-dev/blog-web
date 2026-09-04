import { Component, DestroyRef, effect, inject, PLATFORM_ID, signal } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { debounceTime, distinctUntilChanged } from 'rxjs';

import { TuiAppearance, TuiButton, TuiInput, TuiTextfield } from '@taiga-ui/core';

import { TuiSortChange, TuiSortDirection, TuiTable, TuiTablePagination } from '@taiga-ui/addon-table';

import { HugeiconsIconComponent } from '@hugeicons/angular';
import {
	Calendar01Icon,
	Delete01Icon,
	Edit01Icon,
	Loading03Icon,
	PlusSignIcon,
	Search01Icon,
} from '@hugeicons/core-free-icons';

import { PostDto, PostService } from '../../../posts/data-access/post.service';
import { LanguageService } from '../../../../core/i18n/language.service';
import { TuiToastService } from '@taiga-ui/kit';

@Component({
	selector: 'app-dashboard-post-list',
	standalone: true,
	imports: [
		CommonModule,
		ReactiveFormsModule,
		RouterLink,
		TuiButton,
		TuiTable,
		TuiTablePagination,
		HugeiconsIconComponent,
		TuiAppearance,
		TuiTextfield,
		TuiInput,
	],
	template: `
		<div class="mx-auto max-w-5xl px-6 py-8">
			
			<div class="mb-6 flex flex-wrap items-center justify-between gap-4">
				<h1 class="text-2xl font-bold">Posts</h1>

				<a routerLink="/dashboard/post/new" tuiButton tuiAppearance="primary" size="m" class="gap-1">
					<hugeicons-icon [icon]="PlusSignIcon" [size]="22" [strokeWidth]="1.5" />
					New Post
				</a>
			</div>

			
			<tui-textfield class="mb-4">
				<label tuiLabel>Search</label>

				<input tuiInput [formControl]="searchControl" placeholder="Search posts..." />
			</tui-textfield>
			
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
				<table
					tuiTable
					[columns]="columns"
					[tuiSortBy]="sortKey()"
					[direction]="sortDirection()"
					(tuiSortChange)="onSort($event)"
					class="w-full"
				>
					<thead>
						<tr tuiThGroup>
							<th *tuiHead="'title'" tuiTh tuiSortable [requiredSort]="true">Title</th>

							<th *tuiHead="'status'" tuiTh>Status</th>

							<th *tuiHead="'createdAt'" tuiTh tuiSortable>Created</th>

							<th *tuiHead="'viewCount'" tuiTh tuiSortable>Views</th>
							
							<th *tuiHead="'reactionCount'" tuiTh tuiSortable>Reactions</th>

							<th *tuiHead="'authors'" tuiTh>Authors</th>

							<th *tuiHead="'tags'" tuiTh>Tags</th>

							<th *tuiHead="'actions'" tuiTh>Actions</th>
						</tr>
					</thead>

					<tbody tuiTbody>
						@for (post of posts(); track post.id) {
							<tr tuiTr>
								
								<td *tuiCell="'title'" tuiTd class="font-medium truncate max-w-60">
									{{ postTitle(post) }}
								</td>

								
								<td *tuiCell="'status'" tuiTd>
									<span
										class="rounded-full border px-2 py-0.5 text-xs"
										[class.bg-green-500/20]="post.status === 'PUBLISHED'"
										[class.bg-yellow-500/20]="post.status === 'DRAFT'"
									>
										{{ post.status }}
									</span>
								</td>

								
								<td *tuiCell="'createdAt'" tuiTd>
									<span class="inline-flex items-center gap-1 text-xs">
										<hugeicons-icon [icon]="Calendar01Icon" [size]="12" [strokeWidth]="1.5" />

										{{ post.createdAt | date: 'dd MMM yyyy' }}
									</span>
								</td>
								
								<td *tuiCell="'viewCount'" tuiTd>
									{{ post.viewCount }}
								</td>

								<td *tuiCell="'reactionCount'" tuiTd>
									{{ post.reactionCount }}
								</td>
								
								<td *tuiCell="'authors'" tuiTd>
									<div class="flex flex-wrap gap-1">
										@for (author of post.authors; track author.id) {
											<span class="text-xs">
												{{ author.name }}
											</span>
										}
									</div>
								</td>

								
								<td *tuiCell="'tags'" tuiTd>
									<div class="flex flex-wrap gap-1">
										@for (tag of post.tags; track tag.id) {
											<span class="text-xs"> #{{ tagName(tag) }} </span>
										}
									</div>
								</td>

								
								<td *tuiCell="'actions'" tuiTd>
									<div class="flex items-center gap-2">
										<a
											[routerLink]="['/dashboard/post', post.id]"
											tuiButton
											tuiAppearance="outline"
											size="s"
											aria-label="Edit post"
										>
											<hugeicons-icon [icon]="Edit01Icon" [size]="16" [strokeWidth]="1.5" />
										</a>

										<button
											tuiButton
											tuiAppearance="accent"
											size="s"
											aria-label="Delete post"
											(click)="askDeleteOne(post.id)"
										>
											<hugeicons-icon [icon]="Delete01Icon" [size]="16" [strokeWidth]="1.5" />
										</button>
									</div>
								</td>
							</tr>
						}
					</tbody>
				</table>

				<div class="mt-4">
					<tui-table-pagination [page]="page()" [total]="totalElements()" (pageChange)="onPage($event)" />
				</div>
			}
		</div>

		@if (showDeleteDialog()) {
			<div
				class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
				(click)="showDeleteDialog.set(false)"
			>
				<div
					class="flex w-full max-w-md flex-col gap-4 rounded-xl border border-border bg-surface p-6"
					(click)="$event.stopPropagation()"
				>
					<h2 class="text-lg font-semibold">Delete post?</h2>

					<p class="text-sm text-muted">This action cannot be undone.</p>

					<div class="flex justify-end gap-3">
						<button tuiButton tuiAppearance="outline" size="m" (click)="showDeleteDialog.set(false)">
							Cancel
						</button>

						<button tuiButton tuiAppearance="accent" size="m" (click)="confirmDeleteOne()">Delete</button>
					</div>
				</div>
			</div>
		}

		@if (showMassDeleteDialog()) {
			<div
				class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
				(click)="showMassDeleteDialog.set(false)"
			>
				<div
					class="flex w-full max-w-md flex-col gap-4 rounded-xl border border-border bg-surface p-6"
					(click)="$event.stopPropagation()"
				>
					<h2 class="text-lg font-semibold">Delete {{ pendingMassIds().length }} posts?</h2>

					<p class="text-sm text-muted">This is atomic — if any fails, none are deleted.</p>

					<div class="flex justify-end gap-3">
						<button tuiButton tuiAppearance="outline" size="m" (click)="showMassDeleteDialog.set(false)">
							Cancel
						</button>

						<button tuiButton tuiAppearance="accent" size="m" (click)="confirmMassDelete()">Delete</button>
					</div>
				</div>
			</div>
		}
	`,
})
export class DashboardPostListComponent {
	private readonly postService = inject(PostService);
	private readonly platformId = inject(PLATFORM_ID);
	private readonly destroyRef = inject(DestroyRef);
	private readonly languageService = inject(LanguageService);
	private readonly toastService = inject(TuiToastService);

	readonly Search01Icon = Search01Icon;
	readonly PlusSignIcon = PlusSignIcon;
	readonly Edit01Icon = Edit01Icon;
	readonly Delete01Icon = Delete01Icon;
	readonly Calendar01Icon = Calendar01Icon;

	readonly searchControl = new FormControl('', {
		nonNullable: true,
	});

	readonly posts = signal<PostDto[]>([]);
	readonly loading = signal(true);
	readonly error = signal<string | null>(null);

	readonly page = signal(0);
	readonly totalPages = signal(1);
	readonly totalElements = signal(0);

	readonly sortKey = signal<keyof PostDto>('createdAt');
	readonly sortDirection = signal<TuiSortDirection>(TuiSortDirection.Desc);

	readonly columns: (keyof PostDto | string)[] = [
		'title',
		'status',
		'createdAt',
		'viewCount',
		'reactionCount',
		'authors',
		'tags',
		'actions',
	];

	readonly selected = signal<Set<string>>(new Set());

	readonly showDeleteDialog = signal(false);
	readonly pendingDeleteId = signal<string | null>(null);

	readonly showMassDeleteDialog = signal(false);
	readonly pendingMassIds = signal<string[]>([]);

	constructor() {
		this.searchControl.valueChanges
			.pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
			.subscribe(() => {
				this.page.set(0);
				this.load();
			});

		effect(() => {
			this.languageService.language();
			this.load();
		});
	}

	postTitle(post: PostDto): string {
		const lang = this.languageService.language();
		return post.translations?.[lang]?.title || post.translations?.['ENGLISH']?.title || '';
	}

	tagName(tag: { translations: Record<string, { name?: string }> }): string {
		const lang = this.languageService.language();
		return tag.translations?.[lang]?.name || tag.translations?.['ENGLISH']?.name || '';
	}

	load(): void {
		this.loading.set(true);
		this.error.set(null);

		const query = this.searchControl.value.trim();

		const direction = this.sortDirection() === TuiSortDirection.Asc ? 'ASC' : 'DESC';

		this.postService
			.search({
				query: {
					query: query || undefined,
					language: this.languageService.language(),
				},
				page: this.page(),
				size: 10,
				sort: this.sortKey() as string,
				direction,
			})
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: (response) => {
					this.posts.set(response.content);
					this.totalPages.set(response.totalPages || 1);
					this.totalElements.set(response.totalElements);
					this.loading.set(false);
				},

				error: () => {
					this.error.set('Failed to load posts.');
					this.loading.set(false);
				},
			});
	}

	onPage(page: number): void {
		if (page === this.page()) {
			return;
		}

		this.page.set(page);
		this.load();
	}

	onSort(event: TuiSortChange<any>): void {
		console.log('onSort', event);
		if (!event.sortKey) {
			return;
		}

		const nextSortKey = event.sortKey as keyof PostDto;
		const nextDirection = event.sortDirection;
		if (nextSortKey === this.sortKey() && nextDirection === this.sortDirection()) {
			return;
		}

		this.sortKey.set(nextSortKey);
		this.sortDirection.set(nextDirection);
		this.page.set(0);

		this.load();
	}

	toggle(id: string): void {
		const next = new Set(this.selected());

		if (next.has(id)) {
			next.delete(id);
		} else {
			next.add(id);
		}

		this.selected.set(next);
	}

	askDeleteOne(id: string): void {
		this.pendingDeleteId.set(id);
		this.showDeleteDialog.set(true);
	}

	confirmDeleteOne(): void {
		const id = this.pendingDeleteId();

		if (!id) {
			return;
		}

		this.showDeleteDialog.set(false);
		this.pendingDeleteId.set(null);

		this.postService.delete([id]).subscribe({
			next: () => {
				this.toastService.open('Post deleted successfully', {
					appearance: 'success',
					autoClose: 3000,
				});
				this.load();
			},

			error: () => {
				this.toastService.open('Failed to delete post. Please try again.', {
					appearance: 'error',
					autoClose: 5000,
				});
			},
		});
	}

	massDelete(): void {
		const ids = Array.from(this.selected());

		if (!ids.length) {
			return;
		}

		this.pendingMassIds.set(ids);
		this.showMassDeleteDialog.set(true);
	}

	confirmMassDelete(): void {
		const ids = this.pendingMassIds();

		if (!ids.length) {
			return;
		}

		this.showMassDeleteDialog.set(false);
		this.pendingMassIds.set([]);

		this.postService.delete(ids).subscribe({
			next: () => {
				this.selected.set(new Set());
				this.toastService.open(`${ids.length} posts deleted successfully`, {
					appearance: 'success',
					autoClose: 3000,
				});
				this.load();
			},

			error: () => {
				this.toastService.open('Failed to delete posts. Please try again.', {
					appearance: 'error',
					autoClose: 5000,
				});
			},
		});
	}

	protected readonly Loading03Icon = Loading03Icon;
}
