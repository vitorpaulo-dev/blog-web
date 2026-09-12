import {
	Component,
	computed,
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
	Image01Icon,
	Layers01Icon,
	SaveIcon,
	SendIcon,
	Tag01Icon,
} from '@hugeicons/core-free-icons';
import { SafeHtml } from '@angular/platform-browser';

import {
	Language,
	PostService,
} from '../../../posts/data-access/post.service';
import { MarkdownService } from '../../../posts/data-access/markdown.service';
import { ProjectService } from '../../../projects/data-access/project.service';
import { TagService } from '../../../tags/data-access/tag.service';
import { UploadService } from '../../../../core/upload/upload.service';

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
}

interface TranslationValue {
	title: string;
	content: string;
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
		HugeiconsIconComponent,
		TuiInput,
		TuiDataListWrapper,
		TuiFilterByInputPipe,
		TuiChevron,
		TuiInputChipComponent,
		TuiInputChipDirective,
	],
	template: `
		<div class="mx-auto max-w-3xl px-6 py-8">
			<div class="mb-6 flex items-center justify-between">
				<a (click)="goBack()" class="inline-flex cursor-pointer items-center gap-1 text-sm text-accent">
					<hugeicons-icon [icon]="ArrowLeft01Icon" [size]="16" [strokeWidth]="1.5" />
					Back to dashboard
				</a>

				@if (isEdit() && slug()) {
					<a
						[href]="'/post/' + slug()"
						target="_blank"
						class="inline-flex cursor-pointer items-center gap-1 text-sm text-accent"
					>
						<hugeicons-icon [icon]="viewPostIcon" [size]="16" [strokeWidth]="2.5" />
						View Post
					</a>
				}
			</div>

			<h1 class="mb-2 text-2xl font-bold">
				{{ isEdit() ? 'Edit Post' : 'New Post' }}
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
							{{ languageLabel(lang) }}
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
									<span>Title *</span>
								</label>

								<input
									tuiInput
									[formControl]="translationForms()[lang].title"
									placeholder="Post title"
								/>
							</tui-textfield>

							<div class="flex flex-col gap-2">
								<!-- Content tabs -->
								<div class="flex gap-1 border-b border-border">
									<button
										type="button"
										class="-mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors"
										[class.border-accent]="activeTab() === 'edit'"
										[class.text-accent]="activeTab() === 'edit'"
										[class.text-muted]="activeTab() !== 'edit'"
										[class.hover:text-foreground]="activeTab() !== 'edit'"
										(click)="activeTab.set('edit')"
									>
										<hugeicons-icon
											[icon]="editTabIcon"
											[size]="14"
											[strokeWidth]="2.5"
											class="mr-1 inline"
										/>
										Edit
									</button>

									<button
										type="button"
										class="-mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors"
										[class.border-accent]="activeTab() === 'preview'"
										[class.text-accent]="activeTab() === 'preview'"
										[class.text-muted]="activeTab() !== 'preview'"
										[class.hover:text-foreground]="activeTab() !== 'preview'"
										(click)="switchToPreview()"
									>
										<hugeicons-icon
											[icon]="previewTabIcon"
											[size]="14"
											[strokeWidth]="2.5"
											class="mr-1 inline"
										/>
										Preview
									</button>
								</div>

								@if (activeTab() === 'edit') {
									<div
										class="relative"
										(dragover)="onDragOver($event)"
										(dragleave)="onDragLeave($event)"
										(drop)="onDrop($event)"
									>
										<textarea
											[formControl]="translationForms()[lang].content"
											rows="20"
											class="w-full resize-none rounded-xl border border-border bg-surface p-3 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-accent"
											placeholder="Write markdown... (drag & drop images here)"
										></textarea>

										@if (isDragging()) {
											<div
												class="pointer-events-none absolute inset-0 flex items-center justify-center rounded-xl border-2 border-dashed border-accent bg-accent/10"
											>
												<div class="text-center">
													<hugeicons-icon
														[icon]="imageUploadIcon"
														[size]="48"
														[strokeWidth]="1.5"
														class="mx-auto mb-2 text-accent"
													/>
													<p class="text-sm font-medium text-accent">Drop image here</p>
												</div>
											</div>
										}
									</div>
								} @else {
									<div
										class="prose prose-invert min-h-[500px] w-full max-w-none rounded-xl border border-border bg-surface p-4"
									>
										@if (previewHtml()) {
											<div [innerHTML]="previewHtml()"></div>
										} @else {
											<p class="text-sm text-muted">Nothing to preview</p>
										}
									</div>
								}
							</div>
						</div>
					}
				}

				<!-- Banner -->
				<div class="flex flex-col gap-2">
					<label class="flex items-center gap-1.5 text-sm font-medium">
						<hugeicons-icon [icon]="bannerIcon" [size]="16" [strokeWidth]="2.5" />
						<span>Banner</span>
					</label>

					<input
						type="file"
						accept="image/*"
						(change)="onBannerFileSelected($event)"
						[disabled]="uploading()"
						class="w-full cursor-pointer rounded-xl border border-border bg-surface p-3 text-sm file:mr-4 file:cursor-pointer file:rounded-lg file:border-0 file:bg-accent file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-accent-secondary disabled:opacity-50"
					/>

					@if (uploading()) {
						<p class="text-xs text-muted">Uploading...</p>
					}

					@if (bannerUrl()) {
						<img
							[src]="bannerUrl()"
							alt="banner preview"
							class="aspect-video w-full rounded-xl border border-border object-cover"
						/>
					}
				</div>

				<!-- Tags -->
				<tui-textfield multi tuiChevron [stringify]="stringifyTag">
					<label tuiLabel class="flex items-center gap-1.5">
						<hugeicons-icon [icon]="tagsIcon" [size]="16" [strokeWidth]="2.5" />
						<span>Tags</span>
					</label>

					<input tuiInputChip formControlName="tags" placeholder="Select tags" />

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
						<span>Projects</span>
					</label>

					<input
						tuiInputChip
						formControlName="projects"
						placeholder="Select projects"
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
							Save Draft
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
							Publish
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
							Save
						</button>

						@if (currentStatus() === 'PUBLISHED') {
							<button
								tuiButton
								tuiAppearance="outline"
								type="button"
								(click)="save('DRAFT')"
								[disabled]="saving() || uploading()"
								class="gap-1"
							>
								<hugeicons-icon [icon]="saveIcon" [size]="16" [strokeWidth]="2.5" />
								Unpublish
							</button>
						} @else {
							<button
								tuiButton
								tuiAppearance="primary"
								type="button"
								(click)="save('PUBLISHED')"
								[disabled]="saving() || uploading()"
								class="gap-1"
							>
								<hugeicons-icon [icon]="publishIcon" [size]="16" [strokeWidth]="2.5" />
								Publish
							</button>
						}
					}
				</div>
			</form>
		</div>
	`,
})
export class PostEditorComponent implements OnInit {
	private readonly route = inject(ActivatedRoute);
	private readonly router = inject(Router);
	private readonly postService = inject(PostService);
	private readonly projectService = inject(ProjectService);
	private readonly tagService = inject(TagService);
	private readonly markdownService = inject(MarkdownService);
	private readonly uploadService = inject(UploadService);
	private readonly platformId = inject(PLATFORM_ID);
	private readonly toastService = inject(TuiToastService);

	readonly isBrowser = isPlatformBrowser(this.platformId);

	readonly ArrowLeft01Icon = ArrowLeft01Icon;
	readonly titleIcon = Edit01Icon;
	readonly bannerIcon = Image01Icon;
	readonly tagsIcon = Tag01Icon;
	readonly projectsIcon = Layers01Icon;
	readonly saveIcon = SaveIcon;
	readonly publishIcon = SendIcon;
	readonly editTabIcon = Edit01Icon;
	readonly previewTabIcon = EyeIcon;
	readonly imageUploadIcon = Image01Icon;
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
	readonly activeTab = signal<'edit' | 'preview'>('edit');
	readonly previewHtml = signal<SafeHtml | null>(null);
	readonly isDragging = signal(false);
	readonly uploading = signal(false);

	readonly availableTags = signal<TagOption[]>([]);
	readonly availableProjects = signal<ProjectOption[]>([]);
	readonly projectSearchText = signal('');

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
			next: (post) => this.populateForm(post),
			error: () => this.handleLoadError(),
		});
	}

	private populateForm(post: any): void {
		this.form.patchValue({
			bannerUrl: post.bannerUrl ?? '',
		});

		this.populateTranslations(post.translations);
		this.loadPostTags(post.tagIds ?? []);
		this.loadPostProjects(post.projectIds ?? []);

		this.slug.set(post.slug);
		this.currentStatus.set(post.status);
	}

	private populateTranslations(
		translations: Record<Language, { title?: string; content?: string }> | undefined
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
		return !this.isFormValid() || this.saving() || this.uploading();
	}

	editSaveStatus(): PostStatus {
		return this.currentStatus() === 'PUBLISHED' ? 'PUBLISHED' : 'DRAFT';
	}

	languageLabel(language: Language): string {
		return language === 'ENGLISH' ? '🇺🇸 English' : '🇧🇷 Português';
	}

	stringifyTag = (tag: TagOption): string => tag.name;

	stringifyProject = (project: ProjectOption): string => project.title;

	onProjectSearchInput(event: Event): void {
		const input = event.target as HTMLInputElement;

		this.projectSearchText.set(input.value);
	}

	async switchToPreview(): Promise<void> {
		this.activeTab.set('preview');

		const content = this.translationForms()[this.activeLang()].content.value;

		if (!content) {
			this.previewHtml.set(null);
			return;
		}

		const html = await this.markdownService.renderMarkdown(content, this.isBrowser);

		this.previewHtml.set(html);
	}

	onBannerFileSelected(event: Event): void {
		const input = event.target as HTMLInputElement;
		const file = input.files?.[0];

		if (file) {
			this.uploadImage(file, false);
		}
	}

	onDragOver(event: DragEvent): void {
		event.preventDefault();
		event.stopPropagation();

		if (event.dataTransfer?.types.includes('Files')) {
			this.isDragging.set(true);
		}
	}

	onDragLeave(event: DragEvent): void {
		event.preventDefault();
		event.stopPropagation();

		this.isDragging.set(false);
	}

	onDrop(event: DragEvent): void {
		event.preventDefault();
		event.stopPropagation();

		this.isDragging.set(false);

		const file = event.dataTransfer?.files?.[0];

		if (!file || !file.type.startsWith('image/')) {
			return;
		}

		this.uploadImage(file, true);
	}

	private uploadImage(file: File, insertIntoContent: boolean): void {
		this.uploading.set(true);

		this.uploadService.upload(file).subscribe({
			next: (response) => {
				if (insertIntoContent) {
					this.insertImageIntoContent(file, response.url);
				} else {
					this.form.controls.bannerUrl.setValue(response.url);
				}

				this.uploading.set(false);
			},
			error: () => {
				this.uploading.set(false);

				this.showError(insertIntoContent ? 'Failed to upload image' : 'Failed to upload banner image');
			},
		});
	}

	private insertImageIntoContent(file: File, url: string): void {
		const language = this.activeLang();
		const control = this.translationForms()[language].content;

		const markdown = `\n![${file.name}](${url})\n`;

		control.setValue(control.value + markdown);
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
			.open(this.isEdit() ? 'Post updated successfully' : 'Post created successfully', {
				appearance: 'success',
				autoClose: 3000,
				data: '@tui.check',
			})
			.subscribe();

		if (!this.isEdit()) {
			setTimeout(() => void this.router.navigate(['/dashboard/post', response.id]), 800);
		}
	}

	private handleSaveError(error: any): void {
		this.saving.set(false);

		const message = error?.error?.details
			? JSON.stringify(error.error.details)
			: 'Save failed — check validation/permissions';

		this.error.set(message);

		this.showError('Failed to save post. Please try again.');
	}

	private handleLoadError(): void {
		this.toastService
			.open('Failed to load post. Redirecting to dashboard...', {
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

		if (this.activeTab() === 'preview') {
			void this.switchToPreview();
		}
	}
}