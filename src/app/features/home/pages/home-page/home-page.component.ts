import { Component, signal } from '@angular/core';
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

@Component({
  selector: 'app-home-page',
  standalone: true,
  imports: [ReactiveFormsModule, TuiButton, TuiTextfield, HugeiconsIconComponent],
  template: `
    <div class="min-h-dvh bg-background text-foreground">
      <!-- Hero -->
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
              <hugeicons-icon [icon]="ArrowRight01Icon" [size]="18" />
            </a>
            <a href="#newsletter" tuiButton appearance="outline" size="m" class="gap-2">
              <hugeicons-icon [icon]="Mail01Icon" [size]="18" />
              Subscribe
            </a>
          </div>
          <div class="mt-6 flex items-center gap-2 text-sm text-muted">
            <hugeicons-icon [icon]="Search01Icon" [size]="16" />
            <span>Search</span>
            <span aria-hidden="true" class="opacity-30">/</span>
            <a href="https://github.com/vitorpaulo/vitorpaulo.dev" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1 text-accent hover:text-accent-secondary underline underline-offset-4">
              github
              <hugeicons-icon [icon]="ArrowUpRight01Icon" [size]="14" />
            </a>
          </div>
        </div>
      </section>

      <!-- Right now banner -->
      <section aria-label="Right now" class="mx-auto max-w-5xl px-6 mt-6">
        <div class="rounded-xl border border-border bg-surface px-4 py-3 md:px-6 md:py-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <p class="text-sm">
            <span class="font-semibold tracking-widest text-accent uppercase text-xs">RIGHT NOW</span>
            <span class="mx-2 text-muted">—</span>
            <span class="text-foreground">migrating a 2TB tenant table off the primary. Writing it up once it stops erroring.</span>
          </p>
          <a href="#" class="inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:text-accent-secondary whitespace-nowrap">
            Latest breakdown
            <hugeicons-icon [icon]="ArrowRight01Icon" [size]="16" />
          </a>
        </div>
      </section>

      <!-- Recent posts -->
      <section id="recent" aria-labelledby="recent-title" class="mx-auto max-w-5xl px-6 py-10 md:py-14">
        <div class="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
          <div>
            <h2 id="recent-title" class="text-2xl md:text-3xl font-bold tracking-tight text-foreground">Recent posts</h2>
            <p class="mt-2 text-sm text-muted flex flex-wrap items-center gap-2">
              <span>Browse by topic</span>
              <span aria-hidden="true">—</span>
              <span class="inline-flex flex-wrap gap-1.5">
                <span class="rounded-full border border-border bg-background px-2.5 py-0.5 text-xs">Databases</span>
                <span class="rounded-full border border-border bg-background px-2.5 py-0.5 text-xs">Queues</span>
                <span class="rounded-full border border-border bg-background px-2.5 py-0.5 text-xs">Caching</span>
                <span class="rounded-full border border-border bg-background px-2.5 py-0.5 text-xs">Tooling</span>
                <span class="rounded-full border border-border bg-background px-2.5 py-0.5 text-xs">Observability</span>
              </span>
            </p>
          </div>
          <a href="#" class="text-sm font-medium text-accent hover:text-accent-secondary inline-flex items-center gap-1">
            All posts
            <hugeicons-icon [icon]="ArrowRight01Icon" [size]="16" />
          </a>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <!-- Card 1 -->
          <article class="rounded-xl border border-border bg-surface overflow-hidden flex flex-col hover:border-border/80 transition-colors">
            <div class="aspect-video bg-background border-b border-border flex items-center justify-center text-muted text-sm">
              <span class="inline-flex items-center gap-2"><hugeicons-icon [icon]="Database01Icon" [size]="18" /> banner</span>
            </div>
            <div class="p-5 flex flex-col gap-3 flex-1">
              <div class="flex items-center gap-2 text-xs text-muted">
                <hugeicons-icon [icon]="Calendar01Icon" [size]="14" />
                <time datetime="2026-08-21">Aug 21, 2026</time>
                <span aria-hidden="true">·</span>
                <span class="inline-flex items-center gap-1"><hugeicons-icon [icon]="Clock01Icon" [size]="14" /> 8 min</span>
              </div>
              <h3 class="text-lg font-semibold leading-tight text-foreground">
                <a href="#" class="hover:text-accent transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded">
                  I tried to shard Postgres by tenant. It broke.
                </a>
              </h3>
              <p class="text-sm text-muted leading-relaxed line-clamp-3">
                Cross-tenant queries, a fan-out that melted the connection pool, and the migration I wish I'd run at 2am instead of noon.
              </p>
              <div class="mt-auto flex flex-wrap gap-1.5 pt-2">
                <span class="inline-flex items-center gap-1 rounded-full bg-background border border-border px-2.5 py-1 text-xs text-muted"><hugeicons-icon [icon]="Tag01Icon" [size]="12" /> Databases</span>
                <span class="inline-flex items-center gap-1 rounded-full bg-background border border-border px-2.5 py-1 text-xs text-muted"><hugeicons-icon [icon]="Database01Icon" [size]="12" /> Postgres</span>
              </div>
            </div>
          </article>

          <!-- Card 2 -->
          <article class="rounded-xl border border-border bg-surface overflow-hidden flex flex-col hover:border-border/80 transition-colors">
            <div class="aspect-video bg-background border-b border-border flex items-center justify-center text-muted text-sm">
              <span class="inline-flex items-center gap-2"><hugeicons-icon [icon]="Layers01Icon" [size]="18" /> banner</span>
            </div>
            <div class="p-5 flex flex-col gap-3 flex-1">
              <div class="flex items-center gap-2 text-xs text-muted">
                <hugeicons-icon [icon]="Calendar01Icon" [size]="14" />
                <time datetime="2026-07-09">Jul 09, 2026</time>
                <span aria-hidden="true">·</span>
                <span class="inline-flex items-center gap-1"><hugeicons-icon [icon]="Clock01Icon" [size]="14" /> 6 min</span>
              </div>
              <h3 class="text-lg font-semibold leading-tight text-foreground">
                <a href="#" class="hover:text-accent transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded">
                  The retry queue that retried forever
                </a>
              </h3>
              <p class="text-sm text-muted leading-relaxed line-clamp-3">
                Exponential backoff without a dead-letter is just a slower outage. A small state machine fixed it.
              </p>
              <div class="mt-auto flex flex-wrap gap-1.5 pt-2">
                <span class="inline-flex items-center gap-1 rounded-full bg-background border border-border px-2.5 py-1 text-xs text-muted"><hugeicons-icon [icon]="Tag01Icon" [size]="12" /> Queues</span>
                <span class="inline-flex items-center gap-1 rounded-full bg-background border border-border px-2.5 py-1 text-xs text-muted">Reliability</span>
              </div>
            </div>
          </article>

          <!-- Card 3 -->
          <article class="rounded-xl border border-border bg-surface overflow-hidden flex flex-col hover:border-border/80 transition-colors">
            <div class="aspect-video bg-background border-b border-border flex items-center justify-center text-muted text-sm">
              <span class="inline-flex items-center gap-2"><hugeicons-icon [icon]="CodeIcon" [size]="18" /> banner</span>
            </div>
            <div class="p-5 flex flex-col gap-3 flex-1">
              <div class="flex items-center gap-2 text-xs text-muted">
                <hugeicons-icon [icon]="Calendar01Icon" [size]="14" />
                <time datetime="2026-06-02">Jun 02, 2026</time>
                <span aria-hidden="true">·</span>
                <span class="inline-flex items-center gap-1"><hugeicons-icon [icon]="Clock01Icon" [size]="14" /> 10 min</span>
              </div>
              <h3 class="text-lg font-semibold leading-tight text-foreground">
                <a href="#" class="hover:text-accent transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded">
                  Reading 40GB of logs without crashing the laptop
                </a>
              </h3>
              <p class="text-sm text-muted leading-relaxed line-clamp-3">
                Streaming, mmap, and why your fancy ORM is the wrong tool for a one-off forensic query.
              </p>
              <div class="mt-auto flex flex-wrap gap-1.5 pt-2">
                <span class="inline-flex items-center gap-1 rounded-full bg-background border border-border px-2.5 py-1 text-xs text-muted"><hugeicons-icon [icon]="Tag01Icon" [size]="12" /> Tooling</span>
                <span class="inline-flex items-center gap-1 rounded-full bg-background border border-border px-2.5 py-1 text-xs text-muted">Forensics</span>
              </div>
            </div>
          </article>

          <!-- Card 4 -->
          <article class="rounded-xl border border-border bg-surface overflow-hidden flex flex-col hover:border-border/80 transition-colors">
            <div class="aspect-video bg-background border-b border-border flex items-center justify-center text-muted text-sm">
              <span class="inline-flex items-center gap-2"><hugeicons-icon [icon]="CpuIcon" [size]="18" /> banner</span>
            </div>
            <div class="p-5 flex flex-col gap-3 flex-1">
              <div class="flex items-center gap-2 text-xs text-muted">
                <hugeicons-icon [icon]="Calendar01Icon" [size]="14" />
                <time datetime="2026-04-18">Apr 18, 2026</time>
                <span aria-hidden="true">·</span>
                <span class="inline-flex items-center gap-1"><hugeicons-icon [icon]="Clock01Icon" [size]="14" /> 5 min</span>
              </div>
              <h3 class="text-lg font-semibold leading-tight text-foreground">
                <a href="#" class="hover:text-accent transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded">
                  A cache invalidation story with a happy ending
                </a>
              </h3>
              <p class="text-sm text-muted leading-relaxed line-clamp-3">
                Write-through, a versioned key, and the test that finally let me delete the "TODO: fix race" comment.
              </p>
              <div class="mt-auto flex flex-wrap gap-1.5 pt-2">
                <span class="inline-flex items-center gap-1 rounded-full bg-background border border-border px-2.5 py-1 text-xs text-muted"><hugeicons-icon [icon]="Tag01Icon" [size]="12" /> Caching</span>
                <span class="inline-flex items-center gap-1 rounded-full bg-background border border-border px-2.5 py-1 text-xs text-muted">Redis</span>
              </div>
            </div>
          </article>
        </div>
      </section>

      <!-- About -->
      <section aria-labelledby="about-title" class="mx-auto max-w-5xl px-6 py-10 md:py-14 border-t border-border">
        <div class="grid grid-cols-1 md:grid-cols-[320px_1fr] gap-8 md:gap-10 items-start">
          <div class="aspect-[3/4] rounded-xl border border-border bg-surface overflow-hidden flex items-center justify-center text-muted">
            <span class="text-sm inline-flex flex-col items-center gap-2">
              <hugeicons-icon [icon]="User02Icon" [size]="32" />
              portrait · 3:4
            </span>
          </div>
          <div>
            <p class="text-xs uppercase tracking-widest text-accent font-semibold mb-2">About me</p>
            <h2 id="about-title" class="text-2xl md:text-3xl font-bold tracking-tight text-foreground">I'm Vitor — a backend engineer who ships, then writes.</h2>
            <div class="mt-4 space-y-4 text-muted leading-relaxed">
              <p>
                Fifteen years of production systems: storage engines, message queues, and the unglamorous plumbing that keeps a service up at 3am. I started this blog because the interesting parts never fit in a commit message.
              </p>
              <p>
                I write for other engineers. No growth hacks, no "unlock the power of" — just the thing that broke, the thing I tried, and the trade-off I'd make again. When something is a screenshot or a code block, it's a real one.
              </p>
            </div>
            <a href="#" class="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:text-accent-secondary">
              More about me
              <hugeicons-icon [icon]="ArrowRight01Icon" [size]="16" />
            </a>
          </div>
        </div>
      </section>

      <!-- Newsletter -->
      <section id="newsletter" aria-labelledby="newsletter-title" class="mx-auto max-w-5xl px-6 py-10 md:py-14">
        <div class="rounded-xl border border-border bg-surface p-6 md:p-8">
          <div class="max-w-2xl">
            <h2 id="newsletter-title" class="text-xl md:text-2xl font-bold tracking-tight text-foreground">One email when I publish. Nothing else.</h2>
            <p class="mt-2 text-sm text-muted leading-relaxed">
              Roughly twice a month. Real post-mortems, the occasional war story, and links to the source when I can share it. Unsubscribe in one click.
            </p>
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
              <hugeicons-icon [icon]="Mail01Icon" [size]="18" />
              Subscribe
            </button>
          </form>
          <p class="mt-3 text-xs text-muted">No tracking pixels. RSS also available at <a href="#" class="underline decoration-accent underline-offset-4 hover:text-foreground">/feed.xml</a>.</p>
          @if (subscribed()) {
            <p class="mt-3 text-sm text-green-400" role="status">Thanks — check your email to confirm.</p>
          }
        </div>
      </section>

      <!-- Agent squad / Built in the open -->
      <section aria-labelledby="agent-title" class="mx-auto max-w-5xl px-6 pb-12 md:pb-16">
        <div class="rounded-xl border border-border bg-background overflow-hidden">
          <div class="p-6 md:p-8">
            <p class="text-xs uppercase tracking-widest text-accent font-semibold">Built in the open</p>
            <h2 id="agent-title" class="mt-2 text-xl md:text-2xl font-bold tracking-tight text-foreground">This blog is built by an agent squad — and you can read every line.</h2>
            <p class="mt-3 text-sm text-muted leading-relaxed max-w-2xl">
              The posts, the layout, and the build pipeline are written and maintained by a small squad of specialized agents. The full source — templates, content, and tooling — lives on GitHub, so you can fork it, argue with it, or just see how the sausage is made.
            </p>
            <div class="mt-6 flex flex-wrap gap-3">
              <a tuiButton appearance="secondary" size="m" href="#" class="gap-2">
                <hugeicons-icon [icon]="SparklesIcon" [size]="18" />
                How the agent squad works
              </a>
              <a tuiButton appearance="outline" size="m" href="https://github.com/vitorpaulo/vitorpaulo.dev" target="_blank" rel="noopener noreferrer" class="gap-2">
                <hugeicons-icon [icon]="GithubIcon" [size]="18" />
                View source on GitHub
                <hugeicons-icon [icon]="ArrowUpRight01Icon" [size]="14" />
              </a>
            </div>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-border border-t border-border bg-surface">
            <div class="p-5 flex gap-3">
              <hugeicons-icon [icon]="BookOpen01Icon" [size]="20" class="text-accent mt-0.5" />
              <div>
                <p class="text-sm font-semibold text-foreground">Post-mortems</p>
                <p class="text-xs text-muted mt-1">Real incidents, real timelines.</p>
              </div>
            </div>
            <div class="p-5 flex gap-3">
              <hugeicons-icon [icon]="CodeIcon" [size]="20" class="text-accent mt-0.5" />
              <div>
                <p class="text-sm font-semibold text-foreground">Source open</p>
                <p class="text-xs text-muted mt-1">Every template & pipeline on GitHub.</p>
              </div>
            </div>
            <div class="p-5 flex gap-3">
              <hugeicons-icon [icon]="Layers01Icon" [size]="20" class="text-accent mt-0.5" />
              <div>
                <p class="text-sm font-semibold text-foreground">Agent-built</p>
                <p class="text-xs text-muted mt-1">A squad that ships, then documents.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer class="border-t border-border py-6">
        <div class="mx-auto max-w-5xl px-6 flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-muted">
          <p>© 2026 vitorpaulo.dev built with an agent squad · <a href="https://github.com/vitorpaulo/vitorpaulo.dev" class="underline decoration-accent underline-offset-4 hover:text-foreground inline-flex items-center gap-1">source <hugeicons-icon [icon]="ArrowUpRight01Icon" [size]="12" /></a></p>
          <p class="inline-flex items-center gap-2">
            <span>Esc</span>
            <span aria-hidden="true">·</span>
            <span>↑ ↓ navigate</span>
            <span aria-hidden="true">·</span>
            <span>Enter open</span>
            <span aria-hidden="true">·</span>
            <span>Esc close</span>
          </p>
        </div>
      </footer>
    </div>
  `,
})
export class HomePageComponent {
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

  readonly newsletterForm = new FormGroup({
    email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
  });

  // Simple placeholder state for UI feedback — no backend yet
  readonly subscribed = signal(false);

  onSubscribe(): void {
    if (this.newsletterForm.invalid) {
      this.newsletterForm.markAllAsTouched();
      return;
    }
    // Placeholder — future will call newsletter API
    this.subscribed.set(true);
    this.newsletterForm.reset();
  }
}
