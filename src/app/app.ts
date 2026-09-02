import { TuiCell, TuiRoot, TuiTextfield, TuiTitle } from '@taiga-ui/core';
import { Component, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TuiInputSearch, TuiNavigation } from '@taiga-ui/layout';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { AsyncPipe } from '@angular/common';
import {TuiSearchResults} from '@taiga-ui/experimental';
import { debounceTime, distinctUntilChanged, map, of, switchMap } from 'rxjs';
import { PostService } from './features/posts/data-access/post.service';
import { HugeiconsIconComponent } from '@hugeicons/angular';
import {
	ChevronRight,
	Github01Icon,
	GithubIcon,
	Linkedin01Icon,
	Search01Icon,
	StickyNote01Icon,
} from '@hugeicons/core-free-icons';

@Component({
	selector: 'app-root',
	imports: [
		RouterOutlet,
		TuiRoot,
		AsyncPipe,
		ReactiveFormsModule,
		TuiCell,
		TuiInputSearch,
		TuiNavigation,
		TuiSearchResults,
		TuiTextfield,
		TuiTitle,
		HugeiconsIconComponent,
	],
	templateUrl: './app.html',
	styleUrl: './app.css',
})
export class App {
	protected readonly control = new FormControl('', {
		nonNullable: true,
	});
	open = signal(false);
	postService = inject(PostService);

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
	protected readonly Linkedin01Icon = Linkedin01Icon;
	protected readonly GithubIcon = GithubIcon;
	protected readonly Search01Icon = Search01Icon;
	protected readonly Github01Icon = Github01Icon;
	protected readonly StickyNote01Icon = StickyNote01Icon;
	protected readonly ChevronRight = ChevronRight;
}
