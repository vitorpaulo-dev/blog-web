import { Component, DestroyRef, effect, inject, PLATFORM_ID, signal } from '@angular/core';
import { CommonModule, isPlatformBrowser, isPlatformServer } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { debounceTime, distinctUntilChanged, filter } from 'rxjs';

import { TuiButton, TuiCell, TuiDialogService, TuiInput, TuiTextfield, TuiTitle } from '@taiga-ui/core';
import { TuiSortChange, TuiSortDirection, TuiTable, TuiTablePagination } from '@taiga-ui/addon-table';
import { HugeiconsIconComponent } from '@hugeicons/angular';
import {
	Loading03Icon,
	PlusSignIcon,
} from '@hugeicons/core-free-icons';

import { TagDto, TagService } from '../../../tags/data-access/tag.service';
import { LanguageService } from '../../../../core/i18n/language.service';
import { TranslatePipe } from '../../../../core/i18n/translate.pipe';
import { TranslationService } from '../../../../core/i18n/translation.service';
import { TUI_CONFIRM, TuiStatus, TuiToastService } from '@taiga-ui/kit';

@Component({
	selector: 'app-dashboard-tag-list',
	standalone: true,
	imports: [
		CommonModule,
		ReactiveFormsModule,
		RouterLink,
		TuiButton,
		TuiTable,
		TuiTablePagination,
		HugeiconsIconComponent,
		TuiTextfield,
		TuiInput,
		TuiCell,
		TuiTitle,
		TranslatePipe,
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
				<h1 class="text-2xl font-bold">{{ 'dashboard.tags.list.title' | translate }}</h1>

				<a routerLink="/dashboard/tag/new" tuiButton tuiAppearance="primary" size="m" class="gap-1">
					<hugeicons-icon [icon]="PlusSignIcon" [size]="22" [strokeWidth]="1.5" />
					{{ 'dashboard.tags.list.new' | translate }}
				</a>
			</div>

			<tui-textfield class="mb-4">
				<label tuiLabel>{{ 'dashboard.tags.list.searchLabel' | translate }}</label>
				<input tuiInput [formControl]="searchControl" [placeholder]="'dashboard.tags.list.searchPlaceholder' | translate" />
			</tui-textfield>

			@if (loading()) {
				<div class="text-muted text-sm w-full inline-flex justify-center items-center h-full">
					<hugeicons-icon [icon]="Loading03Icon" [size]="32" [strokeWidth]="1.5" />
				</div>
			} @else if (tags().length === 0) {
				<div class="relative rounded-xl border border-border bg-surface px-8 pt-10 pb-3 text-center shadow-sm">
					<div
						class="absolute left-1/2 top-0 -translate-x-1/2 text-7xl font-serif leading-none text-muted/20"
					>
						"
					</div>

					<blockquote class="relative font-serif text-xl italic leading-relaxed text-foreground sm:text-2xl">
						"{{ 'dashboard.tags.list.emptyQuote' | translate }}"
					</blockquote>

					<footer class="mt-6 text-sm font-medium tracking-wide text-muted">{{ 'dashboard.tags.list.emptyAttribution' | translate }}</footer>
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
								<th *tuiHead="'name'" tuiTh tuiSortable [requiredSort]="true">
									<div [tuiCell]="size">{{ 'dashboard.tags.list.colName' | translate }}</div>
								</th>
								<th *tuiHead="'actions'" tuiTh>
									<div [tuiCell]="size">{{ 'dashboard.tags.list.colActions' | translate }}</div>
								</th>
							</tr>
						</thead>

						<tbody tuiTbody>
							@for (tag of tags(); track tag.id) {
								<tr tuiTr>
									<td *tuiCell="'name'" tuiTd class="max-w-60">
										<div [tuiCell]="size" class="min-w-0">
											<span tuiTitle>
												<span class="block truncate">{{ tagName(tag) }}</span>
												<span tuiSubtitle class="truncate">{{ tag.slug }}</span>
											</span>
										</div>
									</td>

									<td *tuiCell="'actions'" tuiTd>
										<div [tuiCell]="size">
											<span tuiStatus>
												<a
													tuiIconButton
													appearance="action"
													size="xs"
													iconStart="@tui.pencil"
													type="button"
													[routerLink]="['/dashboard/tag', tag.id]"
													[attr.aria-label]="'dashboard.tags.list.editAria' | translate"
												>
													Edit
												</a>

												<button
													tuiIconButton
													appearance="action"
													size="xs"
													iconStart="@tui.trash"
													type="button"
													[attr.aria-label]="'dashboard.tags.list.deleteAria' | translate"
													(click)="askDeleteOne(tag.id)"
												>
													Delete
												</button>
											</span>
										</div>
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
export class DashboardTagListComponent {
	private readonly tagService = inject(TagService);
	private readonly platformId = inject(PLATFORM_ID);
	private readonly destroyRef = inject(DestroyRef);
	private readonly languageService = inject(LanguageService);
	private readonly translationService = inject(TranslationService);
	private readonly toastService = inject(TuiToastService);
	private readonly dialogs = inject(TuiDialogService);

	readonly PlusSignIcon = PlusSignIcon;
	readonly size = 'm';

	readonly searchControl = new FormControl('', {
		nonNullable: true,
	});

	readonly tags = signal<TagDto[]>([]);
	readonly loading = signal(true);
	readonly error = signal<string | null>(null);

	readonly page = signal(0);
	readonly totalPages = signal(1);
	readonly totalElements = signal(0);

	readonly sortKey = signal<string>('name');
	readonly sortDirection = signal<TuiSortDirection>(TuiSortDirection.Asc);

	readonly columns: string[] = ['name', 'actions'];

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

	tagName(tag: TagDto): string {
		const lang = this.languageService.language();
		return tag.translations?.[lang]?.name || tag.translations?.['ENGLISH']?.name || '';
	}

	load(): void {
		if (isPlatformServer(this.platformId)) {
			return;
		}

		this.loading.set(true);
		this.error.set(null);

		const query = this.searchControl.value.trim();
		const direction = this.sortDirection() === TuiSortDirection.Asc ? 'ASC' : 'DESC';

		this.tagService
			.search({
				query: {
					name: query || undefined,
				},
				page: this.page(),
				size: 10,
				sort: this.sortKey(),
				direction,
			})
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: (response) => {
					this.tags.set(response.content);
					this.totalPages.set(response.totalPages || 1);
					this.totalElements.set(response.totalElements);
					this.loading.set(false);
				},
				error: () => {
					this.error.set(this.translationService.translate('dashboard.tags.list.failedToLoad'));
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
		if (!event.sortKey) {
			return;
		}

		const nextSortKey = event.sortKey as string;
		const nextDirection = event.sortDirection;
		if (nextSortKey === this.sortKey() && nextDirection === this.sortDirection()) {
			return;
		}

		this.sortKey.set(nextSortKey);
		this.sortDirection.set(nextDirection);
		this.page.set(0);

		this.load();
	}

	askDeleteOne(id: string): void {
		this.dialogs
			.open<boolean>(TUI_CONFIRM, {
				label: this.translationService.translate('dashboard.tags.list.deleteConfirm'),
				size: 's',
				data: {
					content: this.translationService.translate('common.cannotUndo'),
					yes: this.translationService.translate('common.delete'),
					no: this.translationService.translate('common.cancel'),
				},
			})
			.pipe(filter(Boolean))
			.subscribe(() => {
				this.tagService.delete([id]).subscribe({
					next: () => {
						this.toastService.open(this.translationService.translate('dashboard.tags.list.deleted'), {
							appearance: 'success',
							autoClose: 3000,
							data: '@tui.check',
						}).subscribe();
						this.load();
					},
					error: () => {
						this.toastService.open(this.translationService.translate('dashboard.tags.list.deleteFailed'), {
							appearance: 'error',
							autoClose: 5000,
							data: '@tui.circle-x',
						}).subscribe();
					},
				});
			});
	}

	protected readonly Loading03Icon = Loading03Icon;
}
