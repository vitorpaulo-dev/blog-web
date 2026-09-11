import { Component, inject, signal, OnInit, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TuiButton, TuiTextfield, TuiInput, TuiDropdown, TuiDataList, TuiFilterByInputPipe } from '@taiga-ui/core';
import { TuiToastService, TuiInputChip, TuiChip, TuiMultiSelect, TuiChevron, TuiDataListWrapper } from '@taiga-ui/kit';
import { HugeiconsIconComponent } from '@hugeicons/angular';
import {
	ArrowLeft01Icon,
	Edit01Icon,
	SaveIcon,
	SendIcon,
	ExternalLinkIcon,
	Image01Icon,
	GithubIcon,
	GlobalIcon,
	WebProgrammingIcon
} from '@hugeicons/core-free-icons';
import type { Language } from '../../../posts/data-access/post.service';
import { ProjectService } from '../../../projects/data-access/project.service';
import { TagService, TagDto } from '../../../tags/data-access/tag.service';
import { UploadService } from '../../../../core/upload/upload.service';
import { firstTranslation } from '../../../../core/util/text.util';

interface TranslationForm {
	title: FormControl<string>;
	description: FormControl<string>;
}

function slugify(text: string): string {
	return text
		.toLowerCase()
		.trim()
		.replace(/[^\w\s-]/g, '')
		.replace(/[\s_]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.slice(0, 80);
}

@Component({
	selector: 'app-project-editor',
	standalone: true,
	imports: [
		CommonModule,
		ReactiveFormsModule,
		TuiButton,
		TuiTextfield,
		TuiInput,
		TuiDropdown,
		TuiDataList,
		TuiInputChip,
		TuiChip,
		TuiMultiSelect,
		TuiChevron,
		HugeiconsIconComponent,
		TuiDataListWrapper,
		TuiFilterByInputPipe,
	],
	template: `
		<div class="mx-auto max-w-3xl px-6 py-8">
			<div class="flex items-center justify-between mb-6">
				<a (click)="goBack()" class="inline-flex items-center gap-1 text-sm text-accent cursor-pointer">
					<hugeicons-icon [icon]="ArrowLeft01Icon" [size]="16" [strokeWidth]="1.5" /> Back to dashboard
				</a>
				@if (isEdit() && slug()) {
					<a [href]="'/project/' + slug()" target="_blank" class="inline-flex items-center gap-1 text-sm text-accent cursor-pointer">
						<hugeicons-icon [icon]="viewProjectIcon" [size]="16" [strokeWidth]="2.5" />
						View Project
					</a>
				}
			</div>

			<h1 class="text-2xl font-bold mb-2">{{ isEdit() ? 'Edit Project' : 'New Project' }}</h1>

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
							(click)="activeLang.set(lang)"
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
								<input tuiInput [formControl]="translationForms()[lang].title" placeholder="Project title" />
							</tui-textfield>

							<div class="flex flex-col gap-2">
								<label class="text-sm font-medium">Description</label>
								<textarea
									[formControl]="translationForms()[lang].description"
									rows="6"
									class="w-full rounded-xl border border-border bg-surface p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-accent"
									placeholder="Project description"
								></textarea>
							</div>
						</div>
					}
				}

				<!-- Shared fields -->
				<div class="flex flex-col gap-2">
					<label class="text-sm font-medium flex items-center gap-1.5">
						<hugeicons-icon [icon]="logoIcon" [size]="16" [strokeWidth]="2.5" class="flex-shrink-0" />
						<span>Logo</span>
					</label>
					<input 
						type="file" 
						accept="image/*" 
						(change)="onLogoFileSelected($event)"
						[disabled]="uploading()"
						class="w-full rounded-xl border border-border bg-surface p-3 text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-accent file:text-white hover:file:bg-accent-secondary file:cursor-pointer cursor-pointer disabled:opacity-50"
					/>
					@if (uploading()) {
						<p class="text-xs text-muted">Uploading...</p>
					}
					@if (form.controls.logoUrl.value) {
						<img
							[src]="form.controls.logoUrl.value"
							alt="logo preview"
							class="w-20 h-20 aspect-square object-cover rounded-xl border border-border"
						/>
					}
				</div>

				<div class="flex flex-col gap-2">
					<label class="text-sm font-medium flex items-center gap-1.5">
						<hugeicons-icon [icon]="bannerIcon" [size]="16" [strokeWidth]="2.5" class="flex-shrink-0" />
						<span>Banner</span>
					</label>
					<input 
						type="file" 
						accept="image/*" 
						(change)="onBannerFileSelected($event)"
						[disabled]="uploading()"
						class="w-full rounded-xl border border-border bg-surface p-3 text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-accent file:text-white hover:file:bg-accent-secondary file:cursor-pointer cursor-pointer disabled:opacity-50"
					/>
					@if (uploading()) {
						<p class="text-xs text-muted">Uploading...</p>
					}
					@if (form.controls.bannerUrl.value) {
						<img
							[src]="form.controls.bannerUrl.value"
							alt="banner preview"
							class="w-full aspect-video object-cover rounded-xl border border-border"
						/>
					}
				</div>

				<tui-textfield>
					<label tuiLabel class="flex items-center gap-1.5">
						<hugeicons-icon [icon]="githubIcon" [size]="16" [strokeWidth]="2.5" class="flex-shrink-0" />
						<span>GitHub URL</span>
					</label>
					<input tuiInput formControlName="githubUrl" placeholder="https://github.com/..." />
				</tui-textfield>

				<tui-textfield>
					<label tuiLabel class="flex items-center gap-1.5">
						<hugeicons-icon [icon]="websiteIcon" [size]="16" [strokeWidth]="2.5" class="flex-shrink-0" />
						<span>Website URL</span>
					</label>
					<input tuiInput formControlName="websiteUrl" placeholder="https://..." />
				</tui-textfield>

			<tui-textfield multi tuiChevron [stringify]="stringifyTag">
				<label tuiLabel class="flex items-center gap-1.5">
					<hugeicons-icon [icon]="webProgrammingIcon" [size]="16" [strokeWidth]="2.5" class="flex-shrink-0" />
					<span>Programming Languages</span>
				</label>
				<input tuiInputChip formControlName="tagIds" placeholder="Select languages" />
				<tui-input-chip *tuiItem />
				<tui-data-list-wrapper *tuiDropdown tuiMultiSelectGroup [items]="availableTags() | tuiFilterByInput" [itemContent]="tagTemplate" />
			</tui-textfield>
			<ng-template #tagTemplate let-tag>{{ stringifyTag(tag) }}</ng-template>

				@if (error()) {
					<p class="text-sm text-red-400" role="alert">{{ error() }}</p>
				}

				<div class="flex flex-wrap gap-3">
					@if (!isEdit()) {
						<button
							tuiButton
							tuiAppearance="outline"
							type="button"
							(click)="save('DRAFT')"
							[disabled]="!isFormValid() || saving() || uploading()"
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
							[disabled]="!isFormValid() || saving() || uploading()"
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
							(click)="save(currentStatus() === 'PUBLISHED' ? 'PUBLISHED' : 'DRAFT')"
							[disabled]="!isFormValid() || saving() || uploading()"
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
export class ProjectEditorComponent implements OnInit {
	private readonly route = inject(ActivatedRoute);
	private readonly router = inject(Router);
	private readonly projectService = inject(ProjectService);
	private readonly tagService = inject(TagService);
	private readonly uploadService = inject(UploadService);
	private readonly platformId = inject(PLATFORM_ID);
	private readonly toastService = inject(TuiToastService);

	readonly isBrowser = isPlatformBrowser(this.platformId);
	readonly ArrowLeft01Icon = ArrowLeft01Icon;
	readonly titleIcon = Edit01Icon;
	readonly logoIcon = Image01Icon;
	readonly bannerIcon = Image01Icon;
	readonly githubIcon = GithubIcon;
	readonly websiteIcon = GlobalIcon;
	readonly webProgrammingIcon = WebProgrammingIcon;
	readonly saveIcon = SaveIcon;
	readonly publishIcon = SendIcon;
	readonly viewProjectIcon = ExternalLinkIcon;

	readonly languages: Language[] = ['ENGLISH', 'PORTUGUESE'];

	form = new FormGroup({
		logoUrl: new FormControl('', { nonNullable: true }),
		bannerUrl: new FormControl('', { nonNullable: true }),
		githubUrl: new FormControl('', { nonNullable: true }),
		websiteUrl: new FormControl('', { nonNullable: true }),
		tagIds: new FormControl<TagDto[]>([], { nonNullable: true }),
	});

	translationForms = signal<Record<Language, TranslationForm>>({
		ENGLISH: {
			title: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(500)] }),
			description: new FormControl('', { nonNullable: true }),
		},
		PORTUGUESE: {
			title: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(500)] }),
			description: new FormControl('', { nonNullable: true }),
		},
	});

	activeLang = signal<Language>('ENGLISH');
	slug = signal<string | null>(null);
	slugPreview = signal<string>('');
	currentStatus = signal<string>('DRAFT');
	isEdit = signal(false);
	saving = signal(false);
	uploading = signal(false);
	error = signal<string | null>(null);
	private projectId: string | null = null;

	availableTags = signal<TagDto[]>([]);

	stringifyTag = (tag: TagDto): string => firstTranslation(tag.translations)?.name ?? '';

	ngOnInit(): void {
		if (!this.isBrowser) return;

		// Load available tags
		this.tagService.search({
			query: {},
			page: 0,
			size: 5,
			sort: 'name',
			direction: 'ASC',
		}).subscribe({
			next: (res) => {
				this.availableTags.set(res.content);
			},
		});

		const id = this.route.snapshot.paramMap.get('id');
		if (id) {
			this.isEdit.set(true);
			this.projectId = id;
			this.projectService.getById(id).subscribe({
				next: (p) => {
					this.form.patchValue({
						logoUrl: p.logoUrl || '',
						bannerUrl: p.bannerUrl || '',
						githubUrl: p.githubUrl || '',
						websiteUrl: p.websiteUrl || '',
						tagIds: p.tags || [],
					});

					const forms = this.translationForms();
					for (const lang of this.languages) {
						const translation = p.translations?.[lang];
						if (translation) {
							forms[lang].title.setValue(translation.title || '');
							forms[lang].description.setValue(translation.description || '');
						}
					}

					this.slug.set(p.slug);
					this.slugPreview.set(p.slug);
					this.currentStatus.set(p.status);
				},
				error: () => {
					this.toastService.open('Failed to load project. Redirecting to dashboard...', {
						appearance: 'error',
						autoClose: 5000,
						data: '@tui.circle-x',
					}).subscribe();
					void this.router.navigate(['/dashboard/project']);
				},
			});
		}

		// Update slug preview when English title changes
		this.translationForms()['ENGLISH'].title.valueChanges.subscribe((title) => {
			if (!this.isEdit()) {
				this.slugPreview.set(slugify(title));
			}
		});
	}

	isFormValid(): boolean {
		if (this.form.invalid) return false;
		const forms = this.translationForms();
		return forms['ENGLISH'].title.valid;
	}

	onLogoFileSelected(event: Event): void {
		const input = event.target as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;
		this.uploadImage(file, 'logoUrl');
	}

	onBannerFileSelected(event: Event): void {
		const input = event.target as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;
		this.uploadImage(file, 'bannerUrl');
	}

	private uploadImage(file: File, fieldName: 'logoUrl' | 'bannerUrl'): void {
		this.uploading.set(true);
		this.uploadService.upload(file).subscribe({
			next: (res) => {
				this.form.patchValue({ [fieldName]: res.url });
				this.uploading.set(false);
			},
			error: () => {
				this.uploading.set(false);
				this.toastService.open(`Failed to upload ${fieldName === 'logoUrl' ? 'logo' : 'banner'} image`, {
					appearance: 'error',
					autoClose: 5000,
					data: '@tui.circle-x',
				}).subscribe();
			},
		});
	}

	save(status: 'DRAFT' | 'PUBLISHED'): void {
		if (!this.isFormValid()) return;
		this.saving.set(true);
		this.error.set(null);

		const forms = this.translationForms();
		const translations: Record<Language, { title: string; description: string }> = {
			ENGLISH: {
				title: forms.ENGLISH.title.value,
				description: forms.ENGLISH.description.value,
			},
			PORTUGUESE: {
				title: forms.PORTUGUESE.title.value,
				description: forms.PORTUGUESE.description.value,
			},
		};

		const filteredTranslations = {} as Record<Language, { title: string; description: string }>;
		for (const lang of this.languages) {
			if (translations[lang].title || translations[lang].description) {
				filteredTranslations[lang] = translations[lang];
			}
		}

		const payload = {
			logoUrl: this.form.controls.logoUrl.value,
			bannerUrl: this.form.controls.bannerUrl.value,
			githubUrl: this.form.controls.githubUrl.value,
			websiteUrl: this.form.controls.websiteUrl.value,
			tagIds: this.form.controls.tagIds.value?.map((tag) => tag.id),
			translations: filteredTranslations,
			status,
		};

		const obs =
			this.isEdit() && this.projectId
				? this.projectService.update(this.projectId, payload)
				: this.projectService.create(payload);

		obs.subscribe({
			next: (res) => {
				this.saving.set(false);
				this.slug.set(res.slug);
				this.slugPreview.set(res.slug);
				this.currentStatus.set(res.status);
				this.toastService.open(this.isEdit() ? 'Project updated successfully' : 'Project created successfully', {
					appearance: 'success',
					autoClose: 3000,
					data: '@tui.check',
				}).subscribe();
				if (!this.isEdit()) {
					setTimeout(() => this.router.navigate(['/dashboard/project', res.id]), 800);
				}
			},
			error: (err) => {
				this.saving.set(false);
				const msg = err?.error?.details
					? JSON.stringify(err.error.details)
					: 'Save failed — check validation/permissions';
				this.error.set(msg);
				this.toastService.open('Failed to save project. Please try again.', {
					appearance: 'error',
					autoClose: 5000,
					data: '@tui.circle-x',
				}).subscribe();
			},
		});
	}

	onSave(): void {
		/* handled by save buttons */
	}

	goBack(): void {
		this.router.navigate(['/dashboard/project']);
	}
}
