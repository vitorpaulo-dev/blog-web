import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FeaturedManagerComponent } from './featured-manager.component';
import { translationProvider } from '../../../../core/i18n/testing';
import { provideTaiga } from '@taiga-ui/core';
import { provideRouter } from '@angular/router';
import { PostService } from '../../../posts/data-access/post.service';
import { LanguageService } from '../../../../core/i18n/language.service';
import { TuiToastService } from '@taiga-ui/kit';
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

describe('FeaturedManagerComponent', () => {
	let component: FeaturedManagerComponent;
	let fixture: ComponentFixture<FeaturedManagerComponent>;
	let postServiceMock: Partial<PostService>;
	let toastServiceMock: Partial<TuiToastService>;

	const mockPosts = [
		{ id: 'p1', slug: 'first', tagIds: [], translations: { ENGLISH: { title: 'First Post', content: '' } } },
		{ id: 'p2', slug: 'second', tagIds: [], translations: { ENGLISH: { title: 'Second Post', content: '' } } },
	] as any;

	beforeEach(async () => {
		postServiceMock = {
			getFeatured: vi.fn().mockReturnValue(of(mockPosts)),
			setFeatured: vi.fn().mockReturnValue(of(undefined)),
			search: vi.fn().mockReturnValue(of({ content: [], totalPages: 0, totalElements: 0 })),
		};

		toastServiceMock = {
			open: vi.fn().mockReturnValue(of(true)),
		};

		await TestBed.configureTestingModule({
			imports: [FeaturedManagerComponent],
			providers: [
				translationProvider(),
				provideTaiga(),
				provideRouter([]),
				{
					provide: PostService,
					useValue: postServiceMock,
				},
				{
					provide: LanguageService,
					useValue: { language: signal('ENGLISH' as any), setLanguage: vi.fn() },
				},
				{ provide: TuiToastService, useValue: toastServiceMock },
				{ provide: PLATFORM_ID, useValue: 'browser' },
			],
		}).compileComponents();

		fixture = TestBed.createComponent(FeaturedManagerComponent);
		component = fixture.componentInstance;
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});

	it('should load featured posts with saved snapshot', () => {
		component.ngOnInit();

		expect(component.featuredPosts().map((post) => post.id)).toEqual(['p1', 'p2']);
		expect(component.dirty()).toBe(false);
	});

	it('should enable save and send 1-based weights in current order', () => {
		component.ngOnInit();

		component.onReorder([
			{ id: 'p2', title: 'Second Post' },
			{ id: 'p1', title: 'First Post' },
		]);

		expect(component.dirty()).toBe(true);

		component.save();

		expect(postServiceMock.setFeatured).toHaveBeenCalledWith([
			{ postId: 'p2', weight: 1 },
			{ postId: 'p1', weight: 2 },
		]);
	});

	it('should disable save when nothing changed', () => {
		component.ngOnInit();

		component.onReorder([
			{ id: 'p1', title: 'First Post' },
			{ id: 'p2', title: 'Second Post' },
		]);

		expect(component.dirty()).toBe(false);
	});

	it('should load initial search results so the dropdown is populated', () => {
		(postServiceMock.search as any).mockReturnValue(
			of({ content: mockPosts, totalPages: 1, totalElements: 2 }),
		);

		component.ngOnInit();

		expect(postServiceMock.search).toHaveBeenCalledWith(
			expect.objectContaining({
				query: { query: undefined },
				page: 0,
				size: 20,
				sort: 'createdAt',
				direction: 'DESC',
			}),
		);
		expect(component.searchResults().map((post) => post.id)).toEqual(['p1', 'p2']);
	});

	it('should append selected post to featured list and mark dirty', () => {
		component.ngOnInit();

		component.selection.setValue(
			[
				{ id: 'p1', title: 'First Post' },
				{ id: 'p2', title: 'Second Post' },
				{ id: 'p3', title: 'New Post' },
			],
			{ emitEvent: true },
		);

		expect(component.featuredPosts().map((post) => post.id)).toEqual(['p1', 'p2', 'p3']);
		expect(component.selectedIds().has('p3')).toBe(true);
		expect(component.dirty()).toBe(true);
	});

	it('should drop deselected post and keep remaining order', () => {
		component.ngOnInit();

		component.selection.setValue([{ id: 'p1', title: 'First Post' }], { emitEvent: true });

		expect(component.featuredPosts().map((post) => post.id)).toEqual(['p1']);
		expect(component.selectedIds().has('p2')).toBe(false);
		expect(component.dirty()).toBe(true);
	});

	it('should set dirty when a post is removed', () => {
		component.ngOnInit();

		component.remove('p1');

		expect(component.featuredPosts().map((post) => post.id)).toEqual(['p2']);
		expect(component.dirty()).toBe(true);
	});

	it('should show error when load fails', () => {
		(postServiceMock.getFeatured as any).mockReturnValue(throwError(() => new Error('Failed')));

		component.ngOnInit();

		expect(component.error()).toBe('Failed to load featured posts');
		expect(component.loading()).toBe(false);
	});
});
