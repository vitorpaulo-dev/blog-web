import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DashboardPostListComponent } from './dashboard-post-list.component';
import { provideTaiga } from '@taiga-ui/core';
import { provideRouter } from '@angular/router';
import { PostService } from '../../../posts/data-access/post.service';
import { TagService } from '../../../tags/data-access/tag.service';
import { LanguageService } from '../../../../core/i18n/language.service';
import { translationProvider } from '../../../../core/i18n/testing';
import { TuiToastService } from '@taiga-ui/kit';
import { TuiDialogService } from '@taiga-ui/core';
import { of, throwError } from 'rxjs';
import { PLATFORM_ID } from '@angular/core';
import { signal } from '@angular/core';

Object.defineProperty(window, 'matchMedia', {
	writable: true,
	value: vi.fn().mockImplementation((query) => ({
		matches: false,
		media: query,
		onchange: null,
		addListener: vi.fn(),
		removeListener: vi.fn(),
		addEventListener: vi.fn(),
		removeEventListener: vi.fn(),
		dispatchEvent: vi.fn(),
	})),
});

describe('DashboardPostListComponent', () => {
	let component: DashboardPostListComponent;
	let fixture: ComponentFixture<DashboardPostListComponent>;
	let postServiceMock: Partial<PostService>;
	let tagServiceMock: Partial<TagService>;
	let languageServiceMock: Partial<LanguageService>;
	let toastServiceMock: Partial<TuiToastService>;
	let dialogServiceMock: Partial<TuiDialogService>;

	beforeEach(async () => {
		postServiceMock = {
			search: vi.fn(),
			delete: vi.fn(),
		};

		tagServiceMock = {
			batch: vi.fn().mockReturnValue(of([])),
		};

		languageServiceMock = {
			language: signal('ENGLISH' as any),
			setLanguage: vi.fn(),
		};

		toastServiceMock = {
			open: vi.fn().mockReturnValue(of(true)),
		};

		dialogServiceMock = {
			open: vi.fn().mockReturnValue(of(true)),
		};

		await TestBed.configureTestingModule({
			imports: [DashboardPostListComponent],
			providers: [
				provideTaiga(),
				provideRouter([]),
				{ provide: PostService, useValue: postServiceMock },
				{ provide: TagService, useValue: tagServiceMock },
				{ provide: LanguageService, useValue: languageServiceMock },
				translationProvider(),
				{ provide: TuiToastService, useValue: toastServiceMock },
				{ provide: TuiDialogService, useValue: dialogServiceMock },
				{ provide: PLATFORM_ID, useValue: 'browser' },
			],
		}).compileComponents();

		fixture = TestBed.createComponent(DashboardPostListComponent);
		component = fixture.componentInstance;
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});

	it('should not load posts during SSR', () => {
		(postServiceMock.search as any).mockClear();

		TestBed.resetTestingModule();
		TestBed.configureTestingModule({
			imports: [DashboardPostListComponent],
			providers: [
				provideTaiga(),
				provideRouter([]),
				{ provide: PostService, useValue: postServiceMock },
				{ provide: TagService, useValue: tagServiceMock },
				{ provide: LanguageService, useValue: languageServiceMock },
				translationProvider(),
				{ provide: TuiToastService, useValue: toastServiceMock },
				{ provide: TuiDialogService, useValue: dialogServiceMock },
				{ provide: PLATFORM_ID, useValue: 'server' },
			],
		});

		const serverFixture = TestBed.createComponent(DashboardPostListComponent);
		const serverComponent = serverFixture.componentInstance;

		serverComponent.load();

		expect(postServiceMock.search).not.toHaveBeenCalled();
		expect(tagServiceMock.batch).not.toHaveBeenCalled();
	});

	it('should pass the text search to the posts service', () => {
		(postServiceMock.search as any).mockReturnValue(of({ content: [], totalPages: 1, totalElements: 0 }));

		component.searchControl.setValue(' angular ');
		component.load();

		expect(postServiceMock.search).toHaveBeenLastCalledWith(
			expect.objectContaining({ query: { query: 'angular' } })
		);
	});

	it('should map status label and color', () => {
		expect(component.statusLabel('PUBLISHED')).toBe('Published');
		expect(component.statusLabel('DRAFT')).toBe('Draft');
		expect(component.statusColor('PUBLISHED')).toBe('var(--tui-status-positive)');
		expect(component.statusColor('DRAFT')).toBe('var(--tui-status-warning)');
	});

	it('should render the redesigned table with status label and tag chips', () => {
		(postServiceMock.search as any).mockReturnValue(
			of({
				content: [
					{
						id: '1',
						slug: 'post-1',
						status: 'PUBLISHED',
						createdAt: '2025-01-01T00:00:00Z',
						viewCount: 1,
						reactionCount: 2,
						authors: [],
						tagIds: ['t1'],
						translations: { ENGLISH: { title: 'Hello' } },
					},
				],
				totalPages: 1,
				totalElements: 1,
			})
		);
		(tagServiceMock.batch as any).mockReturnValue(
			of([{ id: 't1', slug: 'angular', translations: { ENGLISH: { name: 'Angular' } } }])
		);

		component.load();
		fixture.detectChanges();

		const html = fixture.nativeElement as HTMLElement;
		expect(html.querySelector('table')).toBeTruthy();
		expect(html.textContent).toContain('Hello');
		expect(html.textContent).toContain('post-1');
		expect(html.textContent).toContain('Published');
		expect(html.textContent).toContain('Angular');
	});

	it('should always render every column inside a horizontal scroll container', () => {
		(postServiceMock.search as any).mockReturnValue(
			of({
				content: [
					{
						id: '1',
						slug: 'post-1',
						status: 'PUBLISHED',
						createdAt: '2025-01-01T00:00:00Z',
						viewCount: 1,
						reactionCount: 2,
						authors: [],
						tagIds: [],
						translations: { ENGLISH: { title: 'Hello' } },
					},
				],
				totalPages: 1,
				totalElements: 1,
			})
		);

		component.load();
		fixture.detectChanges();

		const html = fixture.nativeElement as HTMLElement;
		expect(html.querySelector('.overflow-x-auto')).toBeTruthy();

		const hiddenCells = Array.from(html.querySelectorAll('th, td')).filter((cell) =>
			cell.classList.contains('hidden')
		);

		expect(hiddenCells).toEqual([]);
		expect(html.textContent).toContain('Reactions');
		expect(html.textContent).toContain('Authors');
	});

	it('should load table tag chips from the loaded page tags in chunks of at most 20 ids', () => {
		const tagIds = Array.from({ length: 25 }, (_, index) => `t${index + 1}`);

		(postServiceMock.search as any).mockReturnValue(
			of({
				content: [
					{
						id: '1',
						slug: 'post-1',
						status: 'PUBLISHED',
						createdAt: '2025-01-01T00:00:00Z',
						viewCount: 1,
						reactionCount: 2,
						authors: [],
						tagIds,
						translations: { ENGLISH: { title: 'Hello' } },
					},
				],
				totalPages: 1,
				totalElements: 1,
			})
		);

		(tagServiceMock.batch as any).mockImplementation((ids: string[]) =>
			of(
				ids.map((id) => ({
					id,
					slug: id,
					translations: { ENGLISH: { name: id.toUpperCase() } },
				}))
			)
		);

		component.load();

		const batchCalls = (tagServiceMock.batch as any).mock.calls.map((call: any) => call[0] as string[]);
		expect(batchCalls).toHaveLength(2);
		expect(batchCalls[0]).toHaveLength(20);
		expect(batchCalls[1]).toHaveLength(5);

		expect(Array.from(component.tagMap().keys())).toEqual(tagIds);
	});

	it('should show success toast when post is deleted', () => {
		(postServiceMock.delete as any).mockReturnValue(of({}));
		(postServiceMock.search as any).mockReturnValue(of({ content: [], totalPages: 1, totalElements: 0 }));

		component.askDeleteOne('test-id');

		expect(dialogServiceMock.open).toHaveBeenCalled();
		expect(toastServiceMock.open).toHaveBeenCalledWith('Post deleted successfully', {
			appearance: 'success',
			autoClose: 3000,
			data: '@tui.check',
		});
	});

	it('should show error toast when delete fails', () => {
		(postServiceMock.delete as any).mockReturnValue(throwError(() => new Error('Failed')));

		component.askDeleteOne('test-id');

		expect(toastServiceMock.open).toHaveBeenCalledWith('Failed to delete post. Please try again.', {
			appearance: 'error',
			autoClose: 5000,
			data: '@tui.circle-x',
		});
	});

	it('should show success toast when mass delete succeeds', () => {
		component.toggle('id1');
		component.toggle('id2');
		(postServiceMock.delete as any).mockReturnValue(of({}));
		(postServiceMock.search as any).mockReturnValue(of({ content: [], totalPages: 1, totalElements: 0 }));

		component.massDelete();

		expect(dialogServiceMock.open).toHaveBeenCalled();
		expect(toastServiceMock.open).toHaveBeenCalledWith('2 posts deleted successfully', {
			appearance: 'success',
			autoClose: 3000,
			data: '@tui.check',
		});
	});

	it('should show error toast when mass delete fails', () => {
		component.toggle('id1');
		(postServiceMock.delete as any).mockReturnValue(throwError(() => new Error('Failed')));

		component.massDelete();

		expect(toastServiceMock.open).toHaveBeenCalledWith('Failed to delete posts. Please try again.', {
			appearance: 'error',
			autoClose: 5000,
			data: '@tui.circle-x',
		});
	});
});
