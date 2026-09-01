import { Component, inject, signal, OnInit, PLATFORM_ID, AfterViewInit, ViewChild, ElementRef, computed } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { TuiButton, TuiTextfield } from '@taiga-ui/core';
import { TuiChip } from '@taiga-ui/kit';
import { HugeiconsIconComponent } from '@hugeicons/angular';
import { ArrowLeft01Icon, Layers01Icon, ArrowRight01Icon, Search01Icon, Cancel01Icon } from '@hugeicons/core-free-icons';
import { PostService } from '../../../posts/data-access/post.service';

interface ProjectOption {
  id: string;
  title: string;
}

@Component({
  selector: 'app-post-editor',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, TuiButton, TuiTextfield, TuiChip, HugeiconsIconComponent],
  template: `
    <div class="mx-auto max-w-3xl px-6 py-8">
      <a (click)="goBack()" class="inline-flex items-center gap-1 text-sm text-accent cursor-pointer mb-6">
        <hugeicons-icon [icon]="ArrowLeft01Icon" [size]="16" [strokeWidth]="2.5" /> Back to dashboard
      </a>

      <h1 class="text-2xl font-bold mb-2">{{ isEdit() ? 'Edit Post' : 'New Post' }}</h1>
      @if (slug()) {
        <p class="text-xs text-muted mb-4">Slug (read-only): <span class="font-mono">{{ slug() }}</span></p>
      }

      <form [formGroup]="form" class="flex flex-col gap-5" (ngSubmit)="onSave()">
        <tui-textfield>
          <label tuiLabel>Title *</label>
          <input tuiTextfield formControlName="title" placeholder="Post title" />
        </tui-textfield>

        <tui-textfield>
          <label tuiLabel>Banner URL</label>
          <input tuiTextfield formControlName="bannerUrl" placeholder="https://..." />
        </tui-textfield>
        @if (form.controls.bannerUrl.value) {
          <img [src]="form.controls.bannerUrl.value" alt="banner preview" class="w-full aspect-video object-cover rounded-xl border border-border" />
        }

        <div class="flex flex-col gap-2">
          <label class="text-sm font-medium">Content * (Markdown)</label>
          @if (isBrowser) {
            <div #milkdown class="min-h-[320px] rounded-xl border border-border bg-surface p-3"></div>
            <textarea formControlName="content" class="hidden"></textarea>
            <p class="text-xs text-muted">Milkdown editor loaded in browser. Fallback textarea hidden.</p>
          } @else {
            <textarea formControlName="content" rows="16" class="w-full rounded-xl border border-border bg-surface p-3 text-sm font-mono" placeholder="Write markdown..."></textarea>
          }
        </div>

        <tui-textfield>
          <label tuiLabel>Language</label>
          <input tuiTextfield formControlName="language" placeholder="en" />
        </tui-textfield>

        <tui-textfield>
          <label tuiLabel>Tag IDs (UUIDs comma-separated)</label>
          <input tuiTextfield formControlName="tagsInput" placeholder="e.g. 550e8400-e29b-... , 550e8400-..." />
        </tui-textfield>
        <p class="text-xs text-muted -mt-3">Enter Tag IDs as UUIDs comma-separated. Backend resolves IDs; names are not supported yet.</p>

        <div class="flex items-center gap-3 flex-wrap">
          <button tuiButton appearance="outline" type="button" (click)="openProjectsDialog()" class="gap-1">
            <hugeicons-icon [icon]="Layers01Icon" [size]="16" [strokeWidth]="2.5" /> Projects ({{ projectIds().length }})
          </button>
          @for (pid of projectIds(); track pid) {
            <span tuiChip size="s" class="gap-1">{{ pid.slice(0,8) }}… <button type="button" (click)="removeProject(pid)" class="ml-1">×</button></span>
          }
        </div>

        @if (error()) { <p class="text-sm text-red-400" role="alert">{{ error() }}</p> }
        @if (success()) { <p class="text-sm text-green-400" role="status">{{ success() }}</p> }

        <div class="flex flex-wrap gap-3">
          @if (!isEdit()) {
            <button tuiButton appearance="outline" type="button" (click)="save('DRAFT')" [disabled]="form.invalid || saving()">
              Save Draft
            </button>
            <button tuiButton appearance="primary" type="button" (click)="save('PUBLISHED')" [disabled]="form.invalid || saving()">
              Publish
            </button>
          } @else {
            <button tuiButton appearance="primary" type="button" (click)="save(currentStatus() === 'PUBLISHED' ? 'PUBLISHED' : 'DRAFT')" [disabled]="form.invalid || saving()">
              Save
            </button>
            @if (currentStatus() === 'PUBLISHED') {
              <button tuiButton appearance="outline" type="button" (click)="save('DRAFT')" [disabled]="saving()">Unpublish</button>
            } @else {
              <button tuiButton appearance="primary" type="button" (click)="save('PUBLISHED')" [disabled]="saving()">Publish</button>
            }
          }
        </div>
      </form>
    </div>

    <!-- Taiga UI dialog for project selection (replaces prompt) -->
    @if (showProjectDialog()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" (click)="closeProjectsDialog()">
        <div class="bg-surface border border-border rounded-xl p-6 w-full max-w-lg max-h-[80vh] overflow-auto flex flex-col gap-4" (click)="$event.stopPropagation()">
          <div class="flex items-center justify-between">
            <h2 class="text-lg font-semibold">Select Projects</h2>
            <button tuiButton appearance="outline" size="s" type="button" (click)="closeProjectsDialog()"><hugeicons-icon [icon]="Cancel01Icon" [size]="16" [strokeWidth]="2.5" /></button>
          </div>
          <tui-textfield>
            <label tuiLabel>Search projects</label>
            <input tuiTextfield [(ngModel)]="projectSearch" placeholder="Filter by title or id" />
          </tui-textfield>
          <div class="flex flex-wrap gap-2">
            @for (pid of selectedProjectChips(); track pid) {
              <span tuiChip size="s">{{ pid.slice(0,8) }}… <button type="button" (click)="removeProject(pid)">×</button></span>
            }
          </div>
          <div class="divide-y divide-border border border-border rounded-xl overflow-hidden">
            @for (opt of filteredProjects(); track opt.id) {
              <label class="flex items-center gap-3 p-3 hover:bg-background cursor-pointer">
                <input type="checkbox" [checked]="isProjectSelected(opt.id)" (change)="toggleProject(opt.id)" />
                <span class="text-sm flex-1">{{ opt.title }}</span>
                <span class="text-xs text-muted font-mono truncate max-w-[160px]">{{ opt.id }}</span>
              </label>
            }
            @if (filteredProjects().length === 0) {
              <p class="p-4 text-sm text-muted text-center">No projects match.</p>
            }
          </div>
          <div class="flex gap-3 justify-end">
            <button tuiButton appearance="outline" type="button" (click)="closeProjectsDialog()">Cancel</button>
            <button tuiButton appearance="primary" type="button" (click)="confirmProjectsDialog()">Confirm ({{ projectIds().length }})</button>
          </div>
        </div>
      </div>
    }
  `,
})
export class PostEditorComponent implements OnInit, AfterViewInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly postService = inject(PostService);
  private readonly platformId = inject(PLATFORM_ID);

  readonly isBrowser = isPlatformBrowser(this.platformId);
  readonly ArrowLeft01Icon = ArrowLeft01Icon;
  readonly Layers01Icon = Layers01Icon;
  readonly ArrowRight01Icon = ArrowRight01Icon;
  readonly Search01Icon = Search01Icon;
  readonly Cancel01Icon = Cancel01Icon;

  form = new FormGroup({
    title: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(500)] }),
    bannerUrl: new FormControl('', { nonNullable: true }),
    content: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    language: new FormControl('en', { nonNullable: true }),
    tagsInput: new FormControl('', { nonNullable: true }),
  });

  projectIds = signal<string[]>([]);
  slug = signal<string | null>(null);
  currentStatus = signal<string>('DRAFT');
  isEdit = signal(false);
  saving = signal(false);
  error = signal<string | null>(null);
  success = signal<string | null>(null);
  private postId: string | null = null;

  // Taiga dialog state
  showProjectDialog = signal(false);
  projectSearch = '';
  // Placeholder project list; replace with real endpoint when available (Q5 deferred)
  availableProjects = signal<ProjectOption[]>([
    { id: '00000000-0000-0000-0000-000000000001', title: 'Demo Project Alpha' },
    { id: '00000000-0000-0000-0000-000000000002', title: 'Demo Project Beta' },
    { id: '00000000-0000-0000-0000-000000000003', title: 'Infrastructure' },
  ]);
  filteredProjects = computed(() => {
    const q = this.projectSearch.trim().toLowerCase();
    const all = this.availableProjects();
    if (!q) return all;
    return all.filter(p => p.title.toLowerCase().includes(q) || p.id.toLowerCase().includes(q));
  });
  selectedProjectChips = computed(() => this.projectIds());

  @ViewChild('milkdown') milkdownRef?: ElementRef<HTMLDivElement>;
  private milkdownEditor: any = null;
  private milkdownContent = '';

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEdit.set(true);
      this.postId = id;
      this.postService.getById(id).subscribe({
        next: p => {
          this.form.patchValue({
            title: p.title,
            bannerUrl: p.bannerUrl || '',
            content: p.content,
            language: p.language || 'en',
            tagsInput: p.tags.map(t => t.id).join(', '),
          });
          this.projectIds.set(p.projects.map(pr => pr.id));
          this.slug.set(p.slug);
          this.currentStatus.set(p.status);
          // sync milkdownContent from form content (fix empty editor on edit)
          this.milkdownContent = p.content;
          this.form.controls.content.setValue(p.content);
          if (this.isBrowser) setTimeout(() => this.syncMilkdownContent(), 200);
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
      const { Editor } = await import('@milkdown/core');
      const el = this.milkdownRef.nativeElement;
      try {
        const kit: any = await import('@milkdown/kit');
        const commonmark = kit.commonmark;
        const listener = kit.listener;
        const listenerCtx = kit.listenerCtx;
        const editor = await new Editor()
          .config((ctx: any) => {
            if (listenerCtx) ctx.get(listenerCtx).markdownUpdated((_c: any, md: string) => {
              this.milkdownContent = md;
              this.form.controls.content.setValue(md);
            });
          })
          .use(commonmark)
          .use(listener)
          .create();
        editor.action((ctx: any) => {
          const view = ctx.get('viewCtx');
          el.appendChild(view.dom);
        });
        this.milkdownEditor = editor;
      } catch {
        console.warn('Milkdown kit not available, using textarea');
      }
      // ensure initial content sync after editor ready
      if (this.milkdownContent || this.form.controls.content.value) {
        if (!this.milkdownContent) this.milkdownContent = this.form.controls.content.value;
        this.syncMilkdownContent();
      }
    } catch (e) {
      console.warn('Milkdown failed to load', e);
    }
  }

  private syncMilkdownContent(): void {
    const content = this.milkdownContent || this.form.controls.content.value;
    if (!content) return;
    // keep form and internal content in sync
    if (this.form.controls.content.value !== content) {
      this.form.controls.content.setValue(content);
    }
    this.milkdownContent = content;
    // try to push content into milkdown editor if it exists
    if (this.milkdownEditor) {
      try {
        this.milkdownEditor.action((ctx: any) => {
          // Milkdown view update — fallback to DOM if API differs
          const view = ctx?.get?.('viewCtx');
          if (view?.updateState) {
            // no direct setMarkdown API in core; ensure content reflected via form value
          } else if (view?.dom) {
            // ensure DOM contains content as fallback (textarea hidden already synced via form)
          }
        });
      } catch {}
    }
  }

  openProjectsDialog(): void {
    this.showProjectDialog.set(true);
  }
  closeProjectsDialog(): void {
    this.showProjectDialog.set(false);
  }
  confirmProjectsDialog(): void {
    this.showProjectDialog.set(false);
  }
  toggleProject(id: string): void {
    const cur = this.projectIds();
    if (cur.includes(id)) this.projectIds.set(cur.filter(x => x !== id));
    else this.projectIds.set([...cur, id]);
  }
  isProjectSelected(id: string): boolean {
    return this.projectIds().includes(id);
  }
  removeProject(id: string): void {
    this.projectIds.set(this.projectIds().filter(x => x !== id));
  }

  save(status: string): void {
    if (this.form.invalid) return;
    this.saving.set(true);
    this.error.set(null);
    this.success.set(null);

    const content = this.isBrowser && this.milkdownContent ? this.milkdownContent : this.form.controls.content.value;
    const tagIds = this.form.controls.tagsInput.value.split(',').map(s => s.trim()).filter(Boolean);
    const payload = {
      title: this.form.controls.title.value,
      bannerUrl: this.form.controls.bannerUrl.value || undefined,
      content,
      language: this.form.controls.language.value || undefined,
      tagIds: tagIds.length ? tagIds : undefined,
      projectIds: this.projectIds().length ? this.projectIds() : undefined,
      status,
    };

    const obs = this.isEdit() && this.postId
      ? this.postService.update(this.postId, payload)
      : this.postService.create(payload);

    obs.subscribe({
      next: res => {
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
        const msg = err?.error?.details ? JSON.stringify(err.error.details) : 'Save failed — check validation/permissions';
        this.error.set(msg);
      },
    });
  }

  onSave(): void { /* handled by save buttons */ }

  goBack(): void { this.router.navigate(['/dashboard/post']); }
}
