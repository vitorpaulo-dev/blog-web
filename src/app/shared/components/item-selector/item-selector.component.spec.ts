import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { By } from '@angular/platform-browser';
import { provideTaiga, TuiDropdownOpen, TuiRoot, TuiTextfieldComponent } from '@taiga-ui/core';
import { Tag01Icon } from '@hugeicons/core-free-icons';
import { vi } from 'vitest';

import { translationProvider } from '../../../core/i18n/testing';
import { ItemSelectorComponent } from './item-selector.component';

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

interface Fruit {
	id: string;
	name: string;
}

const APPLE: Fruit = { id: 'f1', name: 'Apple' };
const PEAR: Fruit = { id: 'f2', name: 'Pear' };
const MANGO: Fruit = { id: 'f3', name: 'Mango' };

@Component({
	selector: 'test-host',
	imports: [ItemSelectorComponent, ReactiveFormsModule, TuiRoot],
	template: `
		<tui-root>
			<app-item-selector
				[formControl]="control"
				[items]="items()"
				[labelIcon]="Tag01Icon"
				[loading]="loading()"
				[multiple]="multiple()"
				[stringify]="stringify"
				label="Fruits"
				placeholder="Pick fruits"
			/>
		</tui-root>
	`,
})
class TestHostComponent {
	readonly Tag01Icon = Tag01Icon;
	readonly control = new FormControl<Fruit | Fruit[] | null>(null);
	readonly items = signal<Fruit[]>([APPLE, PEAR, MANGO]);
	readonly loading = signal(false);
	readonly multiple = signal(true);
	readonly stringify = (fruit: Fruit): string => fruit.name;
}

describe('ItemSelectorComponent', () => {
	let fixture: ComponentFixture<TestHostComponent>;
	let host: TestHostComponent;
	let selector: ItemSelectorComponent<Fruit>;

	function setup(): void {
		TestBed.configureTestingModule({
			imports: [TestHostComponent],
			providers: [translationProvider(), provideTaiga()],
		});

		fixture = TestBed.createComponent(TestHostComponent);
		host = fixture.componentInstance;
		fixture.detectChanges();

		selector = fixture.debugElement.query((el) => el.componentInstance instanceof ItemSelectorComponent)
			.componentInstance as ItemSelectorComponent<Fruit>;
	}

	beforeEach(() => setup());

	it('renders the provided label', () => {
		const label = fixture.nativeElement.querySelector('label');

		expect(label).toBeTruthy();
		expect(label.textContent).toContain('Fruits');
		expect(label.querySelector('hugeicons-icon')).toBeTruthy();
	});

	it('shows loaded selectable items inside the opened dropdown', () => {
		const dropdownOpen = fixture.debugElement
			.query(By.directive(TuiTextfieldComponent))
			.injector.get(TuiDropdownOpen);

		dropdownOpen.open.update(() => true);
		fixture.detectChanges();

		const optionText = fixture.nativeElement.textContent as string;

		expect(optionText).toContain('Apple');
		expect(optionText).toContain('Pear');
		expect(optionText).toContain('Mango');
	});

	it('renders selected items as chips in multiple mode', () => {
		host.control.setValue([APPLE, PEAR]);
		fixture.detectChanges();

		const chips = fixture.nativeElement.querySelectorAll('tui-input-chip');

		expect(chips.length).toBe(2);
		expect(chips[0].textContent).toContain('Apple');
		expect(chips[1].textContent).toContain('Pear');
	});

	it('writes form values into the selection display', () => {
		host.control.setValue([MANGO]);
		fixture.detectChanges();

		expect(selector.control.value).toEqual([MANGO]);
	});

	it('emits the selected array to the bound control in multiple mode', () => {
		selector.control.setValue([APPLE, MANGO]);

		expect(host.control.value).toEqual([APPLE, MANGO]);
	});

	it('emits the selected item itself in single mode', () => {
		host.multiple.set(false);
		fixture.detectChanges();

		selector.control.setValue(PEAR);

		expect(host.control.value).toBe(PEAR);
	});

	it('disables selection and shows loading text while loading', () => {
		host.loading.set(true);
		fixture.detectChanges();

		expect(selector.control.disabled).toBe(true);

		const input = fixture.nativeElement.querySelector('input');

		expect(input.placeholder).toBe('Loading...');
		expect(fixture.nativeElement.querySelector('tui-textfield').getAttribute('aria-busy')).toBe('true');
	});

	it('restores the placeholder and enables selection when loading finishes', () => {
		host.loading.set(true);
		fixture.detectChanges();

		host.loading.set(false);
		fixture.detectChanges();

		expect(selector.control.enabled).toBe(true);
		expect(fixture.nativeElement.querySelector('input').placeholder).toBe('Pick fruits');
	});

	it('keeps selection when disabled through the bound form control', () => {
		host.control.setValue([APPLE]);
		fixture.detectChanges();

		host.control.disable();
		fixture.detectChanges();

		expect(selector.control.disabled).toBe(true);
		expect(selector.control.value).toEqual([APPLE]);

		host.control.enable();
		fixture.detectChanges();

		expect(selector.control.enabled).toBe(true);
	});
});
