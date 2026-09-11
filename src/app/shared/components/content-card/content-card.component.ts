import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { HugeiconsIconComponent } from '@hugeicons/angular';
import { Calendar01Icon } from '@hugeicons/core-free-icons';
import { TuiChip } from '@taiga-ui/kit';

export interface ContentCardChip {
	icon: any;
	label: string;
}

export interface ContentCardItem {
	slug: string;
	title: string;
	excerpt: string;
	imageUrl: string | null;
	date: string;
	routePrefix: string;
	metaIcon: any;
	metaText: string;
	chips: ContentCardChip[];
}

@Component({
	selector: 'app-content-card',
	standalone: true,
	imports: [RouterLink, DatePipe, HugeiconsIconComponent, TuiChip],
	template: `
		@if (showDivider()) {
			<div class="py-4">
				<hr />
			</div>
		}

		<a
			[routerLink]="[item().routePrefix, item().slug]"
			class="flex flex-col md:flex-row items-center w-full hover:bg-surface transition-all p-2 md:px-4 rounded-lg group"
		>
			@if (item().imageUrl) {
				<div class="md:mr-5 aspect-video w-80 rounded-xl border border-border bg-surface overflow-hidden">
					<img
						[src]="item().imageUrl"
						[alt]="item().title"
						class="aspect-video object-cover border-b border-border group-hover:scale-105 transition-all"
					/>
				</div>
			}
			<div class="py-2 md:py-5 flex flex-col gap-3 w-full">
				<div
					class="flex items-center gap-2 text-xs text-muted font-mono group-hover:text-muted/50 transition-all"
				>
					<hugeicons-icon [icon]="Calendar01Icon" [size]="14" [strokeWidth]="1.5" />
					<span>{{ item().date | date: 'dd MMM yyyy' }}</span>

					<span aria-hidden="true">·</span>

					@if (item().metaIcon) {
						<hugeicons-icon [icon]="item().metaIcon" [size]="16" [strokeWidth]="1.5" />
					}
					<span>{{ item().metaText }}</span>
				</div>
				<h3
					class="truncate w-full text-lg font-semibold leading-tight text-foreground group-hover:text-accent transition-colors"
				>
					{{ item().title }}
				</h3>
				<p class="text-sm text-muted leading-relaxed line-clamp-3 group-hover:text-muted/50 transition-all">
					{{ item().excerpt }}
				</p>
			</div>

			<div class="flex flex-wrap gap-1.5 h-full items-center justify-end">
				@for (chip of item().chips; track chip.label) {
					<span tuiChip>
						<hugeicons-icon [icon]="chip.icon" [size]="12" [strokeWidth]="1.5" />
						{{ chip.label }}
					</span>
				}
			</div>
		</a>
	`,
})
export class ContentCardComponent {
	item = input.required<ContentCardItem>();
	showDivider = input(false);

	protected readonly Calendar01Icon = Calendar01Icon;
}
