import { Component, inject, signal, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { TuiButton, TuiTextfield } from '@taiga-ui/core';
import { TuiPagination } from '@taiga-ui/kit';
import { HugeiconsIconComponent } from '@hugeicons/angular';
import { Search01Icon, PlusSignIcon, Edit01Icon, Delete01Icon, Calendar01Icon } from '@hugeicons/core-free-icons';
import { PostService, PostDto } from '../../../posts/data-access/post.service';

@Component({
  selector: 'app-dashboard-post-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, TuiButton, TuiTextfield, TuiPagination, HugeiconsIconComponent],
  template: `
    <div class="mx-auto max-w-5xl px-6 py-8">
      <div class="flex flex-wrap items-center justify-between gap-4 mb-6">
        <h1 class="text-2xl font-bold">Dashboard — Posts</h1>
        <a routerLink="/dashboard/post/new" tuiButton appearance="primary" size="m" class="gap-1">
          <hugeicons-icon [icon]="PlusSignIcon" [size]="18" [strokeWidth]="2.5" /> New Post
        </a>
      </div>

      <div class="flex flex-col md:flex-row gap-3 mb-6">
        <tui-textfield class="flex-1">
          <label tuiLabel>Search</label>
          <input tuiTextfield [(ngModel)]="query" (ngModelChange)="onSearch()" placeholder="Search posts" />
        </tui-textfield>
        <button tuiButton appearance="outline" (click)="onSearch()"><hugeicons-icon [icon]="Search01Icon" [size]="16" [strokeWidth]="2.5" /> Search</button>
        @if (selected().size > 0) {
          <button tuiButton appearance="accent" (click)="massDelete()" class="gap-1"><hugeicons-icon [icon]="Delete01Icon" [size]="16" [strokeWidth]="2.5" /> Delete ({{ selected().size }})</button>
        }
      </div>

      @if (loading()) {
        <p class="text-muted text-sm">Loading...</p>
      } @else if (error()) {
        <p class="text-red-400 text-sm">{{ error() }}</p>
      } @else if (posts().length === 0) {
        <div class="rounded-xl border border-border bg-surface p-8 text-center text-muted">No posts yet. Create your first post.</div>
      } @else {
        <div class="rounded-xl border border-border overflow-hidden">
          <div class="divide-y divide-border">
            @for (post of posts(); track post.id) {
              <div class="flex items-center gap-3 p-4 bg-surface hover:bg-background transition-colors">
                <input type="checkbox" [checked]="selected().has(post.id)" (change)="toggle(post.id)" class="accent-accent" />
                <div class="flex-1 min-w-0">
                  <p class="font-medium truncate">{{ post.title }}</p>
                  <div class="flex flex-wrap gap-2 text-xs text-muted mt-1">
                    <span class="inline-flex items-center gap-1"><hugeicons-icon [icon]="Calendar01Icon" [size]="12" [strokeWidth]="2.5" /> {{ post.createdAt | date:'shortDate' }}</span>
                    <span class="rounded-full border px-2 py-0.5 text-xs" [class.bg-green-500/20]="post.status==='PUBLISHED'" [class.bg-yellow-500/20]="post.status==='DRAFT'">{{ post.status }}</span>
                    <span>{{ post.viewCount }} views</span>
                    @for (author of post.authors; track author.id) { <span>{{ author.name }}</span> }
                    @for (tag of post.tags; track tag.id) { <span>#{{ tag.name }}</span> }
                  </div>
                </div>
                <div class="flex items-center gap-2 shrink-0">
                  <a [routerLink]="['/dashboard/post', post.id]" tuiButton appearance="outline" size="s"><hugeicons-icon [icon]="Edit01Icon" [size]="16" [strokeWidth]="2.5" /></a>
                  <button tuiButton appearance="accent" size="s" (click)="askDeleteOne(post.id)"><hugeicons-icon [icon]="Delete01Icon" [size]="16" [strokeWidth]="2.5" /></button>
                </div>
              </div>
            }
          </div>
        </div>
        <div class="mt-6 flex justify-center">
          <tui-pagination [index]="page()" [length]="totalPages()" (indexChange)="onPage($event)" />
        </div>
      }
    </div>

    @if (showDeleteDialog()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" (click)="showDeleteDialog.set(false)">
        <div class="bg-surface border border-border rounded-xl p-6 w-full max-w-md flex flex-col gap-4" (click)="$event.stopPropagation()">
          <h2 class="text-lg font-semibold">Delete post?</h2>
          <p class="text-sm text-muted">This action cannot be undone.</p>
          <div class="flex gap-3 justify-end">
            <button tuiButton appearance="outline" size="m" (click)="showDeleteDialog.set(false)">Cancel</button>
            <button tuiButton appearance="accent" size="m" (click)="confirmDeleteOne()">Delete</button>
          </div>
        </div>
      </div>
    }
    @if (showMassDeleteDialog()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" (click)="showMassDeleteDialog.set(false)">
        <div class="bg-surface border border-border rounded-xl p-6 w-full max-w-md flex flex-col gap-4" (click)="$event.stopPropagation()">
          <h2 class="text-lg font-semibold">Delete {{ pendingMassIds().length }} posts?</h2>
          <p class="text-sm text-muted">This is atomic — if any fails, none are deleted.</p>
          <div class="flex gap-3 justify-end">
            <button tuiButton appearance="outline" size="m" (click)="showMassDeleteDialog.set(false)">Cancel</button>
            <button tuiButton appearance="accent" size="m" (click)="confirmMassDelete()">Delete</button>
          </div>
        </div>
      </div>
    }
  `,
})
export class DashboardPostListComponent implements OnInit {
  private readonly postService = inject(PostService);

  readonly Search01Icon = Search01Icon;
  readonly PlusSignIcon = PlusSignIcon;
  readonly Edit01Icon = Edit01Icon;
  readonly Delete01Icon = Delete01Icon;
  readonly Calendar01Icon = Calendar01Icon;

  query = '';
  posts = signal<PostDto[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);
  page = signal(0);
  totalPages = signal(1);
  selected = signal<Set<string>>(new Set<string>());

  showDeleteDialog = signal(false);
  pendingDeleteId = signal<string | null>(null);
  showMassDeleteDialog = signal(false);
  pendingMassIds = signal<string[]>([]);

  private debounce: ReturnType<typeof setTimeout> | null = null;

  ngOnInit(): void { this.load(); }

  onSearch(): void {
    if (this.debounce) clearTimeout(this.debounce);
    this.debounce = setTimeout(() => { this.page.set(0); this.load(); }, 300);
  }

  onPage(i: number): void { this.page.set(i); this.load(); }

  toggle(id: string): void {
    const s = new Set(this.selected());
    if (s.has(id)) s.delete(id); else s.add(id);
    this.selected.set(s);
  }

  askDeleteOne(id: string): void {
    this.pendingDeleteId.set(id);
    this.showDeleteDialog.set(true);
  }

  confirmDeleteOne(): void {
    const id = this.pendingDeleteId();
    if (!id) return;
    this.showDeleteDialog.set(false);
    this.postService.delete([id]).subscribe({
      next: () => this.load(),
      error: () => alert('Delete failed — check permissions'),
    });
  }

  massDelete(): void {
    const ids = Array.from(this.selected());
    if (!ids.length) return;
    this.pendingMassIds.set(ids);
    this.showMassDeleteDialog.set(true);
  }

  confirmMassDelete(): void {
    const ids = this.pendingMassIds();
    this.showMassDeleteDialog.set(false);
    this.postService.delete(ids).subscribe({
      next: () => { this.selected.set(new Set()); this.load(); },
      error: () => alert('Mass delete failed — ensure you own all selected posts or are admin'),
    });
  }

  private load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.postService.search({ query: this.query || undefined, page: this.page(), limit: 10, sort: 'createdAt' }).subscribe({
      next: r => { this.posts.set(r.content); this.totalPages.set(r.totalPages || 1); this.loading.set(false); },
      error: () => { this.error.set('Failed to load'); this.loading.set(false); },
    });
  }
}
