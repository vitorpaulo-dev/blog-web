import { Component, DestroyRef, effect, inject, PLATFORM_ID, signal } from '@angular/core';
import { CommonModule, isPlatformServer } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { debounceTime, distinctUntilChanged, filter } from 'rxjs';

import { TuiButton, TuiDialogService, TuiDropdown, TuiInput, TuiTextfield } from '@taiga-ui/core';
import { TuiChevron, TuiDataListWrapper, TuiSelect, TuiToastService } from '@taiga-ui/kit';
import { TuiTable, TuiTablePagination } from '@taiga-ui/addon-table';
import { HugeiconsIconComponent } from '@hugeicons/angular';
import { Loading03Icon, UserXIcon } from '@hugeicons/core-free-icons';


import {
	Frequency,
	NewsletterService,
	SubscriberDto,
	SubscriberStatus,
} from '../../data-access/newsletter.service';
import { LanguageService, Language } from '../../../../core/i18n/language.service';
import { TranslatePipe } from '../../../../core/i18n/translate.pipe';
import { TranslationService } from '../../../../core/i18n/translation.service';
import { TUI_CONFIRM } from '@taiga-ui/kit';

const STATUS_LABELS: Record<SubscriberStatus, string> = {
	ACTIVE: 'statusActive',
	UNSUBSCRIBED: 'statusUnsubscribed',
	BOUNCED: 'statusBounced',
};

const LANGUAGE_LABELS: Record<Language, string> = {
	ENGLISH: 'languageEnglish',
	PORTUGUESE: 'languagePortuguese',
};

const FREQUENCY_LABELS: Record<Frequency, string> = {
	EVERY_POST: 'frequencyEveryPost',
	MONTHLY_DIGEST: 'frequencyMonthlyDigest',
};

@Component({
	selector: 'app-dashboard-subscriber-list',
	standalone: true,
	imports: [
		CommonModule,
		ReactiveFormsModule,
		TuiButton,
		TuiTable,
		TuiTablePagination,
		HugeiconsIconComponent,
		TuiInput,
		TuiTextfield,
		TuiSelect,
		TuiChevron,
		TuiDropdown,
		TuiDataListWrapper,
		TranslatePipe,
	],
	template: `
		<div class="mx-auto px-4 py-8 sm:px-6">
			<div class="mb-6 flex items-center justify-between gap-4">
				<h1 class="text-2xl font-bold">{{ 'dashboard.subscribers.title' | translate }}</h1>
			</div>

			<div class="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
				<tui-textfield>
					<label tuiLabel>{{ 'dashboard.subscribers.searchPlaceholder' | translate }}</label>
					<input tuiInput [formControl]="searchControl" />
				</tui-textfield>

				<tui-textfield tuiChevron [content]="statusOption" [stringify]="stringifyStatus">
					<input tuiSelect [formControl]="statusControl" />
					<tui-data-list-wrapper *tuiDropdown [itemContent]="statusOption" [items]="statuses" />
				</tui-textfield>

				<tui-textfield tuiChevron [content]="languageOption" [stringify]="stringifyLanguage">
					<input tuiSelect [formControl]="languageControl" />
					<tui-data-list-wrapper *tuiDropdown [itemContent]="languageOption" [items]="languages" />
				</tui-textfield>

				<tui-textfield tuiChevron [content]="frequencyOption" [stringify]="stringifyFrequency">
					<input tuiSelect [formControl]="frequencyControl" />
					<tui-data-list-wrapper *tuiDropdown [itemContent]="frequencyOption" [items]="frequencies" />
				</tui-textfield>
			</div>

			@if (loading()) {
				<div class="text-muted text-sm w-full inline-flex justify-center items-center h-full">
					<hugeicons-icon [icon]="Loading03Icon" [size]="32" [strokeWidth]="1.5" />
				</div>
			} @else if (subscribers().length === 0) {
				<div class="relative rounded-xl border border-border bg-surface px-8 py-10 text-center shadow-sm text-muted text-sm">
					{{ 'dashboard.subscribers.noSubscribers' | translate }}
				</div>
			} @else {
				<table tuiTable [columns]="columns" class="w-full">
					<thead>
						<tr tuiThGroup>
							<th *tuiHead="'email'" tuiTh>{{ 'dashboard.subscribers.email' | translate }}</th>
							<th *tuiHead="'language'" tuiTh>{{ 'dashboard.subscribers.language' | translate }}</th>
							<th *tuiHead="'frequency'" tuiTh>{{ 'dashboard.subscribers.frequency' | translate }}</th>
							<th *tuiHead="'status'" tuiTh>{{ 'dashboard.subscribers.status' | translate }}</th>
							<th *tuiHead="'createdAt'" tuiTh>{{ 'dashboard.subscribers.createdAt' | translate }}</th>
							<th *tuiHead="'actions'" tuiTh>{{ 'dashboard.subscribers.actions' | translate }}</th>
						</tr>
					</thead>

					<tbody tuiTbody>
						@for (subscriber of subscribers(); track subscriber.id) {
							<tr tuiTr>
								<td *tuiCell="'email'" tuiTd class="font-medium">{{ subscriber.email }}</td>
								<td *tuiCell="'language'" tuiTd>{{ languageLabel(subscriber.language) }}</td>
								<td *tuiCell="'frequency'" tuiTd>{{ frequencyLabel(subscriber.frequency) }}</td>
								<td *tuiCell="'status'" tuiTd>{{ statusLabel(subscriber.status) }}</td>
								<td *tuiCell="'createdAt'" tuiTd>{{ subscriber.createdAt | date: 'shortDate' }}</td>
								<td *tuiCell="'actions'" tuiTd>
									<button
										tuiButton
										tuiAppearance="accent"
										size="s"
										[attr.aria-label]="'dashboard.subscribers.unsubscribe' | translate"
										(click)="askUnsubscribe(subscriber.id)"
									>
										<hugeicons-icon [icon]="UserXIcon" [size]="16" [strokeWidth]="1.5" />
									</button>
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

		<ng-template #statusOption let-value>
			<span class="text-sm">{{ value ? statusLabel(value) : ('dashboard.subscribers.status' | translate) }}</span>
		</ng-template>

		<ng-template #languageOption let-value>
			<span class="text-sm">{{ value ? languageLabel(value) : ('dashboard.subscribers.language' | translate) }}</span>
		</ng-template>

		<ng-template #frequencyOption let-value>
			<span class="text-sm">{{ value ? frequencyLabel(value) : ('dashboard.subscribers.frequency' | translate) }}</span>
		</ng-template>
	`,
})
export class DashboardSubscriberListComponent {
	private readonly newsletterService = inject(NewsletterService);
	private readonly platformId = inject(PLATFORM_ID);
	private readonly destroyRef = inject(DestroyRef);
	private readonly languageService = inject(LanguageService);
	private readonly translationService = inject(TranslationService);
	private readonly toastService = inject(TuiToastService);
	private readonly dialogs = inject(TuiDialogService);

	readonly statuses: SubscriberStatus[] = ['ACTIVE', 'UNSUBSCRIBED', 'BOUNCED'];
	readonly languages: Language[] = ['ENGLISH', 'PORTUGUESE'];
	readonly frequencies: Frequency[] = ['EVERY_POST', 'MONTHLY_DIGEST'];

	readonly searchControl = new FormControl('', { nonNullable: true });
	readonly statusControl = new FormControl<SubscriberStatus | ''>('', { nonNullable: true });
	readonly languageControl = new FormControl<Language | ''>('', { nonNullable: true });
	readonly frequencyControl = new FormControl<Frequency | ''>('', { nonNullable: true });

	readonly subscribers = signal<SubscriberDto[]>([]);
	readonly loading = signal(true);
	readonly error = signal<string | null>(null);

	readonly page = signal(0);
	readonly totalElements = signal(0);

	readonly columns: string[] = ['email', 'language', 'frequency', 'status', 'createdAt', 'actions'];

	protected readonly stringifyStatus = (status: SubscriberStatus | ''): string =>
		status ? this.statusLabel(status) : '';

	protected readonly stringifyLanguage = (language: Language | ''): string =>
		language ? this.languageLabel(language) : '';

	protected readonly stringifyFrequency = (frequency: Frequency | ''): string =>
		frequency ? this.frequencyLabel(frequency) : '';

	constructor() {
		this.searchControl.valueChanges
			.pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
			.subscribe(() => {
				this.page.set(0);
				this.load();
			});

		this.statusControl.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
			this.page.set(0);
			this.load();
		});

		this.languageControl.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
			this.page.set(0);
			this.load();
		});

		this.frequencyControl.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
			this.page.set(0);
			this.load();
		});

		effect(() => {
			this.languageService.language();
			this.load();
		});
	}

	load(): void {
		if (isPlatformServer(this.platformId)) {
			return;
		}

		this.loading.set(true);
		this.error.set(null);

		this.newsletterService
			.listSubscribers({
				query: {
					email: this.searchControl.value.trim() || undefined,
					status: this.statusControl.value || undefined,
					language: this.languageControl.value || undefined,
					frequency: this.frequencyControl.value || undefined,
				},
				page: this.page(),
				size: 10,
				sort: 'createdAt',
				direction: 'DESC',
			})
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: (response) => {
					this.subscribers.set(response.content);
					this.totalElements.set(response.totalElements);
					this.loading.set(false);
				},
				error: () => {
					this.error.set(this.translationService.translate('dashboard.subscribers.failedToLoad'));
					this.loading.set(false);
				},
			});
	}

	statusLabel(status: SubscriberStatus): string {
		return this.translationService.translate(`dashboard.subscribers.${STATUS_LABELS[status]}`);
	}

	languageLabel(language: Language): string {
		return this.translationService.translate(`dashboard.subscribers.${LANGUAGE_LABELS[language]}`);
	}

	frequencyLabel(frequency: Frequency): string {
		return this.translationService.translate(`dashboard.subscribers.${FREQUENCY_LABELS[frequency]}`);
	}

	onPage(page: number): void {
		if (page === this.page()) {
			return;
		}

		this.page.set(page);
		this.load();
	}

	askUnsubscribe(id: string): void {
		this.dialogs
			.open<boolean>(TUI_CONFIRM, {
				label: this.translationService.translate('dashboard.subscribers.unsubscribeConfirmTitle'),
				size: 's',
				data: {
					content: this.translationService.translate('dashboard.subscribers.unsubscribeConfirmMessage'),
					yes: this.translationService.translate('dashboard.subscribers.unsubscribeConfirmYes'),
					no: this.translationService.translate('dashboard.subscribers.unsubscribeConfirmNo'),
				},
			})
			.pipe(filter(Boolean))
			.subscribe(() => {
				this.newsletterService.unsubscribeSubscriber(id).subscribe({
					next: () => {
						this.toastService.open(this.translationService.translate('dashboard.subscribers.unsubscribed'), {
							appearance: 'success',
							autoClose: 3000,
							data: '@tui.check',
						}).subscribe();
						this.load();
					},
					error: () => {
						this.toastService.open(this.translationService.translate('dashboard.subscribers.unsubscribeFailed'), {
							appearance: 'error',
							autoClose: 5000,
							data: '@tui.circle-x',
						}).subscribe();
					},
				});
			});
	}

	protected readonly Loading03Icon = Loading03Icon;
	protected readonly UserXIcon = UserXIcon;
}
