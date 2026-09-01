import { Component, inject, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TuiButton, TuiTextfield } from '@taiga-ui/core';
import { TuiPagination } from '@taiga-ui/kit';
import { HugeiconsIconComponent } from '@hugeicons/angular';
import { Search01Icon, Calendar01Icon, Clock01Icon, Tag01Icon } from '@hugeicons/core-free-icons';
import { PostService, PostDto } from '../../data-access/post.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-post-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, TuiButton, TuiTextfield, TuiPagination, HugeiconsIconComponent],
  template: `
    <div class="mx-auto max-w-5xl px-6 py-8">
      <div class="flex flex-col gap-4 mb-6">
        <h1 class="text-3xl font-bold tracking-tight">Posts</h1>
        <div class="flex gap-3">
          <tui-textfield class="flex-1">
            <label tuiLabel>Search posts</label>
            <input tuiTextfield [(ngModel)]="query" (ngModelChange)="onSearch()" placeholder="Search by title or content" />
          </tui-textfield>
          <button tuiButton appearance="primary" (click)="onSearch()">
            <hugeicons-icon [icon]="Search01Icon" [size]="18" [strokeWidth]="2.5" />
            Search
          </button>
        </div>
      </div>

      @if (loading()) {
        <p class="text-muted text-sm">Loading posts...</p>
      } @else if (error()) {
        <p class="text-red-400 text-sm" role="alert">{{ error() }}</p>
      } @else if (posts().length === 0) {
        <div class="rounded-xl border border-border bg-surface p-8 text-center">
          <p class="text-muted">No posts found.</p>
        </div>
      } @else {
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          @for (post of posts(); track post.id) {
            <article class="rounded-xl border border-border bg-surface overflow-hidden flex flex-col hover:border-accent/30 transition-colors">
              @if (post.bannerUrl) {
                <img [src]="post.bannerUrl" [alt]="post.title" class="aspect-video object-cover border-b border-border" />
              } @else {
                <div class="aspect-video bg-background border-b border-border flex items-center justify-center text-muted text-sm">banner</div>
              }
              <div class="p-5 flex flex-col gap-3 flex-1">
                <div class="flex items-center gap-2 text-xs text-muted">
                  <hugeicons-icon [icon]="Calendar01Icon" [size]="14" [strokeWidth]="2.5" />
                  <span>{{ post.createdAt | date:'mediumDate' }}</span>
                  <span aria-hidden="true">·</span>
                  <span class="inline-flex items-center gap-1"><hugeicons-icon [icon]="Clock01Icon" [size]="14" [strokeWidth]="2.5" /> {{ post.estimatedReadingTimeMinutes || 5 }} min</span>
                </div>
                <h3 class="text-lg font-semibold leading-tight">
                  <a [routerLink]="['/post', post.slug]" class="hover:text-accent transition-colors">{{ post.title }}</a>
                </h3>
                <p class="text-sm text-muted line-clamp-2">{{ post.content | slice:0:150 }}</p>
                <div class="mt-auto flex flex-wrap gap-1.5 pt-2">
                  @for (tag of post.tags; track tag.id) {
                    <span class="inline-flex items-center gap-1 rounded-full bg-background border border-border px-2.5 py-1 text-xs text-muted"><hugeicons-icon [icon]="Tag01Icon" [size]="12" [strokeWidth]="2.5" /> {{ tag.name }}</span>
                  }
                </div>
                <div class="flex items-center gap-2 text-xs text-muted pt-2">
                  <span>{{ post.viewCount }} views</span>
                  <span>·</span>
                  <span>{{ post.status }}</span>
                </div>
              </div>
            </article>
          }
        </div>
        <div class="mt-6 flex justify-center">
          <tui-pagination [index]="page()" [length]="totalPages()" (indexChange)="onPage($event)" />
        </div>
      }
    </div>
  `,
})
export class PostListComponent implements OnInit {
  private readonly postService = inject(PostService);

  readonly Search01Icon = Search01Icon;
  readonly Calendar01Icon = Calendar01Icon;
  readonly Clock01Icon = Clock01Icon;
  readonly Tag01Icon = Tag01Icon;

  query = '';
  posts = signal<PostDto[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);
  page = signal(0);
  totalPages = signal(1);
  totalElements = signal(0);

  private debounceTimer: ReturnType<typeof setTimeout> | null = null;

  ngOnInit(): void {
    this.load();
  }

  onSearch(): void {
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => {
      this.page.set(0);
      this.load();
    }, 300);
  }

  onPage(index: number): void {
    this.page.set(index);
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.postService.search({ query: this.query || undefined, page: this.page(), limit: 6, sort: 'createdAt' }).subscribe({
      next: res => {
        this.posts.set(res.content);
        this.totalPages.set(res.totalPages || 1);
        this.totalElements.set(res.totalElements);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Failed to load posts');
        this.loading.set(false);
      },
    });
  }
}
