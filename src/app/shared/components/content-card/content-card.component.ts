import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HugeiconsIconComponent } from '@hugeicons/angular';
import { Calendar01Icon } from '@hugeicons/core-free-icons';
import { TuiChip } from '@taiga-ui/kit';
import { LocalizedDatePipe } from '../../../core/i18n/localized-date.pipe';
import { ImageSignDirective } from '../../../shared/directives/image-sign.directive';

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
	imports: [RouterLink, LocalizedDatePipe, HugeiconsIconComponent, TuiChip, ImageSignDirective],
	template: `
		@if (showDivider()) {
			<div class="py-4">
				<hr />
			</div>
		}

		<a
			[routerLink]="[item().routePrefix, item().slug]"
			class="group flex flex-col md:flex-row items-center w-full gap-3 p-3 rounded-lg hover:bg-surface transition-all"
		>
			@if (item().imageUrl) {
				<div
					class="w-full md:w-56 lg:w-64 shrink-0 aspect-video rounded-xl border border-border bg-surface overflow-hidden">
					<img
						[appImageSign]="item().imageUrl ?? ''"
						[src]="item().imageUrl"
						[alt]="item().title"
						loading="lazy"
						class="w-full h-full object-cover group-hover:scale-105 transition-transform"
					/>
				</div>
			}

			<div class="flex flex-col justify-center gap-1.5 min-w-0 flex-1 w-full">
				<div
					class="flex items-center gap-2 text-xs text-muted font-mono group-hover:text-muted/50 transition-all">
					<hugeicons-icon [icon]="Calendar01Icon" [size]="14" [strokeWidth]="1.5" />
					<span>{{ item().date | localizedDate: 'dd MMM yyyy' }}</span>
					<span aria-hidden="true">·</span>
					@if (item().metaIcon) {
						<hugeicons-icon [icon]="item().metaIcon" [size]="16" [strokeWidth]="1.5" />
					}
					<span class="truncate">{{ item().metaText }}</span>
				</div>

				<h3 class="truncate text-lg font-semibold leading-tight text-foreground group-hover:text-accent transition-colors">
					{{ item().title }}
				</h3>

				<p class="text-sm text-muted leading-relaxed line-clamp-3 group-hover:text-muted/50 transition-all">
					{{ item().excerpt }}
				</p>
			</div>

			@if (item().chips?.length) {
				<div class="flex flex-row md:flex-col flex-wrap items-end justify-end gap-1.5 shrink-0">
					@for (chip of item().chips; track chip.label) {
						<span tuiChip>
						    <hugeicons-icon [icon]="chip.icon" [size]="12" [strokeWidth]="1.5" />
							{{ chip.label }}
						</span>
					}
				</div>
			}
		</a>
	`,
})
export class ContentCardComponent {
	item = input.required<ContentCardItem>();
	showDivider = input(false);

	protected readonly Calendar01Icon = Calendar01Icon;
}
