import { Component, effect, forwardRef, inject, input, output, signal } from '@angular/core';
import { ControlValueAccessor, FormControl, NG_VALUE_ACCESSOR, ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TuiFilterByInputPipe, TuiTextfield } from '@taiga-ui/core';
import { TuiChevron, TuiDataListWrapper, TuiInputChip, TuiMultiSelect, TuiSelect } from '@taiga-ui/kit';
import { HugeiconsIconComponent, IconSvgObject } from '@hugeicons/angular';

import { TranslatePipe } from '../../../core/i18n/translate.pipe';

@Component({
	selector: 'app-item-selector',
	standalone: true,
	imports: [
		ReactiveFormsModule,
		TuiTextfield,
		TuiFilterByInputPipe,
		TuiChevron,
		TuiDataListWrapper,
		TuiInputChip,
		TuiMultiSelect,
		TuiSelect,
		HugeiconsIconComponent,
		TranslatePipe,
	],
	providers: [
		{
			provide: NG_VALUE_ACCESSOR,
			useExisting: forwardRef(() => ItemSelectorComponent),
			multi: true,
		},
	],
	template: `
		@if (multiple()) {
			<tui-textfield multi tuiChevron [stringify]="stringify()" [attr.aria-busy]="loading()">
				@if (label()) {
					<label tuiLabel class="flex items-center gap-1.5">
						@if (labelIcon()) {
							<hugeicons-icon [icon]="labelIcon()!" [size]="16" [strokeWidth]="2.5" />
						}
						<span>{{ label() }}</span>
					</label>
				}

				<input
					tuiInputChip
					[formControl]="control"
					[placeholder]="loading() ? ('common.loading' | translate) : placeholder()"
					(blur)="onTouched()"
					(input)="onSearchInput($event)"
				/>

				<tui-input-chip *tuiItem />

				<tui-data-list-wrapper
					*tuiDropdown
					tuiMultiSelectGroup
					[items]="remoteSearch() ? items() : (items() | tuiFilterByInput)"
					[itemContent]="itemTemplate"
				/>
			</tui-textfield>
		} @else {
			<tui-textfield tuiChevron [stringify]="stringify()" [attr.aria-busy]="loading()">
				@if (label()) {
					<label tuiLabel class="flex items-center gap-1.5">
						@if (labelIcon()) {
							<hugeicons-icon [icon]="labelIcon()!" [size]="16" [strokeWidth]="2.5" />
						}
						<span>{{ label() }}</span>
					</label>
				}

				<input
					tuiSelect
					[formControl]="control"
					[placeholder]="loading() ? ('common.loading' | translate) : placeholder()"
					(blur)="onTouched()"
					(input)="onSearchInput($event)"
				/>

				<tui-data-list-wrapper *tuiDropdown [itemContent]="itemTemplate" [items]="items()" />
			</tui-textfield>
		}

		<ng-template #itemTemplate let-item>{{ stringify()($any(item)) }}</ng-template>
	`,
})
export class ItemSelectorComponent<T = unknown> implements ControlValueAccessor {
	readonly items = input<readonly T[]>([]);
	readonly loading = input(false);
	readonly multiple = input(true);
	readonly remoteSearch = input(false);
	readonly stringify = input.required<(item: T) => string>();
	readonly label = input('');
	readonly placeholder = input('');
	readonly labelIcon = input<IconSvgObject | null>(null);

	readonly search = output<string>();

	readonly control = new FormControl<T | T[] | null>(null);

	private readonly externallyDisabled = signal(false);

	constructor() {
		this.control.valueChanges.pipe(takeUntilDestroyed()).subscribe((value) => this.onChange(value));

		effect(() => {
			const disabled = this.loading() || this.externallyDisabled();

			if (disabled && !this.control.disabled) {
				this.control.disable({ emitEvent: false });
			} else if (!disabled && this.control.disabled) {
				this.control.enable({ emitEvent: false });
			}
		});
	}

	onChange: (value: T | T[] | null) => void = () => {};
	onTouched: () => void = () => {};

	onSearchInput(event: Event): void {
		this.search.emit((event.target as HTMLInputElement).value);
	}

	writeValue(value: T | T[] | null): void {
		this.control.setValue(value, { emitEvent: false });
	}

	registerOnChange(fn: (value: T | T[] | null) => void): void {
		this.onChange = fn;
	}

	registerOnTouched(fn: () => void): void {
		this.onTouched = fn;
	}

	setDisabledState(isDisabled: boolean): void {
		this.externallyDisabled.set(isDisabled);
	}
}
