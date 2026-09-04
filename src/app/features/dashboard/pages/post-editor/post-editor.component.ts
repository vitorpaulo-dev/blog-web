import { Component, inject, signal, OnInit, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { TuiButton, TuiTextfield, TuiDropdown, TuiDataList, TuiInput } from '@taiga-ui/core';
import { TuiChip, TuiInputChip, TuiMultiSelect, TuiChevron, TuiDataListWrapper, TuiComboBox, TuiToastService } from '@taiga-ui/kit';
import { HugeiconsIconComponent } from '@hugeicons/angular';
import { 
  ArrowLeft01Icon, 
  Layers01Icon, 
  Edit01Icon,
  Image01Icon,
  File01Icon,
  Tag01Icon,
  TranslateIcon,
  SaveIcon,
  SendIcon,
  EyeIcon,
  ExternalLinkIcon
} from '@hugeicons/core-free-icons';
import { PostService, Language } from '../../../posts/data-access/post.service';
import { MarkdownService } from '../../../posts/data-access/markdown.service';
import { SafeHtml } from '@angular/platform-browser';

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

@Component({
	selector: 'app-post-editor',
	standalone: true,
	imports: [
		CommonModule,
		ReactiveFormsModule,
		FormsModule,
		TuiButton,
		TuiTextfield,
		TuiChip,
		TuiDropdown,
		TuiDataList,
		TuiInputChip,
		TuiMultiSelect,
		TuiChevron,
		TuiDataListWrapper,
		TuiComboBox,
		HugeiconsIconComponent,
		TuiInput,
	],
	template: `
		<div class="mx-auto max-w-3xl px-6 py-8">
			<div class="flex items-center justify-between mb-6">
				<a (click)="goBack()" class="inline-flex items-center gap-1 text-sm text-accent cursor-pointer">
					<hugeicons-icon [icon]="ArrowLeft01Icon" [size]="16" [strokeWidth]="1.5" /> Back to dashboard
				</a>
				@if (isEdit() && slug()) {
					<a [href]="'/post/' + slug()" target="_blank" class="inline-flex items-center gap-1 text-sm text-accent cursor-pointer">
						<hugeicons-icon [icon]="viewPostIcon" [size]="16" [strokeWidth]="2.5" />
						View Post
					</a>
				}
			</div>

			<h1 class="text-2xl font-bold mb-2">{{ isEdit() ? 'Edit Post' : 'New Post' }}</h1>

			<form [formGroup]="form" class="flex flex-col gap-5" (ngSubmit)="onSave()">
				<!-- Language Tabs -->
				<div class="flex gap-1 border-b border-border">
					@for (lang of languages; track lang) {
						<button
							type="button"
							class="px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px"
							[class.border-accent]="activeLang() === lang"
							[class.text-accent]="activeLang() === lang"
							[class.text-muted]="activeLang() !== lang"
							[class.hover:text-foreground]="activeLang() !== lang"
							(click)="changeLanguage(lang)"
						>
							{{ lang === 'ENGLISH' ? '🇺🇸 English' : '🇧🇷 Português' }}
						</button>
					}
				</div>

				<!-- Translation fields for active language -->
				@for (lang of languages; track lang) {
					@if (activeLang() === lang) {
						<div class="flex flex-col gap-5">
							<tui-textfield>
								<label tuiLabel class="flex items-center gap-1.5">
									<hugeicons-icon [icon]="titleIcon" [size]="16" [strokeWidth]="2.5" class="flex-shrink-0" />
									<span>Title *</span>
								</label>
								<input tuiInput [formControl]="translationForms()[lang].title" placeholder="Post title" />
							</tui-textfield>

							<div class="flex flex-col gap-2">
								<!-- Content tabs -->
								<div class="flex gap-1 border-b border-border">
									<button
										type="button"
										class="px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px"
										[class.border-accent]="activeTab() === 'edit'"
										[class.text-accent]="activeTab() === 'edit'"
										[class.text-muted]="activeTab() !== 'edit'"
										[class.hover:text-foreground]="activeTab() !== 'edit'"
										(click)="activeTab.set('edit')"
									>
										<hugeicons-icon [icon]="editTabIcon" [size]="14" [strokeWidth]="2.5" class="inline mr-1" />
										Edit
									</button>
									<button
										type="button"
										class="px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px"
										[class.border-accent]="activeTab() === 'preview'"
										[class.text-accent]="activeTab() === 'preview'"
										[class.text-muted]="activeTab() !== 'preview'"
										[class.hover:text-foreground]="activeTab() !== 'preview'"
										(click)="switchToPreview()"
									>
										<hugeicons-icon [icon]="previewTabIcon" [size]="14" [strokeWidth]="2.5" class="inline mr-1" />
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
											class="w-full rounded-xl border border-border bg-surface p-3 text-sm font-mono resize-none focus:outline-none focus:ring-2 focus:ring-accent"
											placeholder="Write markdown... (drag & drop images here)"
										></textarea>
										@if (isDragging()) {
											<div class="absolute inset-0 bg-accent/10 border-2 border-dashed border-accent rounded-xl flex items-center justify-center pointer-events-none">
												<div class="text-center">
													<hugeicons-icon [icon]="imageUploadIcon" [size]="48" [strokeWidth]="1.5" class="mx-auto mb-2 text-accent" />
													<p class="text-sm font-medium text-accent">Drop image here</p>
												</div>
											</div>
										}
									</div>
								} @else {
									<div class="w-full rounded-xl border border-border bg-surface p-4 min-h-[500px] prose prose-invert max-w-none">
										@if (previewHtml()) {
											<div [innerHTML]="previewHtml()"></div>
										} @else {
											<p class="text-muted text-sm">Nothing to preview</p>
										}
									</div>
								}
							</div>
						</div>
					}
				}

				<!-- Shared fields (outside language tabs) -->
				<div class="flex flex-col gap-2">
					<label class="text-sm font-medium flex items-center gap-1.5">
						<hugeicons-icon [icon]="bannerIcon" [size]="16" [strokeWidth]="2.5" class="flex-shrink-0" />
						<span>Banner Image</span>
					</label>
					<input 
						type="file" 
						accept="image/*" 
						(change)="onBannerFileSelected($event)"
						class="w-full rounded-xl border border-border bg-surface p-3 text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-accent file:text-white hover:file:bg-accent-secondary file:cursor-pointer cursor-pointer"
					/>
					@if (form.controls.bannerUrl.value) {
						<img
							[src]="form.controls.bannerUrl.value"
							alt="banner preview"
							class="w-full aspect-video object-cover rounded-xl border border-border"
						/>
					}
				</div>

				<tui-textfield multi tuiChevron [stringify]="stringifyTag">
					<label tuiLabel class="flex items-center gap-1.5">
						<hugeicons-icon [icon]="tagsIcon" [size]="16" [strokeWidth]="2.5" class="flex-shrink-0" />
						<span>Tags</span>
					</label>
					<input tuiInputChip formControlName="tags" placeholder="Select tags" />
					<tui-input-chip *tuiItem />
					<tui-data-list *tuiDropdown tuiMultiSelectGroup>
						@for (tag of availableTags; track tag.id) {
							<button tuiOption [value]="tag">{{ tag.name }}</button>
						}
					</tui-data-list>
				</tui-textfield>

				<tui-textfield multi tuiChevron [stringify]="stringifyProject">
					<label tuiLabel class="flex items-center gap-1.5">
						<hugeicons-icon [icon]="projectsIcon" [size]="16" [strokeWidth]="2.5" class="flex-shrink-0" />
						<span>Projects</span>
					</label>
					<input tuiInputChip formControlName="projects" placeholder="Select projects" />
					<tui-input-chip *tuiItem />
					<tui-data-list *tuiDropdown tuiMultiSelectGroup>
						@for (project of availableProjects(); track project.id) {
							<button tuiOption [value]="project">{{ project.title }}</button>
						}
					</tui-data-list>
				</tui-textfield>

				@if (error()) {
					<p class="text-sm text-red-400" role="alert">{{ error() }}</p>
				}
				@if (success()) {
					<p class="text-sm text-green-400" role="status">{{ success() }}</p>
				}

				<div class="flex flex-wrap gap-3">
					@if (!isEdit()) {
						<button
							tuiButton
							appearance="outline"
							type="button"
							(click)="save('DRAFT')"
							[disabled]="!isFormValid() || saving()"
							class="gap-1"
						>
							<hugeicons-icon [icon]="saveIcon" [size]="16" [strokeWidth]="2.5" />
							Save Draft
						</button>
						<button
							tuiButton
							appearance="primary"
							type="button"
							(click)="save('PUBLISHED')"
							[disabled]="!isFormValid() || saving()"
							class="gap-1"
						>
							<hugeicons-icon [icon]="publishIcon" [size]="16" [strokeWidth]="2.5" />
							Publish
						</button>
					} @else {
						<button
							tuiButton
							appearance="primary"
							type="button"
							(click)="save(currentStatus() === 'PUBLISHED' ? 'PUBLISHED' : 'DRAFT')"
							[disabled]="!isFormValid() || saving()"
							class="gap-1"
						>
							<hugeicons-icon [icon]="saveIcon" [size]="16" [strokeWidth]="2.5" />
							Save
						</button>
						@if (currentStatus() === 'PUBLISHED') {
							<button
								tuiButton
								appearance="outline"
								type="button"
								(click)="save('DRAFT')"
								[disabled]="saving()"
								class="gap-1"
							>
								<hugeicons-icon [icon]="saveIcon" [size]="16" [strokeWidth]="2.5" />
								Unpublish
							</button>
						} @else {
							<button
								tuiButton
								appearance="primary"
								type="button"
								(click)="save('PUBLISHED')"
								[disabled]="saving()"
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
	private readonly markdownService = inject(MarkdownService);
	private readonly platformId = inject(PLATFORM_ID);
	private readonly toastService = inject(TuiToastService);

	readonly isBrowser = isPlatformBrowser(this.platformId);
	readonly ArrowLeft01Icon = ArrowLeft01Icon;
	readonly titleIcon = Edit01Icon;
	readonly bannerIcon = Image01Icon;
	readonly contentIcon = File01Icon;
	readonly tagsIcon = Tag01Icon;
	readonly projectsIcon = Layers01Icon;
	readonly saveIcon = SaveIcon;
	readonly publishIcon = SendIcon;
	readonly editTabIcon = Edit01Icon;
	readonly previewTabIcon = EyeIcon;
	readonly imageUploadIcon = Image01Icon;
	readonly viewPostIcon = ExternalLinkIcon;

	readonly languages: Language[] = ['ENGLISH', 'PORTUGUESE'];

	form = new FormGroup({
		bannerUrl: new FormControl('', { nonNullable: true }),
		tags: new FormControl<TagOption[]>([], { nonNullable: true }),
		projects: new FormControl<ProjectOption[]>([], { nonNullable: true }),
	});

	translationForms = signal<Record<Language, TranslationForm>>({
		ENGLISH: {
			title: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(500)] }),
			content: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
		},
		PORTUGUESE: {
			title: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(500)] }),
			content: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
		},
	});

	activeLang = signal<Language>('ENGLISH');
	slug = signal<string | null>(null);
	currentStatus = signal<string>('DRAFT');
	isEdit = signal(false);
	saving = signal(false);
	error = signal<string | null>(null);
	success = signal<string | null>(null);
	activeTab = signal<'edit' | 'preview'>('edit');
	previewHtml = signal<SafeHtml | null>(null);
	isDragging = signal(false);
	private postId: string | null = null;

	availableTags: TagOption[] = [
		{ id: 'tag-1', name: 'Angular' },
		{ id: 'tag-2', name: 'TypeScript' },
		{ id: 'tag-3', name: 'Spring Boot' },
	];

	availableProjects = signal<ProjectOption[]>([
		{ id: '00000000-0000-0000-0000-000000000001', title: 'Demo Project Alpha' },
		{ id: '00000000-0000-0000-0000-000000000002', title: 'Demo Project Beta' },
		{ id: '00000000-0000-0000-0000-000000000003', title: 'Infrastructure' },
	]);

	ngOnInit(): void {
		const id = this.route.snapshot.paramMap.get('id');
		if (id) {
			this.isEdit.set(true);
			this.postId = id;
			this.postService.getById(id).subscribe({
				next: (p) => {
					this.form.patchValue({
						bannerUrl: p.bannerUrl || '',
					});

					// Load translations
					const forms = this.translationForms();
					for (const lang of this.languages) {
						const translation = p.translations?.[lang];
						if (translation) {
							forms[lang].title.setValue(translation.title || '');
							forms[lang].content.setValue(translation.content || '');
						}
					}

					const tags = p.tags.map((t) => {
						const name = t.translations?.['ENGLISH']?.name || t.id;
						return { id: t.id, name };
					});
					this.form.patchValue({ tags });

					const projects = p.projects.map((pr) => {
						const title = pr.translations?.['ENGLISH']?.title || pr.id;
						return { id: pr.id, title };
					});
					this.form.patchValue({ projects });

					this.slug.set(p.slug);
					this.currentStatus.set(p.status);
				},
				error: () => this.error.set('Failed to load post'),
			});
		}
	}

	isFormValid(): boolean {
		if (this.form.invalid) return false;
		const forms = this.translationForms();
		// At least English translation must be valid
		return forms['ENGLISH'].title.valid && forms['ENGLISH'].content.valid;
	}

	stringifyTag = (tag: TagOption): string => tag.name;
	stringifyProject = (project: ProjectOption): string => project.title;

	async switchToPreview(): Promise<void> {
		this.activeTab.set('preview');
		const lang = this.activeLang();
		const content = this.translationForms()[lang].content.value;
		if (content) {
			const html = await this.markdownService.renderMarkdown(content, this.isBrowser);
			this.previewHtml.set(html);
		} else {
			this.previewHtml.set(null);
		}
	}

	onBannerFileSelected(event: Event): void {
		const input = event.target as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;
		this.handleImageFile(file);
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

		const files = event.dataTransfer?.files;
		if (!files || files.length === 0) return;

		const file = files[0];
		if (file.type.startsWith('image/')) {
			this.handleImageFile(file);
		}
	}

	private handleImageFile(file: File): void {
		const reader = new FileReader();
		reader.onload = () => {
			const base64 = reader.result as string;
			const markdown = `\n![${file.name}](${base64})\n`;
			const lang = this.activeLang();
			const currentContent = this.translationForms()[lang].content.value;
			this.translationForms()[lang].content.setValue(currentContent + markdown);
		};
		reader.readAsDataURL(file);
	}

	save(status: string): void {
		if (!this.isFormValid()) return;
		this.saving.set(true);
		this.error.set(null);
		this.success.set(null);

		const tags = this.form.controls.tags.value;
		const projects = this.form.controls.projects.value;
		const tagIds = tags.map((t) => t.id);
		const projectIds = projects.map((p) => p.id);

		const forms = this.translationForms();
		const translations: Record<Language, { title: string; content: string }> = {
			ENGLISH: {
				title: forms.ENGLISH.title.value,
				content: forms.ENGLISH.content.value,
			},
			PORTUGUESE: {
				title: forms.PORTUGUESE.title.value,
				content: forms.PORTUGUESE.content.value,
			},
		};

		// Only send non-empty translations
		const filteredTranslations = {} as Record<Language, { title: string; content: string }>;
		for (const lang of this.languages) {
			if (translations[lang].title || translations[lang].content) {
				filteredTranslations[lang] = translations[lang];
			}
		}

		const payload = {
			bannerUrl: this.form.controls.bannerUrl.value || undefined,
			translations: filteredTranslations,
			tagIds: tagIds.length ? tagIds : undefined,
			projectIds: projectIds.length ? projectIds : undefined,
			status,
		};

		const obs =
			this.isEdit() && this.postId
				? this.postService.update(this.postId, payload)
				: this.postService.create(payload);

		obs.subscribe({
			next: (res) => {
				this.saving.set(false);
				this.success.set(this.isEdit() ? 'Saved!' : 'Created!');
				this.slug.set(res.slug);
				this.currentStatus.set(res.status);
				this.toastService.open(this.isEdit() ? 'Post updated successfully' : 'Post created successfully', {
					appearance: 'success',
					autoClose: 3000,
				});
				if (!this.isEdit()) {
					setTimeout(() => this.router.navigate(['/dashboard/post', res.id]), 800);
				}
			},
			error: (err) => {
				this.saving.set(false);
				const msg = err?.error?.details
					? JSON.stringify(err.error.details)
					: 'Save failed — check validation/permissions';
				this.error.set(msg);
				this.toastService.open('Failed to save post. Please try again.', {
					appearance: 'error',
					autoClose: 5000,
				});
			},
		});
	}

	onSave(): void {
		/* handled by save buttons */
	}

	goBack(): void {
		this.router.navigate(['/dashboard/post']);
	}

	changeLanguage(lang: Language): void {
		this.activeLang.set(lang);
		void this.switchToPreview();
	}
}
