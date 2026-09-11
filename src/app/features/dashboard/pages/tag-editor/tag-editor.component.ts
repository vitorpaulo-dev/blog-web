import { Component, inject, signal, OnInit, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TuiButton, TuiTextfield, TuiInput } from '@taiga-ui/core';
import { TuiToastService } from '@taiga-ui/kit';
import { HugeiconsIconComponent } from '@hugeicons/angular';
import {
	ArrowLeft01Icon,
	Edit01Icon,
	SaveIcon,
	Tag01Icon,
} from '@hugeicons/core-free-icons';
import type { Language } from '../../../posts/data-access/post.service';
import { TagService } from '../../../tags/data-access/tag.service';

interface TranslationForm {
	name: FormControl<string>;
}

@Component({
	selector: 'app-tag-editor',
	standalone: true,
	imports: [
		CommonModule,
		ReactiveFormsModule,
		TuiButton,
		TuiTextfield,
		TuiInput,
		HugeiconsIconComponent,
	],
	template: `
		<div class="mx-auto max-w-3xl px-6 py-8">
			<div class="flex items-center justify-between mb-6">
				<a (click)="goBack()" class="inline-flex items-center gap-1 text-sm text-accent cursor-pointer">
					<hugeicons-icon [icon]="ArrowLeft01Icon" [size]="16" [strokeWidth]="1.5" /> Back to dashboard
				</a>
			</div>

			<h1 class="text-2xl font-bold mb-2">{{ isEdit() ? 'Edit Tag' : 'New Tag' }}</h1>

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
									<hugeicons-icon [icon]="tagIcon" [size]="16" [strokeWidth]="2.5" class="flex-shrink-0" />
									<span>Name *</span>
								</label>
								<input tuiInput [formControl]="translationForms()[lang].name" placeholder="Tag name" />
							</tui-textfield>
						</div>
					}
				}

				@if (error()) {
					<p class="text-sm text-red-400" role="alert">{{ error() }}</p>
				}

				<div class="flex flex-wrap gap-3">
					<button
						tuiButton
						tuiAppearance="primary"
						type="button"
						(click)="save()"
						[disabled]="!isFormValid() || saving()"
						class="gap-1"
					>
						<hugeicons-icon [icon]="saveIcon" [size]="16" [strokeWidth]="2.5" />
						Save
					</button>
				</div>
			</form>
		</div>
	`,
})
export class TagEditorComponent implements OnInit {
	private readonly route = inject(ActivatedRoute);
	private readonly router = inject(Router);
	private readonly tagService = inject(TagService);
	private readonly platformId = inject(PLATFORM_ID);
	private readonly toastService = inject(TuiToastService);

	readonly isBrowser = isPlatformBrowser(this.platformId);
	readonly ArrowLeft01Icon = ArrowLeft01Icon;
	readonly tagIcon = Tag01Icon;
	readonly saveIcon = SaveIcon;

	readonly languages: Language[] = ['ENGLISH', 'PORTUGUESE'];

	form = new FormGroup({});

	translationForms = signal<Record<Language, TranslationForm>>({
		ENGLISH: {
			name: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(255)] }),
		},
		PORTUGUESE: {
			name: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(255)] }),
		},
	});

	activeLang = signal<Language>('ENGLISH');
	isEdit = signal(false);
	saving = signal(false);
	error = signal<string | null>(null);
	private tagId: string | null = null;

	ngOnInit(): void {
		if (!this.isBrowser) return;

		const id = this.route.snapshot.paramMap.get('id');
		if (id) {
			this.isEdit.set(true);
			this.tagId = id;
			this.tagService.getById(id).subscribe({
				next: (tag) => {
					const forms = this.translationForms();
					for (const lang of this.languages) {
						const translation = tag.translations?.[lang];
						if (translation) {
							forms[lang].name.setValue(translation.name || '');
						}
					}
				},
				error: () => {
					this.toastService.open('Failed to load tag. Redirecting to dashboard...', {
						appearance: 'error',
						autoClose: 5000,
						data: '@tui.circle-x',
					}).subscribe();
					void this.router.navigate(['/dashboard/tag']);
				},
			});
		}
	}

	isFormValid(): boolean {
		const forms = this.translationForms();
		return forms['ENGLISH'].name.valid;
	}

	save(): void {
		if (!this.isFormValid()) return;
		this.saving.set(true);
		this.error.set(null);

		const forms = this.translationForms();
		const translations: Record<Language, { name: string }> = {
			ENGLISH: { name: forms.ENGLISH.name.value },
			PORTUGUESE: { name: forms.PORTUGUESE.name.value },
		};

		const filteredTranslations = {} as Record<Language, { name: string }>;
		for (const lang of this.languages) {
			if (translations[lang].name) {
				filteredTranslations[lang] = translations[lang];
			}
		}

		const payload = { translations: filteredTranslations };

		const obs =
			this.isEdit() && this.tagId
				? this.tagService.update(this.tagId, payload)
				: this.tagService.create(payload);

		obs.subscribe({
			next: () => {
				this.saving.set(false);
				this.toastService.open(this.isEdit() ? 'Tag updated successfully' : 'Tag created successfully', {
					appearance: 'success',
					autoClose: 3000,
					data: '@tui.check',
				}).subscribe();
				if (!this.isEdit()) {
					setTimeout(() => this.router.navigate(['/dashboard/tag']), 800);
				}
			},
			error: (err) => {
				this.saving.set(false);
				const msg = err?.error?.details
					? JSON.stringify(err.error.details)
					: 'Save failed — check validation/permissions';
				this.error.set(msg);
				this.toastService.open('Failed to save tag. Please try again.', {
					appearance: 'error',
					autoClose: 5000,
					data: '@tui.circle-x',
				}).subscribe();
			},
		});
	}

	onSave(): void {
		/* handled by save button */
	}

	goBack(): void {
		this.router.navigate(['/dashboard/tag']);
	}
}
