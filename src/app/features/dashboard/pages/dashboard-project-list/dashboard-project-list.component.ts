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
	Calendar01Icon,
	Delete01Icon,
	Edit01Icon,
	Loading03Icon,
	PlusSignIcon,
} from '@hugeicons/core-free-icons';

import { LanguageService } from '../../../../core/i18n/language.service';
import { TUI_CONFIRM, TuiToastService } from '@taiga-ui/kit';
import { ProjectDto, ProjectService } from '../../../projects/data-access/project.service';

@Component({
	selector: 'app-dashboard-project-list',
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
				<h1 class="text-2xl font-bold">Projects</h1>

				<a routerLink="/dashboard/project/new" tuiButton tuiAppearance="primary" size="m" class="gap-1">
					<hugeicons-icon [icon]="PlusSignIcon" [size]="22" [strokeWidth]="1.5" />
					New Project
				</a>
			</div>

			<tui-textfield class="mb-4">
				<label tuiLabel>Search</label>
				<input tuiInput [formControl]="searchControl" placeholder="Search projects..." />
			</tui-textfield>

			@if (loading()) {
				<div class="text-muted text-sm w-full inline-flex justify-center items-center h-full">
					<hugeicons-icon [icon]="Loading03Icon" [size]="32" [strokeWidth]="1.5" />
				</div>
			} @else if (projects().length === 0) {
				<div class="relative rounded-xl border border-border bg-surface px-8 pt-10 pb-3 text-center shadow-sm">
					<div
						class="absolute left-1/2 top-0 -translate-x-1/2 text-7xl font-serif leading-none text-muted/20"
					>
						"
					</div>

					<blockquote class="relative font-serif text-xl italic leading-relaxed text-foreground sm:text-2xl">
						"No project is too small to teach you something valuable."
					</blockquote>

					<footer class="mt-6 text-sm font-medium tracking-wide text-muted">Dev Wisdom</footer>
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
							<th *tuiHead="'actions'" tuiTh>Actions</th>
						</tr>
					</thead>

					<tbody tuiTbody>
						@for (project of projects(); track project.id) {
							<tr tuiTr>
								<td *tuiCell="'title'" tuiTd class="font-medium truncate max-w-60">
									{{ projectTitle(project) }}
								</td>

								<td *tuiCell="'status'" tuiTd>
									<span
										class="rounded-full border px-2 py-0.5 text-xs"
										[class.bg-green-500/20]="project.status === 'PUBLISHED'"
										[class.bg-yellow-500/20]="project.status === 'DRAFT'"
									>
										{{ project.status }}
									</span>
								</td>

								<td *tuiCell="'createdAt'" tuiTd>
									<span class="inline-flex items-center gap-1 text-xs">
										<hugeicons-icon [icon]="Calendar01Icon" [size]="12" [strokeWidth]="1.5" />
										{{ project.createdAt | date: 'dd MMM yyyy' }}
									</span>
								</td>

								<td *tuiCell="'viewCount'" tuiTd>
									{{ project.viewCount }}
								</td>

								<td *tuiCell="'reactionCount'" tuiTd>
									{{ project.reactionCount }}
								</td>

								<td *tuiCell="'authors'" tuiTd>
									<div class="flex flex-wrap gap-1">
										@for (author of project.authors; track author.id) {
											<span class="text-xs">
												{{ author.name }}
											</span>
										}
									</div>
								</td>

								<td *tuiCell="'actions'" tuiTd>
									<div class="flex items-center gap-2">
										<a
											[routerLink]="['/dashboard/project', project.id]"
											tuiButton
											tuiAppearance="outline"
											size="s"
											aria-label="Edit project"
										>
											<hugeicons-icon [icon]="Edit01Icon" [size]="16" [strokeWidth]="1.5" />
										</a>

										<button
											tuiButton
											tuiAppearance="accent"
											size="s"
											aria-label="Delete project"
											(click)="askDeleteOne(project.id)"
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
export class DashboardProjectListComponent {
	private readonly projectService = inject(ProjectService);
	private readonly platformId = inject(PLATFORM_ID);
	private readonly destroyRef = inject(DestroyRef);
	private readonly languageService = inject(LanguageService);
	private readonly toastService = inject(TuiToastService);
	private readonly dialogs = inject(TuiDialogService);

	readonly PlusSignIcon = PlusSignIcon;
	readonly Edit01Icon = Edit01Icon;
	readonly Delete01Icon = Delete01Icon;
	readonly Calendar01Icon = Calendar01Icon;

	readonly searchControl = new FormControl('', {
		nonNullable: true,
	});

	readonly projects = signal<ProjectDto[]>([]);
	readonly loading = signal(true);
	readonly error = signal<string | null>(null);

	readonly page = signal(0);
	readonly totalPages = signal(1);
	readonly totalElements = signal(0);

	readonly sortKey = signal<keyof ProjectDto>('createdAt');
	readonly sortDirection = signal<TuiSortDirection>(TuiSortDirection.Desc);

	readonly columns: (keyof ProjectDto | string)[] = [
		'title',
		'status',
		'createdAt',
		'viewCount',
		'reactionCount',
		'authors',
		'actions',
	];

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

	projectTitle(project: ProjectDto): string {
		const lang = this.languageService.language();
		return project.translations?.[lang]?.title || project.translations?.['ENGLISH']?.title || '';
	}

	load(): void {
		if (isPlatformServer(this.platformId)) {
			return;
		}

		this.loading.set(true);
		this.error.set(null);

		const query = this.searchControl.value.trim();
		const direction = this.sortDirection() === TuiSortDirection.Asc ? 'ASC' : 'DESC';

		this.projectService
			.search({
				query: {
					query: query || undefined
				},
				page: this.page(),
				size: 10,
				sort: this.sortKey() as string,
				direction,
			})
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: (response) => {
					this.projects.set(response.content);
					this.totalPages.set(response.totalPages || 1);
					this.totalElements.set(response.totalElements);
					this.loading.set(false);
				},
				error: () => {
					this.error.set('Failed to load projects.');
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

		const nextSortKey = event.sortKey as keyof ProjectDto;
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
				label: 'Delete project?',
				size: 's',
				data: {
					content: 'This action cannot be undone.',
					yes: 'Delete',
					no: 'Cancel',
				},
			})
			.pipe(filter(Boolean))
			.subscribe(() => {
				this.projectService.delete([id]).subscribe({
					next: () => {
						this.toastService.open('Project deleted successfully', {
							appearance: 'success',
							autoClose: 3000,
							data: '@tui.check',
						}).subscribe();
						this.load();
					},
					error: () => {
						this.toastService.open('Failed to delete project. Please try again.', {
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
