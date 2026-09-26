import { Component, DestroyRef, effect, inject, PLATFORM_ID, signal } from '@angular/core';
import { CommonModule, isPlatformServer } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { debounceTime, distinctUntilChanged, filter, forkJoin } from 'rxjs';

import {
	TuiAppearance,
	TuiButton,
	TuiCell,
	TuiDialogService,
	TuiDropdown,
	TuiInput,
	TuiLink,
	TuiTextfield,
	TuiTitle,
} from '@taiga-ui/core';

import { TuiBadge, TuiItemsWithMore, TuiStatus } from '@taiga-ui/kit';
import { TuiItem } from '@taiga-ui/cdk';
import { TuiItemGroup } from '@taiga-ui/layout';
import { TuiSortChange, TuiSortDirection, TuiTable, TuiTablePagination } from '@taiga-ui/addon-table';

import { HugeiconsIconComponent } from '@hugeicons/angular';
import { Loading03Icon, PlusSignIcon, SparklesIcon } from '@hugeicons/core-free-icons';

import { PostDto, PostService } from '../../../posts/data-access/post.service';
import { TagService, TagDto } from '../../../tags/data-access/tag.service';
import { LanguageService } from '../../../../core/i18n/language.service';
import { TranslatePipe } from '../../../../core/i18n/translate.pipe';
import { TranslationService } from '../../../../core/i18n/translation.service';
import { LocalizedDatePipe } from '../../../../core/i18n/localized-date.pipe';
import { buildTagMap, chunkTagIds, collectTagIds, tagName as tagNameOfUtil } from '../../../../core/util/tag.util';
import { TUI_CONFIRM, TuiToastService } from '@taiga-ui/kit';

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
		TuiCell,
		TuiTitle,
		TuiStatus,
		TuiBadge,
		TuiItemsWithMore,
		TuiItem,
		TuiItemGroup,
		TuiDropdown,
		TuiLink,
		TuiAppearance,
		TuiTextfield,
		TuiInput,
		TranslatePipe,
		LocalizedDatePipe,
	],
	styles: `
		[tuiTh],
		[tuiTd] {
			border-inline-start: none;
			border-inline-end: none;
		}
	`,
	template: `
		<div class="mx-auto px-4 py-8 sm:px-6">
			<div class="mb-6 flex flex-wrap items-center justify-between gap-4">
				<h1 class="text-2xl font-bold">{{ 'dashboard.posts.list.title' | translate }}</h1>

				<div class="flex items-center gap-3">
					<a routerLink="/dashboard/featured" class="inline-flex items-center gap-1 text-sm text-accent">
						<hugeicons-icon [icon]="SparklesIcon" [size]="16" [strokeWidth]="1.5" />
						{{ 'dashboard.featured.nav' | translate }}
					</a>

					<a routerLink="/dashboard/post/new" tuiButton tuiAppearance="primary" size="m" class="gap-1">
						<hugeicons-icon [icon]="PlusSignIcon" [size]="22" [strokeWidth]="1.5" />
						{{ 'dashboard.posts.list.new' | translate }}
					</a>
				</div>
			</div>

			<tui-textfield class="mb-4">
				<label tuiLabel>{{ 'dashboard.posts.list.searchLabel' | translate }}</label>
				<input
					tuiInput
					[formControl]="searchControl"
					[placeholder]="'dashboard.posts.list.searchPlaceholder' | translate"
				/>
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
						"{{ 'posts.emptyQuote' | translate }}"
					</blockquote>

					<footer class="mt-6 text-sm font-medium tracking-wide text-muted">
						{{ 'posts.emptyAttribution' | translate }}
					</footer>
				</div>
			} @else {
				<div class="overflow-x-auto">
					<table
						tuiTable
						size="m"
						[columns]="columns"
						[tuiSortBy]="sortKey()"
						[direction]="sortDirection()"
						(tuiSortChange)="onSort($event)"
						class="w-full"
					>
						<thead>
							<tr tuiThGroup>
								<th *tuiHead="'title'" tuiTh tuiSortable [requiredSort]="true">
									<div [tuiCell]="size">{{ 'dashboard.posts.list.colTitle' | translate }}</div>
								</th>

								<th *tuiHead="'status'" tuiTh>
									<div [tuiCell]="size">{{ 'dashboard.posts.list.colStatus' | translate }}</div>
								</th>

								<th *tuiHead="'createdAt'" tuiTh tuiSortable>
									<div [tuiCell]="size">{{ 'dashboard.posts.list.colCreated' | translate }}</div>
								</th>

								<th *tuiHead="'viewCount'" tuiTh tuiSortable>
									<div [tuiCell]="size">{{ 'dashboard.posts.list.colViews' | translate }}</div>
								</th>

								<th *tuiHead="'reactionCount'" tuiTh tuiSortable>
									<div [tuiCell]="size">{{ 'dashboard.posts.list.colReactions' | translate }}</div>
								</th>

								<th *tuiHead="'authors'" tuiTh>
									<div [tuiCell]="size">{{ 'dashboard.posts.list.colAuthors' | translate }}</div>
								</th>

								<th *tuiHead="'tags'" tuiTh>
									<div [tuiCell]="size">{{ 'dashboard.posts.list.colTags' | translate }}</div>
								</th>

								<th *tuiHead="'actions'" tuiTh>
									<div [tuiCell]="size">{{ 'dashboard.posts.list.colActions' | translate }}</div>
								</th>
							</tr>
						</thead>

						<tbody tuiTbody>
							@for (post of posts(); track post.id) {
								<tr tuiTr>
									<td *tuiCell="'title'" tuiTd class="max-w-60">
										<div [tuiCell]="size" class="min-w-0">
											<span tuiTitle>
												<span class="block truncate">{{ postTitle(post) }}</span>
												<span tuiSubtitle class="truncate">{{ post.slug }}</span>
											</span>
										</div>
									</td>

									<td *tuiCell="'status'" tuiTd>
										<span [tuiStatus]="statusColor(post.status)">{{
											statusLabel(post.status)
										}}</span>
									</td>

									<td *tuiCell="'createdAt'" tuiTd>
										<div [tuiCell]="size">
											<span tuiTitle>
												{{ post.createdAt | localizedDate: 'dd MMM yyyy' }}
												<span tuiSubtitle>{{ post.createdAt | localizedDate: 'EEEE' }}</span>
											</span>
										</div>
									</td>

									<td *tuiCell="'viewCount'" tuiTd>
										<div [tuiCell]="size">{{ post.viewCount }}</div>
									</td>

									<td *tuiCell="'reactionCount'" tuiTd>
										<div [tuiCell]="size">{{ post.reactionCount }}</div>
									</td>

									<td *tuiCell="'authors'" tuiTd>
										<div [tuiCell]="size">
											<div class="flex flex-wrap gap-1">
												@for (author of post.authors; track author.id) {
													<span class="text-xs">
														{{ author.name }}
													</span>
												}
											</div>
										</div>
									</td>

									<td *tuiCell="'tags'" tuiTd>
										<tui-items-with-more>
											@for (tag of postTagsById(post); track tag.id) {
												<div *tuiItem tuiBadge>#{{ tagNameOf(tag) }}</div>
											}
											<ng-template let-number tuiMore>
												<button
													appearance="action-grayscale"
													tuiDropdownAlign="end"
													tuiDropdownAuto
													tuiLink
													type="button"
													class="text-xs"
													[style.text-decoration-style]="'dashed'"
													[tuiDropdown]="tagDropdown"
												>
													+ {{ postTagsById(post).length - number - 1 }}
												</button>
												<ng-template #tagDropdown>
													<div tuiItemGroup [style.padding]="'1rem 0.75rem 0.75rem 1rem'">
														@for (
															tag of postTagsById(post);
															track tag.id;
															let tagIndex = $index
														) {
															@if (tagIndex > number) {
																<div tuiBadge>#{{ tagNameOf(tag) }}</div>
															}
														}
													</div>
												</ng-template>
											</ng-template>
										</tui-items-with-more>
									</td>

									<td *tuiCell="'actions'" tuiTd>
										<span tuiStatus>
											<a
												tuiIconButton
												appearance="action"
												size="xs"
												iconStart="@tui.pencil"
												type="button"
												[routerLink]="['/dashboard/post', post.id]"
												[attr.aria-label]="'dashboard.posts.list.editAria' | translate"
											>
												Edit
											</a>

											<button
												tuiIconButton
												appearance="action"
												size="xs"
												iconStart="@tui.trash"
												type="button"
												[attr.aria-label]="'dashboard.posts.list.deleteAria' | translate"
												(click)="askDeleteOne(post.id)"
											>
												Delete
											</button>
										</span>
									</td>
								</tr>
							}
						</tbody>
					</table>
				</div>

				<div class="mt-4">
					<tui-table-pagination [page]="page()" [total]="totalElements()" (pageChange)="onPage($event)" />
				</div>
			}
		</div>
	`,
})
export class DashboardPostListComponent {
	private readonly postService = inject(PostService);
	private readonly tagService = inject(TagService);
	private readonly platformId = inject(PLATFORM_ID);
	private readonly destroyRef = inject(DestroyRef);
	private readonly languageService = inject(LanguageService);
	private readonly translationService = inject(TranslationService);
	private readonly toastService = inject(TuiToastService);
	private readonly dialogs = inject(TuiDialogService);

	readonly PlusSignIcon = PlusSignIcon;
	readonly size = 'm';

	readonly posts = signal<PostDto[]>([]);
	readonly loading = signal(true);
	readonly error = signal<string | null>(null);
	readonly tagMap = signal<Map<string, TagDto>>(new Map());

	readonly searchControl = new FormControl('', { nonNullable: true });

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

	postTagsById(post: PostDto): TagDto[] {
		const tags = this.tagMap();
		return (post.tagIds ?? []).map((id) => tags.get(id)).filter((t): t is TagDto => !!t);
	}

	tagNameOf(tag: TagDto): string {
		return tagNameOfUtil(tag, this.languageService.language());
	}

	statusLabel(status: string): string {
		if (status === 'PUBLISHED') {
			return this.translationService.translate('common.statusPublished');
		}

		if (status === 'DRAFT') {
			return this.translationService.translate('common.statusDraft');
		}

		return status;
	}

	statusColor(status: string): string {
		if (status === 'PUBLISHED') {
			return 'var(--tui-status-positive)';
		}

		if (status === 'DRAFT') {
			return 'var(--tui-status-warning)';
		}

		return 'var(--tui-status-neutral)';
	}

	load(): void {
		if (isPlatformServer(this.platformId)) {
			return;
		}

		this.loading.set(true);
		this.error.set(null);
		const query = this.searchControl.value.trim();

		const direction = this.sortDirection() === TuiSortDirection.Asc ? 'ASC' : 'DESC';

		this.postService
			.search({
				query: {
					query: query || undefined,
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
					this.loadTags(response.content);
				},

				error: () => {
					this.error.set(this.translationService.translate('dashboard.posts.list.failedToLoad'));
					this.loading.set(false);
				},
			});
	}

	private loadTags(posts: PostDto[]): void {
		const ids = collectTagIds(posts);

		if (ids.length === 0) {
			this.tagMap.set(new Map());
			return;
		}

		forkJoin(chunkTagIds(ids).map((chunk) => this.tagService.batch(chunk)))
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: (chunks) => {
					this.tagMap.set(buildTagMap(chunks.flat()));
				},
				error: () => {
					this.tagMap.set(new Map());
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
		this.dialogs
			.open<boolean>(TUI_CONFIRM, {
				label: this.translationService.translate('dashboard.posts.list.deleteConfirm'),
				size: 's',
				data: {
					content: this.translationService.translate('common.cannotUndo'),
					yes: this.translationService.translate('common.delete'),
					no: this.translationService.translate('common.cancel'),
				},
			})
			.pipe(filter(Boolean))
			.subscribe(() => {
				this.postService.delete([id]).subscribe({
					next: () => {
						this.toastService
							.open(this.translationService.translate('dashboard.posts.list.deleted'), {
								appearance: 'success',
								autoClose: 3000,
								data: '@tui.check',
							})
							.subscribe();
						this.load();
					},
					error: () => {
						this.toastService
							.open(this.translationService.translate('dashboard.posts.list.deleteFailed'), {
								appearance: 'error',
								autoClose: 5000,
								data: '@tui.circle-x',
							})
							.subscribe();
					},
				});
			});
	}

	massDelete(): void {
		const ids = Array.from(this.selected());

		if (!ids.length) {
			return;
		}

		this.dialogs
			.open<boolean>(TUI_CONFIRM, {
				label: this.translationService.translate('dashboard.posts.list.deleteMultiple', { count: ids.length }),
				size: 's',
				data: {
					content: this.translationService.translate('dashboard.posts.list.deleteMultipleBody'),
					yes: this.translationService.translate('common.delete'),
					no: this.translationService.translate('common.cancel'),
				},
			})
			.pipe(filter(Boolean))
			.subscribe(() => {
				this.postService.delete(ids).subscribe({
					next: () => {
						this.selected.set(new Set());
						this.toastService
							.open(
								this.translationService.translate('dashboard.posts.list.deletedMultiple', {
									count: ids.length,
								}),
								{
									appearance: 'success',
									autoClose: 3000,
									data: '@tui.check',
								}
							)
							.subscribe();
						this.load();
					},
					error: () => {
						this.toastService
							.open(this.translationService.translate('dashboard.posts.list.deleteMultipleFailed'), {
								appearance: 'error',
								autoClose: 5000,
								data: '@tui.circle-x',
							})
							.subscribe();
					},
				});
			});
	}

	protected readonly Loading03Icon = Loading03Icon;
	protected readonly SparklesIcon = SparklesIcon;
}
