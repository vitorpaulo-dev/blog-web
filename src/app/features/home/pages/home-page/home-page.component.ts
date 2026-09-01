import { Component, signal, OnInit, inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TuiButton, TuiTextfield } from '@taiga-ui/core';
import { HugeiconsIconComponent } from '@hugeicons/angular';
import {
  ArrowRight01Icon,
  ArrowUpRight01Icon,
  BookOpen01Icon,
  Calendar01Icon,
  Clock01Icon,
  CodeIcon,
  CpuIcon,
  Database01Icon,
  GithubIcon,
  Layers01Icon,
  Mail01Icon,
  Search01Icon,
  SparklesIcon,
  Tag01Icon,
  User02Icon,
} from '@hugeicons/core-free-icons';
import { PostService, PostDto } from '../../../posts/data-access/post.service';
import { RouterLink } from '@angular/router';
import { CommonModule, DatePipe } from '@angular/common';

@Component({
  selector: 'app-home-page',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule, TuiButton, TuiTextfield, HugeiconsIconComponent, DatePipe],
  template: `
    <div class="min-h-dvh bg-background text-foreground">
      <section aria-labelledby="hero-title" class="border-b border-border">
        <div class="mx-auto max-w-5xl px-6 py-12 md:py-16">
          <p class="text-xs uppercase tracking-widest text-muted mb-3">Field notes from production · writing since 2011</p>
          <h1 id="hero-title" class="text-3xl md:text-5xl font-bold tracking-tight text-foreground leading-tight max-w-3xl">
            Post-mortems nobody else will publish — because they're mine.
          </h1>
          <p class="mt-4 text-muted max-w-2xl leading-relaxed text-base md:text-lg">
            Backend systems, distributed data, and the trade-offs that never survive the launch post. I break things in
            production, then write down exactly why, so the next engineer doesn't have to.
          </p>
          <div class="mt-8 flex flex-wrap gap-3">
            <a href="#recent" tuiButton appearance="primary" size="m" class="gap-2">
              Read the latest
              <hugeicons-icon [icon]="ArrowRight01Icon" [size]="18" [strokeWidth]="2.5" />
            </a>
            <a href="#newsletter" tuiButton appearance="outline" size="m" class="gap-2">
              <hugeicons-icon [icon]="Mail01Icon" [size]="18" [strokeWidth]="2.5" />
              Subscribe
            </a>
          </div>
        </div>
      </section>
      <section aria-label="Right now" class="mx-auto max-w-5xl px-6 mt-6">
        <div class="rounded-xl border border-border bg-surface px-4 py-3 md:px-6 md:py-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <p class="text-sm">
            <span class="font-semibold tracking-widest text-accent uppercase text-xs">RIGHT NOW</span>
            <span class="mx-2 text-muted">—</span>
            <span class="text-foreground">migrating a 2TB tenant table off the primary. Writing it up once it stops erroring.</span>
          </p>
        </div>
      </section>
      <section id="recent" aria-labelledby="recent-title" class="mx-auto max-w-5xl px-6 py-10 md:py-14">
        <div class="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
          <div>
            <h2 id="recent-title" class="text-2xl md:text-3xl font-bold tracking-tight text-foreground">Recent posts</h2>
            <p class="mt-2 text-sm text-muted">Browse by topic — fetched from API</p>
          </div>
          <a routerLink="/post" class="text-sm font-medium text-accent hover:text-accent-secondary inline-flex items-center gap-1">
            All posts
            <hugeicons-icon [icon]="ArrowRight01Icon" [size]="16" [strokeWidth]="2.5" />
          </a>
        </div>
        @if (postsLoading()) {
          <p class="text-muted text-sm">Loading recent posts...</p>
        } @else if (postsError()) {
          <p class="text-red-400 text-sm">{{ postsError() }}</p>
        } @else if (posts().length === 0) {
          <div class="rounded-xl border border-border bg-surface p-8 text-center text-muted">No posts yet.</div>
        } @else {
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            @for (post of posts(); track post.id) {
              <article class="rounded-xl border border-border bg-surface overflow-hidden flex flex-col hover:border-border/80 transition-colors">
                @if (post.bannerUrl) {
                  <img [src]="post.bannerUrl" [alt]="post.title" class="aspect-video object-cover border-b border-border" />
                } @else {
                  <div class="aspect-video bg-background border-b border-border flex items-center justify-center text-muted text-sm">
                    <span class="inline-flex items-center gap-2"><hugeicons-icon [icon]="Database01Icon" [size]="18" [strokeWidth]="2.5" /> banner</span>
                  </div>
                }
                <div class="p-5 flex flex-col gap-3 flex-1">
                  <div class="flex items-center gap-2 text-xs text-muted">
                    <hugeicons-icon [icon]="Calendar01Icon" [size]="14" [strokeWidth]="2.5" />
                    <time>{{ post.createdAt | date:'mediumDate' }}</time>
                    <span aria-hidden="true">·</span>
                    <span class="inline-flex items-center gap-1"><hugeicons-icon [icon]="Clock01Icon" [size]="14" [strokeWidth]="2.5" /> {{ post.estimatedReadingTimeMinutes || 5 }} min</span>
                  </div>
                  <h3 class="text-lg font-semibold leading-tight text-foreground">
                    <a [routerLink]="['/post', post.slug]" class="hover:text-accent transition-colors">{{ post.title }}</a>
                  </h3>
                  <p class="text-sm text-muted leading-relaxed line-clamp-3">{{ excerpt(post.content) }}</p>
                  <div class="mt-auto flex flex-wrap gap-1.5 pt-2">
                    @for (tag of post.tags; track tag.id) {
                      <span class="inline-flex items-center gap-1 rounded-full bg-background border border-border px-2.5 py-1 text-xs text-muted"><hugeicons-icon [icon]="Tag01Icon" [size]="12" [strokeWidth]="2.5" /> {{ tag.name }}</span>
                    }
                  </div>
                </div>
              </article>
            }
          </div>
        }
      </section>
      <section aria-labelledby="about-title" class="mx-auto max-w-5xl px-6 py-10 md:py-14 border-t border-border">
        <div class="grid grid-cols-1 md:grid-cols-[320px_1fr] gap-8 md:gap-10 items-start">
          <div class="aspect-[3/4] rounded-xl border border-border bg-surface overflow-hidden flex items-center justify-center text-muted">
            <span class="text-sm inline-flex flex-col items-center gap-2">
              <hugeicons-icon [icon]="User02Icon" [size]="32" [strokeWidth]="2.5" />
              portrait · 3:4
            </span>
          </div>
          <div>
            <p class="text-xs uppercase tracking-widest text-accent font-semibold mb-2">About me</p>
            <h2 id="about-title" class="text-2xl md:text-3xl font-bold tracking-tight text-foreground">I'm Vitor — a backend engineer who ships, then writes.</h2>
            <div class="mt-4 space-y-4 text-muted leading-relaxed">
              <p>Fifteen years of production systems: storage engines, message queues, and the unglamorous plumbing that keeps a service up at 3am.</p>
            </div>
          </div>
        </div>
      </section>
      <section id="newsletter" aria-labelledby="newsletter-title" class="mx-auto max-w-5xl px-6 py-10 md:py-14">
        <div class="rounded-xl border border-border bg-surface p-6 md:p-8">
          <div class="max-w-2xl">
            <h2 id="newsletter-title" class="text-xl md:text-2xl font-bold tracking-tight text-foreground">One email when I publish. Nothing else.</h2>
            <p class="mt-2 text-sm text-muted leading-relaxed">Roughly twice a month.</p>
          </div>
          <form [formGroup]="newsletterForm" (ngSubmit)="onSubscribe()" class="mt-6 flex flex-col sm:flex-row gap-3 max-w-xl" aria-label="Newsletter subscription">
            <div class="flex-1">
              <tui-textfield>
                <label tuiLabel>Email address</label>
                <input tuiTextfield formControlName="email" placeholder="you@company.com" type="email" autocomplete="email" />
              </tui-textfield>
              @if (newsletterForm.controls.email.touched && newsletterForm.controls.email.invalid) {
                <p class="mt-1.5 text-xs text-red-400" role="alert">
                  @if (newsletterForm.controls.email.hasError('required')) { Email is required. }
                  @if (newsletterForm.controls.email.hasError('email')) { Please enter a valid email. }
                </p>
              }
            </div>
            <button tuiButton appearance="primary" size="m" type="submit" [disabled]="newsletterForm.invalid" class="shrink-0 gap-2">
              <hugeicons-icon [icon]="Mail01Icon" [size]="18" [strokeWidth]="2.5" />
              Subscribe
            </button>
          </form>
          @if (subscribed()) {
            <p class="mt-3 text-sm text-green-400" role="status">Thanks — check your email to confirm.</p>
          }
        </div>
      </section>
    </div>
  `,
})
export class HomePageComponent implements OnInit {
  protected readonly ArrowRight01Icon = ArrowRight01Icon;
  protected readonly ArrowUpRight01Icon = ArrowUpRight01Icon;
  protected readonly BookOpen01Icon = BookOpen01Icon;
  protected readonly Calendar01Icon = Calendar01Icon;
  protected readonly Clock01Icon = Clock01Icon;
  protected readonly CodeIcon = CodeIcon;
  protected readonly CpuIcon = CpuIcon;
  protected readonly Database01Icon = Database01Icon;
  protected readonly GithubIcon = GithubIcon;
  protected readonly Layers01Icon = Layers01Icon;
  protected readonly Mail01Icon = Mail01Icon;
  protected readonly Search01Icon = Search01Icon;
  protected readonly SparklesIcon = SparklesIcon;
  protected readonly Tag01Icon = Tag01Icon;
  protected readonly User02Icon = User02Icon;

  private readonly postService = inject(PostService);
  posts = signal<PostDto[]>([]);
  postsLoading = signal(false);
  postsError = signal<string | null>(null);

  ngOnInit(): void { this.loadRecent(); }

  excerpt(content: string): string {
    if (!content) return '';
    // strip markdown syntax then slice
    const text = content
      .replace(/```[\s\S]*?```/g, ' ')
      .replace(/`[^`]*`/g, ' ')
      .replace(/!\[[^\]]*]\([^)]*\)/g, ' ')
      .replace(/\[([^\]]+)]\([^)]*\)/g, '$1')
      .replace(/[#*_~`>|-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    return text.length > 150 ? text.slice(0, 150) + '…' : text;
  }

  private loadRecent(): void {
    this.postsLoading.set(true);
    this.postService.search({ page: 0, limit: 4, sort: 'createdAt' }).subscribe({
      next: r => { this.posts.set(r.content); this.postsLoading.set(false); },
      error: () => { this.postsError.set('Failed to load'); this.postsLoading.set(false); },
    });
  }

  readonly newsletterForm = new FormGroup({
    email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
  });
  readonly subscribed = signal(false);
  onSubscribe(): void {
    if (this.newsletterForm.invalid) { this.newsletterForm.markAllAsTouched(); return; }
    this.subscribed.set(true);
    this.newsletterForm.reset();
  }
}
