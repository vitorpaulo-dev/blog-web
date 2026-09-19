import {
	Component,
	computed,
	DestroyRef,
	inject,
	OnInit,
	PLATFORM_ID,
	signal,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import {
	FormControl,
	FormGroup,
	FormsModule,
	ReactiveFormsModule,
	Validators,
} from '@angular/forms';
import {
	TuiButton,
	TuiDataList,
	TuiDropdown,
	TuiFilterByInputPipe,
	TuiInput,
	TuiTextfield,
} from '@taiga-ui/core';
import {
	TuiChevron,
	TuiChip,
	TuiDataListWrapper, TuiInputChipComponent, TuiInputChipDirective,
	TuiMultiSelect,
	TuiToast,
	TuiToastService,
} from '@taiga-ui/kit';
import { HugeiconsIconComponent } from '@hugeicons/angular';
import {
	ArrowLeft01Icon,
	Edit01Icon,
	ExternalLinkIcon,
	EyeIcon,
	File01Icon,
	HeadsetIcon,
	Image01Icon,
	Layers01Icon,
	MicVocalIcon,
	RefreshCwIcon,
	SaveIcon,
	SendIcon,
	Tag01Icon,
} from '@hugeicons/core-free-icons';

import {
	Language,
	PostService,
} from '../../../posts/data-access/post.service';
import { AudioArtifactDto, AudioService } from '../../../posts/data-access/audio.service';
import { ProjectService } from '../../../projects/data-access/project.service';
import { TagService } from '../../../tags/data-access/tag.service';
import { MarkdownWriterComponent } from '../../../../shared/components/markdown-writer/markdown-writer.component';
import { UploadInputComponent } from '../../../../shared/components/upload-input/upload-input.component';
import { TranslatePipe } from '../../../../core/i18n/translate.pipe';
import { TranslationService } from '../../../../core/i18n/translation.service';

interface ProjectOption {
	id: string;
	title: string;
}

interface TagOption {
	id: string;
	name: string;
}

interface TranslationForm {
	title: FormControl<string>;
	content: FormControl<string>;
	summary: FormControl<string>;
}

interface TranslationValue {
	title: string;
	content: string;
	summary: string;
}

type PostStatus = 'DRAFT' | 'PUBLISHED';

@Component({
	selector: 'app-post-editor',
	standalone: true,
	imports: [
		CommonModule,
		ReactiveFormsModule,
		FormsModule,
		TuiButton,
		TuiTextfield,
		TuiDropdown,
		TuiMultiSelect,
		TuiChevron,
		TuiChip,
		HugeiconsIconComponent,
		TuiInput,
		TuiDataListWrapper,
		TuiFilterByInputPipe,
		TuiChevron,
		TuiInputChipComponent,
		TuiInputChipDirective,
		TranslatePipe,
		MarkdownWriterComponent,
		UploadInputComponent,
	],
	template: `
		<div class="mx-auto px-4 py-8 sm:px-6">
			<div class="mb-6 flex items-center justify-between">
				<a (click)="goBack()" class="inline-flex cursor-pointer items-center gap-1 text-sm text-accent">
					<hugeicons-icon [icon]="ArrowLeft01Icon" [size]="16" [strokeWidth]="1.5" />
					{{ 'common.backToDashboard' | translate }}
				</a>

				@if (isEdit() && slug()) {
					<a
						[href]="'/post/' + slug()"
						target="_blank"
						class="inline-flex cursor-pointer items-center gap-1 text-sm text-accent"
					>
						<hugeicons-icon [icon]="viewPostIcon" [size]="16" [strokeWidth]="2.5" />
						{{ 'dashboard.posts.editor.viewPost' | translate }}
					</a>
				}
			</div>

			<h1 class="mb-2 text-2xl font-bold">
				{{ (isEdit() ? 'dashboard.posts.editor.editHeading' : 'dashboard.posts.editor.newHeading') | translate }}
			</h1>

			<form [formGroup]="form" class="flex flex-col gap-5" (ngSubmit)="onSave()">
				<!-- Language tabs -->
				<div class="flex gap-1 border-b border-border">
					@for (lang of languages; track lang) {
						<button
							type="button"
							class="-mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors"
							[class.border-accent]="activeLang() === lang"
							[class.text-accent]="activeLang() === lang"
							[class.text-muted]="activeLang() !== lang"
							[class.hover:text-foreground]="activeLang() !== lang"
							(click)="changeLanguage(lang)"
						>
							{{ languageLabel(lang) | translate }}
						</button>
					}
				</div>

				<!-- Translation -->
				@for (lang of languages; track lang) {
					@if (activeLang() === lang) {
						<div class="flex flex-col gap-5">
							<tui-textfield>
								<label tuiLabel class="flex items-center gap-1.5">
									<hugeicons-icon [icon]="titleIcon" [size]="16" [strokeWidth]="2.5" />
									<span>{{ 'dashboard.posts.editor.titleLabel' | translate }}</span>
								</label>

								<input
									tuiInput
									[formControl]="translationForms()[lang].title"
									[placeholder]="'dashboard.posts.editor.titlePlaceholder' | translate"
								/>
							</tui-textfield>

							<div class="flex flex-col gap-2">
								<label class="flex items-center gap-1.5 text-sm font-medium">
									<span>{{ 'dashboard.posts.editor.summaryLabel' | translate }}</span>
								</label>
								<textarea
									[formControl]="translationForms()[lang].summary"
									rows="3"
									maxLength="500"
									class="w-full resize-none rounded-xl border border-border bg-surface p-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
									[placeholder]="'dashboard.posts.editor.summaryPlaceholder' | translate"
								></textarea>
							</div>

							<div class="flex flex-col gap-2">
									<app-markdown-writer
										[uploadFolder]="'post'"
									[formControl]="translationForms()[lang].content"
									[placeholder]="'dashboard.posts.editor.contentPlaceholder' | translate"
									[rows]="20"
									/>
									</div>
						</div>
					}
				}

				<!-- Banner -->
				<div class="flex flex-col gap-2">
					<label class="flex items-center gap-1.5 text-sm font-medium">
						<hugeicons-icon [icon]="bannerIcon" [size]="16" [strokeWidth]="2.5" />
						<span>{{ 'dashboard.posts.editor.bannerLabel' | translate }}</span>
					</label>

					<app-upload-input
						folder="post"
						subfolder="banner"
						[formControl]="form.controls.bannerUrl"
						previewAlt="banner preview"
					/>
				</div>

				<!-- Tags -->
				<tui-textfield multi tuiChevron [stringify]="stringifyTag">
					<label tuiLabel class="flex items-center gap-1.5">
						<hugeicons-icon [icon]="tagsIcon" [size]="16" [strokeWidth]="2.5" />
						<span>{{ 'dashboard.posts.editor.tagsLabel' | translate }}</span>
					</label>

					<input tuiInputChip formControlName="tags" [placeholder]="'dashboard.posts.editor.tagsPlaceholder' | translate" />

					<tui-input-chip *tuiItem />

					<tui-data-list-wrapper
						*tuiDropdown
						tuiMultiSelectGroup
						[items]="availableTags() | tuiFilterByInput"
						[itemContent]="tagTemplate"
					/>
				</tui-textfield>

				<ng-template #tagTemplate let-tag>
					{{ tag.name }}
				</ng-template>

				<!-- Projects -->
				<tui-textfield multi tuiChevron [stringify]="stringifyProject">
					<label tuiLabel class="flex items-center gap-1.5">
						<hugeicons-icon [icon]="projectsIcon" [size]="16" [strokeWidth]="2.5" />
						<span>{{ 'dashboard.posts.editor.projectsLabel' | translate }}</span>
					</label>

					<input
						tuiInputChip
						formControlName="projects"
						[placeholder]="'dashboard.posts.editor.projectsPlaceholder' | translate"
						(input)="onProjectSearchInput($event)"
					/>

					<tui-input-chip *tuiItem />

					<tui-data-list-wrapper
						*tuiDropdown
						tuiMultiSelectGroup
						[items]="filteredProjects()"
						[itemContent]="projectTemplate"
					/>
				</tui-textfield>

				<ng-template #projectTemplate let-project>
					{{ project.title }}
				</ng-template>

				@if (error()) {
					<p class="text-sm text-red-400" role="alert">
						{{ error() }}
					</p>
				}

				<!-- Actions -->
				<div class="flex flex-wrap gap-3">
					@if (!isEdit()) {
						<button
							tuiButton
							tuiAppearance="outline"
							type="button"
							(click)="save('DRAFT')"
							[disabled]="isSaveDisabled()"
							class="gap-1"
						>
							<hugeicons-icon [icon]="saveIcon" [size]="16" [strokeWidth]="2.5" />
							{{ 'dashboard.posts.editor.saveDraft' | translate }}
						</button>

						<button
							tuiButton
							tuiAppearance="primary"
							type="button"
							(click)="save('PUBLISHED')"
							[disabled]="isSaveDisabled()"
							class="gap-1"
						>
							<hugeicons-icon [icon]="publishIcon" [size]="16" [strokeWidth]="2.5" />
							{{ 'dashboard.posts.editor.publish' | translate }}
						</button>
					} @else {
						<button
							tuiButton
							tuiAppearance="primary"
							type="button"
							(click)="save(editSaveStatus())"
							[disabled]="isSaveDisabled()"
							class="gap-1"
						>
							<hugeicons-icon [icon]="saveIcon" [size]="16" [strokeWidth]="2.5" />
							{{ 'dashboard.posts.editor.save' | translate }}
						</button>

						@if (currentStatus() === 'PUBLISHED') {
							<button
								tuiButton
								tuiAppearance="outline"
								type="button"
								(click)="save('DRAFT')"
								[disabled]="saving()"
								class="gap-1"
							>
								<hugeicons-icon [icon]="saveIcon" [size]="16" [strokeWidth]="2.5" />
								{{ 'dashboard.posts.editor.unpublish' | translate }}
							</button>
						} @else {
							<button
								tuiButton
								tuiAppearance="primary"
								type="button"
								(click)="save('PUBLISHED')"
								[disabled]="saving()"
								class="gap-1"
							>
								<hugeicons-icon [icon]="publishIcon" [size]="16" [strokeWidth]="2.5" />
								{{ 'dashboard.posts.editor.publish' | translate }}
							</button>
						}
					}
				</div>
			</form>

			<!-- Audio artifacts -->
			@if (isEdit()) {
				<section class="mt-10">
					<h2 class="mb-4 flex items-center gap-2 text-lg font-semibold">
						<hugeicons-icon [icon]="HEADSETIcon" [size]="20" [strokeWidth]="2.5" />
						{{ 'dashboard.posts.editor.audioTitle' | translate }}
					</h2>

					@if (audioError(); as audioErrorText) {
						<p class="text-sm text-red-400" role="alert">{{ audioErrorText }}</p>
					} @else {
						<div class="flex flex-col gap-3">
								@for (artifact of artifacts(); track artifactKey(artifact)) {
								<div class="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3">
									<hugeicons-icon [icon]="artifact.type === 'PODCAST' ? micVocalIcon : HEADSETIcon" [size]="16" [strokeWidth]="2.5" class="text-muted" />

									<span class="text-sm font-medium">{{ typeLabel(artifact.type) | translate }}</span>
									<span class="text-sm text-muted">{{ audioLanguageLabel(artifact.language) | translate }}</span>

									<span class="text-xs font-medium" [class]="statusClass(artifact.status)">
										{{ statusLabel(artifact.status) | translate }}
									</span>

									@if (artifact.status === 'GENERATING' && artifact.progress !== undefined && artifact.progress !== null) {
										<span class="text-xs text-muted">{{ artifact.progress }}%</span>
									}

									@if (artifact.status === 'FAILED' && artifact.error) {
										<span class="text-xs text-red-400">{{ artifact.error }}</span>
									}

									<span class="grow"></span>

									@if (artifact.status !== 'GENERATING') {
										<button
											tuiButton
											tuiAppearance="outline"
											size="s"
											type="button"
											class="gap-1"
											[disabled]="artifactBusy(artifact)"
											(click)="retry(artifact)"
										>
											<hugeicons-icon [icon]="refreshIcon" [size]="14" [strokeWidth]="2.5" />
											{{ 'dashboard.posts.editor.audioRetry' | translate }}
										</button>
									}
								</div>
							}
						</div>
					}
				</section>
			}
		</div>
	`,
})
export class PostEditorComponent implements OnInit {
	private readonly route = inject(ActivatedRoute);
	private readonly router = inject(Router);
	private readonly postService = inject(PostService);
	private readonly projectService = inject(ProjectService);
	private readonly tagService = inject(TagService);
	private readonly platformId = inject(PLATFORM_ID);
	private readonly translationService = inject(TranslationService);
	private readonly toastService = inject(TuiToastService);
	private readonly audioService = inject(AudioService);
	private readonly destroyRef = inject(DestroyRef);
	private audioPollTimer: number | null = null;

	constructor() {
		this.destroyRef.onDestroy(() => this.stopAudioPolling());
	}

	readonly isBrowser = isPlatformBrowser(this.platformId);

	readonly ArrowLeft01Icon = ArrowLeft01Icon;
	readonly titleIcon = Edit01Icon;
	readonly bannerIcon = Image01Icon;
	readonly tagsIcon = Tag01Icon;
	readonly projectsIcon = Layers01Icon;
	readonly saveIcon = SaveIcon;
	readonly publishIcon = SendIcon;
	readonly viewPostIcon = ExternalLinkIcon;

	readonly languages: Language[] = ['ENGLISH', 'PORTUGUESE'];

	readonly form = new FormGroup({
		bannerUrl: new FormControl('', { nonNullable: true }),
		tags: new FormControl<TagOption[]>([]),
		projects: new FormControl<ProjectOption[]>([], {
			nonNullable: true,
		}),
	});

	readonly translationForms = signal<Record<Language, TranslationForm>>({
		ENGLISH: this.createTranslationForm(),
		PORTUGUESE: this.createTranslationForm(),
	});

	readonly activeLang = signal<Language>('ENGLISH');
	readonly slug = signal<string | null>(null);
	readonly currentStatus = signal<PostStatus>('DRAFT');
	readonly isEdit = signal(false);
	readonly saving = signal(false);
	readonly error = signal<string | null>(null);

	readonly availableTags = signal<TagOption[]>([]);
	readonly availableProjects = signal<ProjectOption[]>([]);
	readonly projectSearchText = signal('');

	readonly artifacts = signal<AudioArtifactDto[]>([]);
	readonly audioError = signal<string | null>(null);
	readonly audioBusyKeys = signal<Set<string>>(new Set());

	readonly HEADSETIcon = HeadsetIcon;
	readonly micVocalIcon = MicVocalIcon;
	readonly refreshIcon = RefreshCwIcon;

	readonly bannerUrl = computed(() => this.form.controls.bannerUrl.value);

	readonly filteredProjects = computed(() => {
		const search = this.projectSearchText().trim().toLowerCase();

		if (!search) {
			return this.availableProjects();
		}

		return this.availableProjects().filter((project) => project.title.toLowerCase().includes(search));
	});

	private postId: string | null = null;

	ngOnInit(): void {
		if (!this.isBrowser) {
			return;
		}

		this.loadTags();
		this.loadProjects();
		this.loadPostIfEditing();
	}

	private createTranslationForm(): TranslationForm {
		return {
			title: new FormControl('', {
				nonNullable: true,
				validators: [Validators.required, Validators.maxLength(500)],
			}),
			content: new FormControl('', {
				nonNullable: true,
				validators: [Validators.required],
			}),
			summary: new FormControl('', {
				nonNullable: true,
				validators: [Validators.maxLength(500)],
			}),
		};
	}

	private loadTags(): void {
		this.tagService
			.search({
				query: {},
				page: 0,
				size: 5,
				sort: 'name',
				direction: 'ASC',
			})
			.subscribe({
				next: (response) => {
					this.availableTags.set(
						response.content.map((tag) => ({
							id: tag.id,
							name: this.getTranslationValue(tag.translations, 'name', tag.id),
						}))
					);
				},
			});
	}

	private loadProjects(): void {
		this.projectService
			.search({
				query: {},
				page: 0,
				size: 5,
				sort: 'createdAt',
				direction: 'DESC',
			})
			.subscribe({
				next: (response) => {
					this.availableProjects.set(
						response.content.map((project) => ({
							id: project.id,
							title: this.getTranslationValue(project.translations, 'title', project.id),
						}))
					);
				},
			});
	}

	private loadPostIfEditing(): void {
		const id = this.route.snapshot.paramMap.get('id');

		if (!id) {
			return;
		}

		this.isEdit.set(true);
		this.postId = id;
		this.postService.getById(id).subscribe({
			next: (post) => {
				this.populateForm(post);
				this.loadAudioStatus();
			},
			error: () => this.handleLoadError(),
		});
	}

	private populateForm(post: any): void {
		this.form.patchValue({
			bannerUrl: post.bannerUrl ?? '',
		});

		this.artifacts.set(this.audioService.flattenAudio(post.audio));
		this.ensureAudioPolling();

		this.populateTranslations(post.translations);
		this.loadPostTags(post.tagIds ?? []);
		this.loadPostProjects(post.projectIds ?? []);

		this.slug.set(post.slug);
		this.currentStatus.set(post.status);
	}

	private populateTranslations(
		translations: Record<Language, { title?: string; content?: string; summary?: string }> | undefined
	): void {
		if (!translations) {
			return;
		}

		const forms = this.translationForms();

		for (const language of this.languages) {
			const translation = translations[language];

			if (!translation) {
				continue;
			}

			forms[language].title.setValue(translation.title ?? '');
			forms[language].content.setValue(translation.content ?? '');
			forms[language].summary.setValue(translation.summary ?? '');
		}
	}

	private loadPostTags(tagIds: string[]): void {
		if (!tagIds.length) {
			this.form.controls.tags.setValue([]);
			return;
		}

		this.tagService.batch(tagIds).subscribe({
			next: (tags) => {
				const options = tags.map((tag) => ({
					id: tag.id,
					name: this.getTranslationValue(tag.translations, 'name', tag.id),
				}));

				this.form.controls.tags.setValue(options);
			},
			error: () => {
				this.form.controls.tags.setValue(
					tagIds.map((id) => ({
						id,
						name: id,
					}))
				);
			},
		});
	}

	private loadPostProjects(projectIds: string[]): void {
		if (!projectIds.length) {
			this.form.controls.projects.setValue([]);
			return;
		}

		this.projectService.getByIds(projectIds, 'ENGLISH').subscribe({
			next: (projects) => {
				this.form.controls.projects.setValue(
					projects.map((project) => ({
						id: project.id,
						title: this.getTranslationValue(project.translations, 'title', project.id),
					}))
				);
			},
			error: () => {
				this.form.controls.projects.setValue([]);
			},
		});
	}

	/**
	 * Returns the requested language when available.
	 *
	 * Falls back to the first available translation.
	 *
	 * Only uses the fallback value when no translation exists.
	 */
	private getTranslationValue<T>(
		translations: Record<Language, T> | undefined,
		field: keyof T & string,
		fallback: string
	): string {
		if (!translations) {
			return fallback;
		}

		const english = (translations as any).ENGLISH?.[field] as string | undefined;

		if (english) {
			return english;
		}

		for (const language of this.languages) {
			const value = (translations as any)[language]?.[field] as string | undefined;

			if (value) {
				return value;
			}
		}

		return fallback;
	}

	isFormValid(): boolean {
		if (this.form.invalid) {
			return false;
		}

		const forms = this.translationForms();

		return forms.ENGLISH.title.valid && forms.ENGLISH.content.valid;
	}

	isSaveDisabled(): boolean {
		return !this.isFormValid() || this.saving();
	}

	editSaveStatus(): PostStatus {
		return this.currentStatus() === 'PUBLISHED' ? 'PUBLISHED' : 'DRAFT';
	}

	languageLabel(language: Language): string {
		return language === 'ENGLISH' ? 'dashboard.posts.editor.langEn' : 'dashboard.posts.editor.langPt';
	}

	stringifyTag = (tag: TagOption): string => tag.name;

	stringifyProject = (project: ProjectOption): string => project.title;

	onProjectSearchInput(event: Event): void {
		const input = event.target as HTMLInputElement;

		this.projectSearchText.set(input.value);
	}

	save(status: PostStatus): void {
		if (!this.isFormValid()) {
			return;
		}

		this.saving.set(true);
		this.error.set(null);

		const payload = this.buildPayload(status);

		const request =
			this.isEdit() && this.postId
				? this.postService.update(this.postId, payload)
				: this.postService.create(payload);

		request.subscribe({
			next: (response) => this.handleSaveSuccess(response),
			error: (error) => this.handleSaveError(error),
		});
	}

	private buildPayload(status: PostStatus) {
		const forms = this.translationForms();

		const translations = Object.fromEntries(
			this.languages
				.map<[Language, TranslationValue]>((language) => [
					language,
					{
						title: forms[language].title.value,
						content: forms[language].content.value,
						summary: forms[language].summary.value,
					},
				])
				.filter(([, translation]) => !!(translation.title || translation.content))
		) as Record<Language, TranslationValue>;

		const tagIds = this.form.controls.tags.value?.map((tag) => tag.id) ?? [];
		const projectIds = this.form.controls.projects.value.map((project) => project.id);

		return {
			bannerUrl: this.form.controls.bannerUrl.value || undefined,
			translations,
			tagIds: tagIds.length ? tagIds : undefined,
			projectIds: projectIds.length ? projectIds : undefined,
			status,
		};
	}

	private handleSaveSuccess(response: any): void {
		this.saving.set(false);

		this.slug.set(response.slug);
		this.currentStatus.set(response.status);

		this.toastService
			.open(
				this.translationService.translate(this.isEdit() ? 'dashboard.posts.editor.updated' : 'dashboard.posts.editor.created'),
				{
					appearance: 'success',
					autoClose: 3000,
					data: '@tui.check',
				}
			)
			.subscribe();

		if (!this.isEdit()) {
			setTimeout(() => void this.router.navigate(['/dashboard/post', response.id]), 800);
		}
	}

	private handleSaveError(error: any): void {
		this.saving.set(false);

		const message =
			error?.error?.details
				? JSON.stringify(error.error.details)
				: this.translationService.translate('common.operationFailed');

		this.error.set(message);

		this.showError(this.translationService.translate('dashboard.posts.editor.saveFailed'));
	}

	private handleLoadError(): void {
		this.toastService
			.open(this.translationService.translate('dashboard.posts.editor.loadFailed'), {
				appearance: 'error',
				autoClose: 5000,
				data: '@tui.circle-x',
			})
			.subscribe();

		void this.router.navigate(['/dashboard/post']);
	}

	private showError(message: string): void {
		this.toastService
			.open(message, {
				appearance: 'error',
				autoClose: 5000,
				data: '@tui.circle-x',
			})
			.subscribe();
	}

	onSave(): void {
		// Save is handled explicitly by the action buttons.
	}

	goBack(): void {
		void this.router.navigate(['/dashboard/post']);
	}

	changeLanguage(language: Language): void {
		this.activeLang.set(language);
	}

	loadAudioStatus(): void {
		if (!this.isEdit() || !this.postId) {
			return;
		}

		this.audioError.set(null);

		this.postService.getById(this.postId).subscribe({
			next: (post) => {
				this.artifacts.set(this.audioService.flattenAudio(post.audio));
				this.ensureAudioPolling();
			},
			error: () => {
				this.artifacts.set([]);
				this.audioError.set(this.translationService.translate('dashboard.posts.editor.audioLoadFailed'));
			},
		});
	}

	statusLabel(status: string): string {
		return `dashboard.posts.editor.status${status.charAt(0)}${status.slice(1).toLowerCase()}`;
	}

	artifactBusy(artifact: AudioArtifactDto): boolean {
		return this.audioBusyKeys().has(this.artifactKey(artifact));
	}

	statusClass(status: string): string {
		switch (status) {
			case 'READY':
				return 'text-green-400';
			case 'GENERATING':
				return 'text-amber-400';
			case 'FAILED':
				return 'text-red-400';
			default:
				return 'text-muted';
		}
	}

	typeLabel(type: string): string {
		return type === 'PODCAST' ? 'dashboard.posts.editor.audioPodcast' : 'dashboard.posts.editor.audioNarration';
	}

	audioLanguageLabel(language: Language): string {
		return language === 'ENGLISH'
			? 'dashboard.posts.editor.langEn'
			: 'dashboard.posts.editor.langPt';
	}

	retry(artifact: AudioArtifactDto): void {
		if (!this.postId || artifact.status === 'GENERATING' || this.artifactBusy(artifact)) {
			return;
		}

		const key = this.artifactKey(artifact);
		this.audioBusyKeys.update((keys) => new Set(keys).add(key));

		this.audioService.retry(this.postId, artifact.type, artifact.language).subscribe({
			next: (updated) => {
				this.artifacts.update((current) =>
					current.map((item) =>
						item.type === updated.type && item.language === updated.language ? updated : item,
					),
				);
				this.audioBusyKeys.update((keys) => {
					const next = new Set(keys);
					next.delete(key);
					return next;
				});
				this.toastService.open(this.translationService.translate('dashboard.posts.editor.audioRetryQueued'), {
					appearance: 'success',
					autoClose: 3000,
					data: '@tui.check',
				}).subscribe();
			},
			error: (error) => {
				this.audioBusyKeys.update((keys) => {
					const next = new Set(keys);
					next.delete(key);
					return next;
				});

				const conflict = error?.status === 409;
				this.toastService.open(
					this.translationService.translate(
						conflict ? 'dashboard.posts.editor.audioConflict' : 'dashboard.posts.editor.audioRetryFailed',
					),
					{
						appearance: 'error',
						autoClose: 5000,
						data: '@tui.circle-x',
					},
				).subscribe();
			},
		});
	}

	protected artifactKey(artifact: AudioArtifactDto): string {
		return `${artifact.type}:${artifact.language}`;
	}

	private ensureAudioPolling(): void {
		const generating = this.artifacts().some((artifact) => artifact.status === 'GENERATING');

		if (!generating || this.audioPollTimer !== null) {
			return;
		}

		this.audioPollTimer = window.setInterval(() => this.loadAudioStatus(), 10000);
	}

	private stopAudioPolling(): void {
		if (this.audioPollTimer !== null) {
			window.clearInterval(this.audioPollTimer);
			this.audioPollTimer = null;
		}
	}
}