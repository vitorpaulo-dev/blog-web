import {
	Component,
	DestroyRef,
	OnInit,
	PLATFORM_ID,
	computed,
	inject,
	signal,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { TuiAppearance, TuiButton, TuiFilterByInputPipe, TuiTextfield } from '@taiga-ui/core';
import { TuiChevron, TuiDataListWrapper, TuiInputChipComponent, TuiInputChipDirective, TuiMultiSelect, TuiTiles, TuiToastService } from '@taiga-ui/kit';
import { HugeiconsIconComponent } from '@hugeicons/angular';
import { ArrowLeft01Icon, Delete01Icon, GripVerticalIcon, Loading03Icon, SaveIcon, SparklesIcon } from '@hugeicons/core-free-icons';

import {
	FeaturePostPayload,
	Language,
	PostDto,
	PostService,
} from '../../../posts/data-access/post.service';
import { firstTranslation } from '../../../../core/util/text.util';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { LanguageService } from '../../../../core/i18n/language.service';
import { TranslatePipe } from '../../../../core/i18n/translate.pipe';
import { TranslationService } from '../../../../core/i18n/translation.service';

interface PostOption {
	id: string;
	title: string;
}

@Component({
	selector: 'app-featured-manager',
	standalone: true,
	imports: [
		CommonModule,
		ReactiveFormsModule,
		TuiButton,
		TuiTextfield,
		TuiMultiSelect,
		TuiChevron,
		TuiInputChipComponent,
		TuiInputChipDirective,
		TuiDataListWrapper,
		TuiFilterByInputPipe,
		TuiTiles,
		HugeiconsIconComponent,
		TranslatePipe,
		TuiAppearance,
		RouterLink,
	],
	template: `
		<div class="mx-auto px-4 py-8 sm:px-6">
			<div class="mb-6">
				<a
					routerLink="/dashboard/post"
					tuiButton
					tuiAppearance="flat"
					size="s"
					class="inline-flex cursor-pointer items-center gap-1 mb-4 text-sm text-accent"
				>
					<hugeicons-icon [icon]="ArrowLeft01Icon" [size]="16" [strokeWidth]="1.5" />
					{{ 'dashboard.featured.backToPosts' | translate }}
				</a>

				<h1 class="text-2xl font-bold">{{ 'dashboard.featured.title' | translate }}</h1>
			</div>

			@if (loading()) {
				<div class="text-muted text-sm w-full inline-flex justify-center items-center h-full">
					<hugeicons-icon [icon]="Loading03Icon" [size]="32" [strokeWidth]="1.5" />
				</div>
			} @else {
				<div class="flex flex-col gap-5">
					<div class="flex flex-wrap items-center gap-3">
						<tui-textfield multi tuiChevron [stringify]="stringifyPost" class="w-full">
							<label tuiLabel class="flex items-center gap-1.5">
								<hugeicons-icon [icon]="SparklesIcon" [size]="16" [strokeWidth]="2.5" />
								<span>{{ 'dashboard.featured.addLabel' | translate }}</span>
							</label>

							<input
								tuiInputChip
								[formControl]="selection"
								[placeholder]="'dashboard.featured.addPlaceholder' | translate"
								(input)="onSearchInput($event)"
							/>

							<tui-input-chip *tuiItem />

							<tui-data-list-wrapper
								*tuiDropdown
								tuiMultiSelectGroup
								[items]="filteredResults() | tuiFilterByInput"
								[itemContent]="postTemplate"
							/>
						</tui-textfield>
					</div>

					<ng-template #postTemplate let-post>
						{{ post.title }}
					</ng-template>

					@if (featuredPosts().length === 0) {
						<p class="text-sm text-muted">{{ 'dashboard.featured.empty' | translate }}</p>
					} @else {
						<div role="table" class="featured-table">
							<div role="row" class="featured-row featured-head">
								<span role="columnheader" aria-hidden="true" class="w-8 shrink-0"></span>
								<span role="columnheader">
									{{ 'dashboard.featured.postColumn' | translate }}
								</span>
								<span role="columnheader" aria-hidden="true" class="w-8 shrink-0"></span>
							</div>

							<tui-tiles role="rowgroup" class="featured-rows" [(order)]="tileOrder" (orderChange)="onTilesReorder()">
								@for (post of featuredPosts(); track post.id; let i = $index) {
									<tui-tile [style.order]="tileOrder().get(i)">
										<div role="row" class="featured-row">
											<span role="cell" class="w-8 shrink-0 flex items-center justify-center">
												<hugeicons-icon
													[icon]="GripVerticalIcon"
													[size]="16"
													[strokeWidth]="1.5"
													tuiTileHandle
													class="featured-handle"
													[attr.aria-label]="'dashboard.featured.reorderAria' | translate"
												/>
											</span>
											<span role="cell" class="min-w-0 flex-1 truncate text-sm">
												{{ post.title }}
											</span>
											<span role="cell" class="w-8 shrink-0 flex items-center justify-center">
												<button
													type="button"
													tuiButton
													tuiAppearance="accent"
													size="xs"
													class="featured-delete"
													[attr.aria-label]="'dashboard.featured.deleteAria' | translate"
													(click)="remove(post.id)"
												>
													<hugeicons-icon [icon]="Delete01Icon" [size]="16" [strokeWidth]="1.5" />
												</button>
											</span>
										</div>
									</tui-tile>
								}
							</tui-tiles>
						</div>
					}

					@if (error()) {
						<p class="text-sm text-red-400" role="alert">
							{{ error() }}
						</p>
					}

					<div class="flex flex-wrap items-center gap-3">
						<button
							tuiButton
							tuiAppearance="primary"
							type="button"
							[disabled]="!dirty() || saving()"
							(click)="save()"
							class="self-start gap-1"
						>
							<hugeicons-icon [icon]="SaveIcon" [size]="16" [strokeWidth]="2.5" />
							{{ (saving() ? 'dashboard.featured.saving' : 'dashboard.featured.save') | translate }}
						</button>
					</div>
				</div>
			}
		</div>
	`,
	styles: `
		.featured-table {
			width: 100%;
			border: 1px solid var(--tui-border-normal);
			border-radius: var(--tui-radius-l);
			overflow: hidden;
		}

		.featured-row {
			display: grid;
			grid-template-columns: 2rem minmax(0, 1fr) 2rem;
			min-height: var(--tui-height-m);
			align-items: center;
			padding: 0 1rem;
			box-sizing: border-box;
			column-gap: 0.75rem;
		}

		.featured-head {
			color: var(--tui-text-secondary);
			background: var(--tui-background-neutral-1);
			border-block-start: none;
		}

		.featured-rows {
			grid-auto-rows: minmax(var(--tui-height-m), auto);
		}

		.featured-row:not(.featured-head) {
			border-block-start: 1px solid var(--tui-border-normal);
		}

		.featured-handle {
			color: var(--tui-text-secondary);
			cursor: grab;
		}

		.featured-handle:active {
			cursor: grabbing;
		}

		tui-tile._dragged .featured-row {
			background: var(--tui-background-elevation-1);
			box-shadow: var(--tui-shadow-small-hover);
		}

		tui-tile:hover .featured-row {
			background: var(--tui-background-elevation-1);
		}

		.featured-delete {
			width: 1.75rem;
			height: 1.75rem;
			min-height: 1.75rem;
			padding: 0;
		}
	`,
})
export class FeaturedManagerComponent implements OnInit {
	private readonly router = inject(Router);
	private readonly postService = inject(PostService);
	private readonly languageService = inject(LanguageService);
	private readonly translationService = inject(TranslationService);
	private readonly toastService = inject(TuiToastService);
	private readonly platformId = inject(PLATFORM_ID);

	readonly isBrowser = isPlatformBrowser(this.platformId);

	readonly ArrowLeft01Icon = ArrowLeft01Icon;
	readonly SparklesIcon = SparklesIcon;
	readonly SaveIcon = SaveIcon;
	readonly Loading03Icon = Loading03Icon;
	readonly Delete01Icon = Delete01Icon;
	readonly GripVerticalIcon = GripVerticalIcon;

	readonly selection = new FormControl<PostOption[]>([], { nonNullable: true });

	private readonly destroyRef = inject(DestroyRef);

	readonly featuredPosts = signal<PostOption[]>([]);
	readonly tileOrder = signal<Map<number, number>>(new Map());
	readonly searchResults = signal<PostOption[]>([]);
	readonly loading = signal(false);
	readonly saving = signal(false);
	readonly error = signal<string | null>(null);
	readonly selectedIds = signal<Set<string>>(new Set());

	readonly dirty = computed(() => {
		const saved = JSON.stringify(this.savedSnapshot());
		return saved !== JSON.stringify(this.featuredPosts().map((post) => post.id));
	});

	private readonly savedSnapshot = signal<string[]>([]);
	private searchText = '';

	ngOnInit(): void {
		if (!this.isBrowser) {
			return;
		}

		this.loadFeatured();
		this.loadSearchResults();

		this.selection.valueChanges
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe((selected) => this.reconcileSelection(selected ?? []));
	}

	stringifyPost = (post: PostOption): string => post.title;

	filteredResults = computed(() => {
		const selected = this.selectedIds();

		return this.searchResults().filter((post) => !selected.has(post.id));
	});

	onSearchInput(event: Event): void {
		const input = event.target as HTMLInputElement;
		this.searchText = input.value;

		this.loadSearchResults(this.searchText);
	}

	private loadSearchResults(query?: string): void {
		this.postService
			.search({
				query: { query: query || undefined },
				page: 0,
				size: 20,
				sort: 'createdAt',
				direction: 'DESC',
			})
			.subscribe({
				next: (res) => this.searchResults.set(res.content.map((post) => this.toOption(post))),
				error: () => this.searchResults.set([]),
			});
	}

	private reconcileSelection(selected: PostOption[]): void {
		const selectedIds = new Set(selected.map((post) => post.id));
		const kept = this.featuredPosts().filter((post) => selectedIds.has(post.id));
		const keptIds = new Set(kept.map((post) => post.id));
		const appended = selected.filter((post) => !keptIds.has(post.id));

		this.featuredPosts.set([...kept, ...appended]);
		this.selectedIds.set(selectedIds);
	}

	onReorder(posts: readonly PostOption[]): void {
		const reordered = [...posts];

		this.featuredPosts.set(reordered);
		this.selection.setValue(reordered, { emitEvent: false });
		this.tileOrder.set(new Map());
	}

	onTilesReorder(): void {
		const order = this.tileOrder();
		const reordered = [...this.featuredPosts()].sort(
			(a, b) => (order.get(this.indexOf(a)) ?? this.indexOf(a)) - (order.get(this.indexOf(b)) ?? this.indexOf(b)),
		);

		this.featuredPosts.set(reordered);
		this.selection.setValue(reordered, { emitEvent: false });
		this.tileOrder.set(new Map());
	}

	remove(postId: string): void {
		const remaining = this.featuredPosts().filter((post) => post.id !== postId);

		this.featuredPosts.set(remaining);
		this.selection.setValue(remaining, { emitEvent: false });
		this.updateSelectedIds(remaining);
		this.tileOrder.set(new Map());
	}

	private loadFeatured(): void {
		this.loading.set(true);

			this.postService.getFeatured(this.language()).subscribe({
				next: (posts) => {
					const options = posts.map((post) => this.toOption(post));

					this.featuredPosts.set(options);
					this.selection.setValue(options, { emitEvent: false });
					this.savedSnapshot.set(options.map((post) => post.id));
					this.updateSelectedIds(options);
					this.tileOrder.set(new Map());
					this.loading.set(false);
				},
			error: () => {
				this.loading.set(false);
				this.error.set(this.translationService.translate('dashboard.featured.loadFailed'));
			},
		});
	}

	private language(): Language {
		return this.languageService.language();
	}

	private updateSelectedIds(options: PostOption[]): void {
		this.selectedIds.set(new Set(options.map((post) => post.id)));
	}

	private indexOf(post: PostOption): number {
		return this.featuredPosts().findIndex((item) => item.id === post.id);
	}

	private toOption(post: PostDto): PostOption {
		return {
			id: post.id,
			title: firstTranslation(post.translations)?.title ?? post.slug,
		};
	}

	save(): void {
		const payload: FeaturePostPayload[] = this.featuredPosts().map((post, index) => ({
			postId: post.id,
			weight: index + 1,
		}));

		this.saving.set(true);
		this.error.set(null);

		this.postService.setFeatured(payload).subscribe({
			next: () => {
				this.saving.set(false);
				this.savedSnapshot.set(payload.map((item) => item.postId));

				this.toastService
					.open(this.translationService.translate('dashboard.featured.saved'), {
						appearance: 'success',
						autoClose: 3000,
						data: '@tui.check',
					})
					.subscribe();
			},
			error: () => {
				this.saving.set(false);
				this.error.set(this.translationService.translate('dashboard.featured.saveFailed'));
			},
		});
	}

	protected readonly signal = signal;
}
