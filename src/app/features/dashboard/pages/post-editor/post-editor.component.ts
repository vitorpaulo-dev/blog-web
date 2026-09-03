import { Component, inject, signal, OnInit, PLATFORM_ID, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { TuiButton, TuiTextfield, TuiDropdown, TuiDataList, TuiInput } from '@taiga-ui/core';
import { TuiChip, TuiInputChip, TuiMultiSelect, TuiChevron, TuiDataListWrapper, TuiComboBox } from '@taiga-ui/kit';
import { HugeiconsIconComponent } from '@hugeicons/angular';
import { 
  ArrowLeft01Icon, 
  Layers01Icon, 
  Edit01Icon,
  Image01Icon,
  File01Icon,
  Tag01Icon,
  Globe02Icon,
  Download01Icon,
  Upload01Icon
} from '@hugeicons/core-free-icons';
import { PostService } from '../../../posts/data-access/post.service';

interface ProjectOption {
  id: string;
  title: string;
}

interface TagOption {
  id: string;
  name: string;
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
			<a (click)="goBack()" class="inline-flex items-center gap-1 text-sm text-accent cursor-pointer mb-6">
				<hugeicons-icon [icon]="ArrowLeft01Icon" [size]="16" [strokeWidth]="1.5" /> Back to dashboard
			</a>

			<h1 class="text-2xl font-bold mb-2">{{ isEdit() ? 'Edit Post' : 'New Post' }}</h1>
			@if (slug()) {
				<p class="text-xs text-muted mb-4">
					Slug (read-only): <span class="font-mono">{{ slug() }}</span>
				</p>
			}

			<form [formGroup]="form" class="flex flex-col gap-5" (ngSubmit)="onSave()">
				<tui-textfield>
					<label tuiLabel class="flex items-center gap-1.5">
						<hugeicons-icon [icon]="titleIcon" [size]="16" [strokeWidth]="2.5" class="flex-shrink-0" />
						<span>Title *</span>
					</label>
					<input tuiInput formControlName="title" placeholder="Post title" />
				</tui-textfield>

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

				<div class="flex flex-col gap-2">
					<label class="text-sm font-medium flex items-center gap-1.5">
						<hugeicons-icon [icon]="contentIcon" [size]="16" [strokeWidth]="2.5" class="flex-shrink-0" />
						<span>Content *</span>
					</label>
					@if (isBrowser) {
						<div #milkdown class="min-h-[320px] rounded-xl border border-border bg-surface p-3"></div>
					} @else {
						<textarea
							formControlName="content"
							rows="16"
							class="w-full rounded-xl border border-border bg-surface p-3 text-sm font-mono"
							placeholder="Write markdown..."
						></textarea>
					}
				</div>

				<tui-textfield tuiChevron>
					<label tuiLabel class="flex items-center gap-1.5">
						<hugeicons-icon [icon]="languageIcon" [size]="16" [strokeWidth]="2.5" class="flex-shrink-0" />
						<span>Language</span>
					</label>
					<input tuiComboBox formControlName="language" placeholder="Select language" />
					<tui-data-list *tuiDropdown>
						<button tuiOption value="English">
							<span class="flex items-center gap-2">
								<span class="text-lg">🇺🇸</span>
								<span>English</span>
							</span>
						</button>
						<button tuiOption value="pt">
							<span class="flex items-center gap-2">
								<span class="text-lg">🇧🇷</span>
								<span>Portuguese</span>
							</span>
						</button>
					</tui-data-list>
				</tui-textfield>

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
							[disabled]="form.invalid || saving()"
							class="gap-1"
						>
							<hugeicons-icon [icon]="saveDraftIcon" [size]="16" [strokeWidth]="2.5" />
							Save Draft
						</button>
						<button
							tuiButton
							appearance="primary"
							type="button"
							(click)="save('PUBLISHED')"
							[disabled]="form.invalid || saving()"
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
							[disabled]="form.invalid || saving()"
							class="gap-1"
						>
							<hugeicons-icon [icon]="saveDraftIcon" [size]="16" [strokeWidth]="2.5" />
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
								<hugeicons-icon [icon]="saveDraftIcon" [size]="16" [strokeWidth]="2.5" />
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
export class PostEditorComponent implements OnInit, AfterViewInit {
	private readonly route = inject(ActivatedRoute);
	private readonly router = inject(Router);
	private readonly postService = inject(PostService);
	private readonly platformId = inject(PLATFORM_ID);

	readonly isBrowser = isPlatformBrowser(this.platformId);
	readonly ArrowLeft01Icon = ArrowLeft01Icon;
	readonly titleIcon = Edit01Icon;
	readonly bannerIcon = Image01Icon;
	readonly contentIcon = File01Icon;
	readonly tagsIcon = Tag01Icon;
	readonly projectsIcon = Layers01Icon;
	readonly languageIcon = Globe02Icon;
	readonly saveDraftIcon = Download01Icon;
	readonly publishIcon = Upload01Icon;

	form = new FormGroup({
		title: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(500)] }),
		bannerUrl: new FormControl('', { nonNullable: true }),
		content: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
		language: new FormControl('pt', { nonNullable: true }),
		tags: new FormControl<TagOption[]>([], { nonNullable: true }),
		projects: new FormControl<ProjectOption[]>([], { nonNullable: true }),
	});

	slug = signal<string | null>(null);
	currentStatus = signal<string>('DRAFT');
	isEdit = signal(false);
	saving = signal(false);
	error = signal<string | null>(null);
	success = signal<string | null>(null);
	private postId: string | null = null;

	// Placeholder tag list; replace with real endpoint when available
	availableTags: TagOption[] = [
		{ id: 'tag-1', name: 'Angular' },
		{ id: 'tag-2', name: 'TypeScript' },
		{ id: 'tag-3', name: 'Spring Boot' },
	];

	// Placeholder project list; replace with real endpoint when available (Q5 deferred)
	availableProjects = signal<ProjectOption[]>([
		{ id: '00000000-0000-0000-0000-000000000001', title: 'Demo Project Alpha' },
		{ id: '00000000-0000-0000-0000-000000000002', title: 'Demo Project Beta' },
		{ id: '00000000-0000-0000-0000-000000000003', title: 'Infrastructure' },
	]);

	@ViewChild('milkdown') milkdownRef?: ElementRef<HTMLDivElement>;
	private milkdownEditor: any = null;

	ngOnInit(): void {
		const id = this.route.snapshot.paramMap.get('id');
		if (id) {
			this.isEdit.set(true);
			this.postId = id;
			this.postService.getById(id).subscribe({
				next: (p) => {
					this.form.patchValue({
						title: p.title,
						bannerUrl: p.bannerUrl || '',
						content: p.content,
						language: p.language || 'en',
					});
					// Map tags from post to TagOption objects
					const tags = p.tags.map((t) => ({ id: t.id, name: t.name || t.id }));
					this.form.patchValue({ tags });
					// Map projects from post to ProjectOption objects
					const projects = p.projects.map((pr) => ({ id: pr.id, title: pr.title || pr.id }));
					this.form.patchValue({ projects });
					this.slug.set(p.slug);
					this.currentStatus.set(p.status);
				},
				error: () => this.error.set('Failed to load post'),
			});
		}
	}

	ngAfterViewInit(): void {
		if (this.isBrowser) this.initMilkdown();
	}

	private async initMilkdown(): Promise<void> {
		if (!isPlatformBrowser(this.platformId) || !this.milkdownRef) return;
		try {
			const { Editor, rootCtx, defaultValueCtx } = await import('@milkdown/kit/core');
			const { listener, listenerCtx } = await import('@milkdown/kit/plugin/listener');
			const { commonmark } = await import('@milkdown/kit/preset/commonmark');
			const { nord } = await import('@milkdown/theme-nord');

			const el = this.milkdownRef.nativeElement;
			const initialContent = this.form.controls.content.value;

			this.milkdownEditor = await Editor.make()
				.config((ctx) => {
					ctx.set(rootCtx, el);
					ctx.set(defaultValueCtx, initialContent);
					nord(ctx);
					ctx.get(listenerCtx).markdownUpdated((_ctx, markdown) => {
						this.form.controls.content.setValue(markdown);
					});
				})
				.use(commonmark)
				.use(listener)
				.create();
		} catch (e) {
			console.warn('Milkdown failed to load', e);
		}
	}

  stringifyTag = (tag: TagOption): string => tag.name;
  stringifyProject = (project: ProjectOption): string => project.title;

  onBannerFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      this.form.controls.bannerUrl.setValue(reader.result as string);
    };
    reader.readAsDataURL(file);
  }

  save(status: string): void {
		if (this.form.invalid) return;
		this.saving.set(true);
		this.error.set(null);
		this.success.set(null);

		const content = this.form.controls.content.value;
		const tags = this.form.controls.tags.value;
		const projects = this.form.controls.projects.value;
		const tagIds = tags.map((t) => t.id);
		const projectIds = projects.map((p) => p.id);

		const payload = {
			title: this.form.controls.title.value,
			bannerUrl: this.form.controls.bannerUrl.value || undefined,
			content,
			language: this.form.controls.language.value || undefined,
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
			},
		});
	}

	onSave(): void {
		/* handled by save buttons */
	}

	goBack(): void {
		this.router.navigate(['/dashboard/post']);
	}
}
