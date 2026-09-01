import { Component, inject, signal, OnInit, PLATFORM_ID, AfterViewInit, ElementRef, ViewChild } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import { PostService, PostDto } from '../../data-access/post.service';
import { HugeiconsIconComponent } from '@hugeicons/angular';
import { Calendar01Icon, Clock01Icon, EyeIcon, Tag01Icon, User02Icon, ArrowLeft01Icon } from '@hugeicons/core-free-icons';
import { TuiButton } from '@taiga-ui/core';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { GISCUS_CONFIG } from '../../../../config/giscus.config';

@Component({
  selector: 'app-post-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, TuiButton, HugeiconsIconComponent],
  template: `
    <div class="mx-auto max-w-3xl px-6 py-8">
      <a routerLink="/post" tuiButton appearance="outline" size="s" class="mb-6 gap-1">
        <hugeicons-icon [icon]="ArrowLeft01Icon" [size]="16" [strokeWidth]="2.5" /> Back to posts
      </a>

      @if (loading()) {
        <p class="text-muted">Loading...</p>
      } @else if (error()) {
        <p class="text-red-400" role="alert">{{ error() }}</p>
      } @else if (post(); as p) {
        @if (p.bannerUrl) {
          <img [src]="p.bannerUrl" [alt]="p.title" class="w-full aspect-video object-cover rounded-xl border border-border mb-6" />
        }
        <h1 class="text-3xl md:text-4xl font-bold tracking-tight leading-tight">{{ p.title }}</h1>
        <div class="mt-4 flex flex-wrap items-center gap-3 text-sm text-muted">
          <span class="inline-flex items-center gap-1"><hugeicons-icon [icon]="Calendar01Icon" [size]="16" [strokeWidth]="2.5" /> {{ p.createdAt | date:'mediumDate' }}</span>
          <span>·</span>
          <span class="inline-flex items-center gap-1"><hugeicons-icon [icon]="Clock01Icon" [size]="16" [strokeWidth]="2.5" /> {{ p.estimatedReadingTimeMinutes || 5 }} min</span>
          <span>·</span>
          <span class="inline-flex items-center gap-1"><hugeicons-icon [icon]="EyeIcon" [size]="16" [strokeWidth]="2.5" /> {{ p.viewCount }} views</span>
        </div>
        <div class="mt-3 flex flex-wrap gap-2">
          @for (author of p.authors; track author.id) {
            <span class="inline-flex items-center gap-1 rounded-full bg-surface border border-border px-3 py-1 text-xs"><hugeicons-icon [icon]="User02Icon" [size]="14" [strokeWidth]="2.5" /> {{ author.name }}</span>
          }
          @for (tag of p.tags; track tag.id) {
            <span class="rounded-full bg-background border border-border px-2.5 py-1 text-xs text-muted"><hugeicons-icon [icon]="Tag01Icon" [size]="12" [strokeWidth]="2.5" /> {{ tag.name }}</span>
          }
        </div>

        <article class="prose prose-invert max-w-none mt-8 break-words" [innerHTML]="html()"></article>

        <div class="mt-8 rounded-xl border border-border bg-surface p-4 flex flex-wrap gap-4 text-xs text-muted">
          <span>Views: {{ p.viewCount }}</span>
          <span>Reactions: {{ p.reactionCount || 0 }}</span>
          @if (p.averageReadingTimeSeconds) { <span>Avg read: {{ p.averageReadingTimeSeconds }}s</span> }
        </div>

        <div class="mt-8 border-t border-border pt-6">
          <h3 class="text-sm font-semibold mb-3">Comments</h3>
          @if (isBrowser) {
            <div #giscusContainer></div>
          } @else {
            <p class="text-xs text-muted">Comments load in browser.</p>
          }
        </div>
      }
    </div>
  `,
})
export class PostDetailComponent implements OnInit, AfterViewInit {
  private readonly route = inject(ActivatedRoute);
  private readonly postService = inject(PostService);
  private readonly platformId = inject(PLATFORM_ID);

  readonly isBrowser = isPlatformBrowser(this.platformId);
  readonly Calendar01Icon = Calendar01Icon;
  readonly Clock01Icon = Clock01Icon;
  readonly EyeIcon = EyeIcon;
  readonly Tag01Icon = Tag01Icon;
  readonly User02Icon = User02Icon;
  readonly ArrowLeft01Icon = ArrowLeft01Icon;

  post = signal<PostDto | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);
  html = signal('');

  @ViewChild('giscusContainer') giscusContainer?: ElementRef<HTMLDivElement>;

  ngOnInit(): void {
    const slug = this.route.snapshot.paramMap.get('slug');
    if (!slug) {
      this.error.set('Missing slug');
      this.loading.set(false);
      return;
    }
    this.postService.getBySlug(slug).subscribe({
      next: p => {
        this.post.set(p);
        this.loading.set(false);
        this.renderMarkdown(p.content);
      },
      error: () => {
        this.error.set('Post not found');
        this.loading.set(false);
      },
    });
  }

  ngAfterViewInit(): void {
    if (this.isBrowser) {
      this.loadGiscus();
    }
  }

  private renderMarkdown(content: string): void {
    const raw = marked.parse(content) as string;
    const clean = isPlatformBrowser(this.platformId) ? DOMPurify.sanitize(raw) : raw;
    this.html.set(clean);
  }

  private loadGiscus(): void {
    if (!isPlatformBrowser(this.platformId) || !this.giscusContainer) return;
    // Defer until container exists
    setTimeout(() => {
      const el = this.giscusContainer?.nativeElement;
      if (!el) return;
      const script = document.createElement('script');
      script.src = 'https://giscus.app/client.js';
      script.setAttribute('data-repo', GISCUS_CONFIG.repo);
      script.setAttribute('data-repo-id', GISCUS_CONFIG.repoId);
      script.setAttribute('data-category', GISCUS_CONFIG.category);
      script.setAttribute('data-category-id', GISCUS_CONFIG.categoryId);
      script.setAttribute('data-mapping', 'pathname');
      script.setAttribute('data-strict', '0');
      script.setAttribute('data-reactions-enabled', '1');
      script.setAttribute('data-emit-metadata', '0');
      script.setAttribute('data-input-position', 'bottom');
      script.setAttribute('data-theme', 'dark');
      script.setAttribute('data-lang', 'en');
      script.crossOrigin = 'anonymous';
      script.async = true;
      el.appendChild(script);
    }, 0);
  }
}
