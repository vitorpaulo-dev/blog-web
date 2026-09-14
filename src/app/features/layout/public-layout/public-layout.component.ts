import { TuiButton, TuiCell, TuiDataList, TuiDropdown, TuiTextfield, TuiTitle } from '@taiga-ui/core';
import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { TuiChevron } from '@taiga-ui/kit';
import { TuiInputSearch, TuiNavigation } from '@taiga-ui/layout';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { AsyncPipe } from '@angular/common';
import { TuiSearchResults } from '@taiga-ui/experimental';
import { debounceTime, distinctUntilChanged, map, of, switchMap } from 'rxjs';
import { PostService } from '../../posts/data-access/post.service';
import { HugeiconsIconComponent } from '@hugeicons/angular';
import { Github01Icon, Linkedin01Icon, Search01Icon, StickyNote01Icon } from '@hugeicons/core-free-icons';
import { LanguageService, type Language } from '../../../core/i18n/language.service';

@Component({
	selector: 'app-public-layout',
	standalone: true,
	imports: [
		RouterOutlet,
		AsyncPipe,
		FormsModule,
		ReactiveFormsModule,
		TuiButton,
		TuiCell,
		TuiChevron,
		TuiDataList,
		TuiDropdown,
		TuiInputSearch,
		TuiNavigation,
		TuiSearchResults,
		TuiTextfield,
		TuiTitle,
		HugeiconsIconComponent,
	],
	templateUrl: './public-layout.component.html',
	styleUrl: './public-layout.component.css',
})
export class PublicLayoutComponent {
	protected readonly control = new FormControl('', {
		nonNullable: true,
	});
	open = signal(false);
	langDropdownOpen = false;
	languageService = inject(LanguageService);
	router = inject(Router);
	private readonly postService = inject(PostService);

	protected readonly logoHref = computed(() => this.languageService.language() === 'PORTUGUESE' ? '/pt' : '/');

	protected readonly popular = [];

	protected readonly results$ = this.control.valueChanges.pipe(
		debounceTime(250),
		distinctUntilChanged(),
		switchMap((value) => {
			const query = value.trim();

			if (!query) {
				return of({
					content: [],
				});
			}

			return this.postService.search({
				query: { query },
				page: 0,
				size: 5,
				sort: 'viewCount',
				direction: 'DESC',
			});
		}),
		map((response) => ({
			Posts: response.content ?? [],
		}))
	);
	protected readonly Search01Icon = Search01Icon;
	protected readonly Github01Icon = Github01Icon;
	protected readonly Linkedin01Icon = Linkedin01Icon;
	protected readonly StickyNote01Icon = StickyNote01Icon;

	protected switchLanguage(target: Language): void {
		this.langDropdownOpen = false;

		const current = this.languageService.language();
		if (target === current) {
			return;
		}

		const url = this.router.url;
		const [pathAndQuery, ...fragmentParts] = url.split('#');
		const fragment = fragmentParts.length > 0 ? `#${fragmentParts.join('#')}` : '';
		const [path, ...queryParts] = pathAndQuery.split('?');
		const query = queryParts.length > 0 ? `?${queryParts.join('?')}` : '';
		const suffix = query + fragment;

		const segments = path.split('/').filter(Boolean);
		const route = segments[0] === 'pt' || segments[0] === 'en' ? segments.slice(1) : segments;

		if (route.length > 0 && route[0] !== 'post' && route[0] !== 'project') {
			this.languageService.setLanguage(target);
			return;
		}

		const barePath = route.length > 0 ? `/${route.join('/')}` : '/';
		const swapped = target === 'PORTUGUESE' ? (barePath === '/' ? '/pt' : `/pt${barePath}`) : barePath;

		void this.router.navigateByUrl(swapped + suffix);
	}
}
