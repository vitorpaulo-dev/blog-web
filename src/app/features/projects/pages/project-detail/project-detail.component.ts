import {
	Component,
	computed,
	effect,
	inject,
	signal,
	PLATFORM_ID,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CommonModule, isPlatformBrowser } from '@angular/common';

import { HugeiconsIconComponent } from '@hugeicons/angular';
import {
	ArrowLeft01Icon,
	Calendar01Icon,
	EyeIcon,
	SmilePlusIcon,
	Share01Icon,
	GithubIcon,
	GlobalIcon,
	Tag01Icon,
	SourceCodeIcon,
} from '@hugeicons/core-free-icons';

import { TuiAppearance, TuiButton } from '@taiga-ui/core';
import { TuiChip, TuiToastService } from '@taiga-ui/kit';

import { LanguageService } from '../../../../core/i18n/language.service';
import { firstTranslation } from '../../../../core/util/text.util';
import { buildTagMap, collectTagIds, tagName as tagNameOfUtil } from '../../../../core/util/tag.util';
import { ProjectDto, ProjectService } from '../../data-access/project.service';
import { TagService, TagDto } from '../../../tags/data-access/tag.service';

@Component({
	selector: 'app-project-detail',
	standalone: true,
	imports: [CommonModule, RouterLink, TuiButton, HugeiconsIconComponent, TuiAppearance, TuiChip],
	template: `
		<div class="max-w-4xl mx-auto">
			<a routerLink="/project" tuiButton tuiAppearance="flat" size="s" class="mb-6 gap-1">
				<hugeicons-icon [icon]="ArrowLeft01Icon" [size]="16" [strokeWidth]="1.5" />

				Back to projects
			</a>

			@if (loading()) {
				<p class="text-muted">Loading...</p>
			} @else if (error()) {
				<p class="text-red-400" role="alert">
					{{ error() }}
				</p>
			} @else if (project(); as p) {
				@if (p.bannerUrl) {
					<img
						[src]="p.bannerUrl"
						[alt]="content()?.title"
						class="mb-6 w-full aspect-video object-cover rounded-xl border border-border"
					/>
				}

				<div class="flex items-center gap-4">
					@if (p.logoUrl) {
						<img
							[src]="p.logoUrl"
							[alt]="content()?.title"
							class="size-16 rounded-xl border border-border object-cover flex-shrink-0"
						/>
					}
					<div class="w-full">
						<div class="inline-flex justify-between items-start w-full">
							<h1 class="text-3xl md:text-4xl font-bold tracking-tight leading-tight break-words">
								{{ content()?.title }}
							</h1>

							<div class="flex flex-wrap gap-2">
								@if (p.githubUrl) {
									<a tuiButton tuiAppearance="outline" size="m" [href]="p.githubUrl" target="_blank" rel="noopener noreferrer" class="gap-2">
										<hugeicons-icon [icon]="githubIcon" [size]="16" [strokeWidth]="1.5" />
										GitHub
									</a>
								}
								@if (p.websiteUrl) {
									<a tuiButton tuiAppearance="outline" size="m" [href]="p.websiteUrl" target="_blank" rel="noopener noreferrer" class="gap-2">
										<hugeicons-icon [icon]="websiteIcon" [size]="16" [strokeWidth]="1.5" />
										Website
									</a>
								}
							</div>
						</div>

						<div class="flex flex-wrap items-center gap-3 text-sm text-muted">
							<span class="inline-flex items-center gap-1">
								<hugeicons-icon [icon]="Calendar01Icon" [size]="16" [strokeWidth]="1.5" />
								{{ p.createdAt | date: 'dd MMM yyyy' }}
							</span>

							<span>·</span>

							<span class="inline-flex items-center gap-1">
								<hugeicons-icon [icon]="EyeIcon" [size]="16" [strokeWidth]="1.5" />
								{{ p.viewCount }} views
							</span>

							<span>·</span>

							<span class="inline-flex items-center gap-1">
								<hugeicons-icon [icon]="SmilePlusIcon" [size]="16" [strokeWidth]="1.5" />
								{{ p.reactionCount }} reactions
							</span>
						</div>
					</div>
				</div>

				<div class="mt-3 flex flex-wrap gap-2">
					@for (author of p.authors; track author.id) {
						<a tuiChip [href]="'/author/' + author.slug">
							@if (author.avatarUrl) {
								<img [src]="author.avatarUrl" class="rounded-xl" [alt]="author.name" />
							}
							{{ author.name }}
						</a>
					}
					
					@for (tag of projectTags(); track tag.id) {
						<p tuiChip>
							<hugeicons-icon [icon]="SourceCodeIcon" [size]="12" [strokeWidth]="1.5" />
	
							{{ tagNameOf(tag) }}
						</p>
					}
				</div>

				<article class="prose prose-invert max-w-none mt-8 break-words">
					<p class="whitespace-pre-wrap">{{ content()?.description }}</p>
				</article>

				<hr class="my-8">

				<section class="flex flex-wrap items-center justify-between gap-2">
					<div class="flex flex-wrap gap-2">
						<button tuiChip class="inline-flex items-center gap-2">
							<img src="/reactions/red-heart.png" alt="Love" class="w-5" />
							<span>Loved it</span>
							<span class="font-mono text-muted text-xs">{{ p.loveCount }}</span>
						</button>

						<button tuiChip class="inline-flex items-center gap-2">
							<img src="/reactions/party-popper.png" alt="Celebrate" class="w-5" />
							<span>Hell yeah</span>
							<span class="font-mono text-muted text-xs">{{ p.celebrateCount }}</span>
						</button>

						<button tuiChip class="inline-flex items-center gap-2">
							<img src="/reactions/exploding-head.png" alt="Mind blown" class="w-5" />
							<span>Mind blown</span>
							<span class="font-mono text-muted text-xs">{{ p.geniusCount }}</span>
						</button>

						<button tuiChip class="inline-flex items-center gap-2">
							<img src="/reactions/suffering-cat.webp" alt="Suffering cat" class="w-5" />
							<span>What?!</span>
							<span class="font-mono text-muted text-xs">{{ p.helpCount }}</span>
						</button>
					</div>

					<button tuiChip class="inline-flex items-center gap-2" (click)="shareProject()">
						<hugeicons-icon [icon]="shareIcon" [size]="16" [strokeWidth]="2.5" />
						<span>Share</span>
					</button>
				</section>
			}
		</div>
	`,
})
export class ProjectDetailComponent {
	private readonly route = inject(ActivatedRoute);
	private readonly projectService = inject(ProjectService);
	private readonly tagService = inject(TagService);
	private readonly platformId = inject(PLATFORM_ID);
	private readonly router = inject(Router);
	private readonly languageService = inject(LanguageService);
	private readonly toastService = inject(TuiToastService);

	readonly isBrowser = isPlatformBrowser(this.platformId);

	readonly Calendar01Icon = Calendar01Icon;
	readonly EyeIcon = EyeIcon;
	readonly ArrowLeft01Icon = ArrowLeft01Icon;
	readonly shareIcon = Share01Icon;
	readonly githubIcon = GithubIcon;
	readonly websiteIcon = GlobalIcon;

	readonly project = signal<ProjectDto | null>(null);
	readonly loading = signal(true);
	readonly error = signal<string | null>(null);
	readonly tagMap = signal<Map<string, TagDto>>(new Map());
	readonly lang = this.languageService.language.asReadonly();
	readonly slug = this.route.snapshot.paramMap.get('slug');

	readonly projectTags = computed<TagDto[]>(() => {
		const project = this.project();
		if (!project) return [];
		const tags = this.tagMap();
		return (project.tagIds ?? []).map(id => tags.get(id)).filter((t): t is TagDto => !!t);
	});

	content() {
		return firstTranslation(this.project()?.translations);
	}

	tagNameOf(tag: TagDto | undefined): string {
		return tagNameOfUtil(tag, this.lang());
	}

	constructor() {
		if (!this.slug) {
			void this.router.navigate(['']);
			return;
		}

		effect(() => {
			this.loadProject(this.slug!);
		});
	}

	private loadProject(slug: string): void {
		this.loading.set(true);
		this.projectService.getBySlug(slug).subscribe({
			next: (project) => {
				this.project.set(project);
				this.loading.set(false);
				this.loadTags(project);
			},
			error: () => {
				this.loading.set(false);
				this.toastService.open('Failed to load project. Please try again.', {
					appearance: 'error',
					autoClose: 5000,
					data: '@tui.circle-x',
				}).subscribe();
				void this.router.navigate(['']);
			},
		});
	}

	private loadTags(project: ProjectDto): void {
		const ids = collectTagIds([project]);
		if (ids.length === 0) {
			this.tagMap.set(new Map());
			return;
		}
		this.tagService.batch(ids).subscribe({
			next: (tags) => this.tagMap.set(buildTagMap(tags)),
			error: () => this.tagMap.set(new Map()),
		});
	}

	shareProject(): void {
		if (!this.isBrowser) return;

		const project = this.project();
		if (!project) return;

		const url = window.location.href;
		const text = this.content()?.title || '';

		if (navigator.share) {
			navigator.share({ title: text, url }).catch(() => {
				this.copyToClipboard(url);
			});
		} else {
			this.copyToClipboard(url);
		}
	}

	private copyToClipboard(text: string): void {
		navigator.clipboard.writeText(text).then(() => {
			console.log('Link copied to clipboard');
		}).catch(() => {
			const textarea = document.createElement('textarea');
			textarea.value = text;
			document.body.appendChild(textarea);
			textarea.select();
			document.execCommand('copy');
			document.body.removeChild(textarea);
		});
	}

	protected readonly SmilePlusIcon = SmilePlusIcon;
	protected readonly Tag01Icon = Tag01Icon;
	protected readonly SourceCodeIcon = SourceCodeIcon;
}
