import { Component, DestroyRef, effect, inject, PLATFORM_ID, signal } from '@angular/core';
import { CommonModule, isPlatformBrowser, isPlatformServer } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { debounceTime, distinctUntilChanged, filter } from 'rxjs';

import { TuiAppearance, TuiButton, TuiDialogService, TuiInput, TuiTextfield } from '@taiga-ui/core';
import { TuiSortChange, TuiSortDirection, TuiTable, TuiTablePagination } from '@taiga-ui/addon-table';
import { HugeiconsIconComponent } from '@hugeicons/angular';
import {
	Delete01Icon,
	Edit01Icon,
	Loading03Icon,
	PlusSignIcon,
} from '@hugeicons/core-free-icons';

import { TagDto, TagService } from '../../../tags/data-access/tag.service';
import { LanguageService } from '../../../../core/i18n/language.service';
import { TranslatePipe } from '../../../../core/i18n/translate.pipe';
import { TranslationService } from '../../../../core/i18n/translation.service';
import { TUI_CONFIRM, TuiToastService } from '@taiga-ui/kit';

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
		TuiAppearance,
		TuiTextfield,
		TuiInput,
		TranslatePipe,
	],
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
							<th *tuiHead="'name'" tuiTh tuiSortable [requiredSort]="true">{{ 'dashboard.tags.list.colName' | translate }}</th>
							<th *tuiHead="'actions'" tuiTh>{{ 'dashboard.tags.list.colActions' | translate }}</th>
						</tr>
					</thead>

					<tbody tuiTbody>
						@for (tag of tags(); track tag.id) {
							<tr tuiTr>
								<td *tuiCell="'name'" tuiTd class="font-medium">
									{{ tagName(tag) }}
								</td>

								<td *tuiCell="'actions'" tuiTd>
									<div class="flex items-center gap-2">
										<a
											[routerLink]="['/dashboard/tag', tag.id]"
											tuiButton
											tuiAppearance="outline"
											size="s"
											[attr.aria-label]="'dashboard.tags.list.editAria' | translate"
										>
											<hugeicons-icon [icon]="Edit01Icon" [size]="16" [strokeWidth]="1.5" />
										</a>

										<button
											tuiButton
											tuiAppearance="accent"
											size="s"
											[attr.aria-label]="'dashboard.tags.list.deleteAria' | translate"
											(click)="askDeleteOne(tag.id)"
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
	readonly Edit01Icon = Edit01Icon;
	readonly Delete01Icon = Delete01Icon;

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
