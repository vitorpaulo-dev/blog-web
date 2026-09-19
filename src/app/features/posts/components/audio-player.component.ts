import {
	afterNextRender,
	Component,
	computed,
	DestroyRef,
	effect,
	ElementRef,
	inject,
	input,
	PLATFORM_ID,
	signal,
	viewChild,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HugeiconsIconComponent } from '@hugeicons/angular';
import {
	HeadphonesIcon,
	HeadsetIcon,
	Mic01Icon,
	PauseIcon,
	PlayIcon,
	RotateLeft01Icon,
	RotateRight01Icon,
	VolumeHighIcon,
	VolumeMute02Icon,
} from '@hugeicons/core-free-icons';
import { TuiAppearance, TuiButton } from '@taiga-ui/core';

import { AudioType, Language, PostAudioDto } from '../data-access/post.service';
import { AudioService } from '../data-access/audio.service';
import { LanguageService } from '../../../core/i18n/language.service';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';

const PLAYBACK_RATES = [1, 1.25, 1.5, 2, 0.75];
const WAVE_BARS = 64;
export const STICKY_TOP = '1.25rem';

@Component({
	selector: 'app-audio-player',
	standalone: true,
	imports: [HugeiconsIconComponent, TranslatePipe, TuiButton, TuiAppearance],
	styles: `
		.pap {
			--sticky-top: ${STICKY_TOP};
			font-family: 'Schibsted Grotesk', var(--font-sans, ui-sans-serif), system-ui, sans-serif;
		}

		.pap[data-sticky='true'] {
			position: sticky;
			top: var(--sticky-top);
			z-index: 30;
		}

		.pap[data-sticky='true']:not(:hover):not(:focus-within) {
			opacity: 0.68;
			padding: 0.5rem;
		}

		.pap[data-sticky='true']:not(:hover):not(:focus-within) .pap-head {
			position: absolute;
			left: 0.5rem;
			top: 50%;
			z-index: 20;
			width: auto;
			min-height: 0;
			transform: translateY(-50%);
			pointer-events: none;
		}

		.pap[data-sticky='true']:not(:hover):not(:focus-within) .pap-head-main {
			flex: none;
		}

		.pap[data-sticky='true']:not(:hover):not(:focus-within) .pap-head-main > span,
		.pap[data-sticky='true']:not(:hover):not(:focus-within) .pap-type-switch,
		.pap[data-sticky='true']:not(:hover):not(:focus-within) .pap-times,
		.pap[data-sticky='true']:not(:hover):not(:focus-within) .pap-ctrl {
			display: none;
		}

		.pap[data-sticky='true']:not(:hover):not(:focus-within) .pap-scrub {
			margin-top: 0;
			margin-left: 1.8rem;
		}

		.pap[data-sticky='true']:not(:hover):not(:focus-within) .pap-bars {
			height: 2rem;
		}

		@media (prefers-reduced-motion: no-preference) {
			.pap {
				transition:
					opacity 180ms ease,
					padding 180ms ease,
					box-shadow 180ms ease,
					transform 180ms ease;
			}
		}

		.pap button:not(:disabled),
		.pap input[type='range']:not(:disabled) {
			cursor: pointer !important;
		}

		.pap-bars-fill {
			position: absolute;
			inset: 0;
			clip-path: inset(0 calc((1 - var(--p, 0)) * 100%) 0 0);
			will-change: clip-path;
			pointer-events: none;
		}

		.pap-bar {
			transition: height 120ms ease;
		}

		.pap-seek {
			appearance: none;
			-webkit-appearance: none;
		}

		.pap-seek::-webkit-slider-thumb {
			appearance: none;
			width: 1px;
			height: 1px;
		}

		.pap-seek::-moz-range-thumb {
			width: 1px;
			height: 1px;
			border: 0;
		}

		.pap[data-buffering='true'] .pap-ring {
			animation: pap-pulse 1.2s ease-in-out infinite;
		}

		@keyframes pap-pulse {
			0%,
			100% {
				opacity: 1;
			}

			50% {
				opacity: 0.35;
			}
		}
	`,
	template: `
		@if (visible()) {
			<section
				class="pap relative mt-4 min-w-0 rounded-xl border border-border bg-surface p-3 shadow-sm transition-all duration-200 ease-out max-[480px]:p-3"
				[style.--p]="progressFraction()"
				[attr.data-playing]="playing()"
				[attr.data-buffering]="buffering()"
				[attr.data-muted]="muted()"
				[attr.data-sticky]="sticky()"
			>
				<audio
					#audioEl
					hidden
					preload="metadata"
					(loadedmetadata)="onLoadedMetadata()"
					(timeupdate)="onTimeUpdate()"
					(play)="onPlay()"
					(pause)="onPause()"
					(waiting)="onStalled()"
					(playing)="onCanPlay()"
					(canplay)="onCanPlay()"
					(canplaythrough)="onCanPlay()"
					(error)="onAudioError()"
					(ended)="onPause()"
					(volumechange)="onVolumeChange()"
				></audio>

				<div class="pap-head flex min-h-8 min-w-0 items-center gap-2">
					<div class="pap-head-main flex min-w-0 flex-1 items-center gap-2 overflow-hidden">
						<hugeicons-icon
							[icon]="HeadsetIcon"
							[size]="17"
							[strokeWidth]="2.4"
							class="shrink-0 text-accent"
						/>

						<span
							class="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-xs font-semibold uppercase tracking-widest text-muted"
						>
							Audio
						</span>
					</div>

					@if (playableTypes().length > 1) {
						<div
							class="pap-type-switch flex w-fit max-w-full shrink-0 flex-wrap items-center gap-1"
							role="group"
							[attr.aria-label]="'posts.audio.source' | translate"
						>
							@for (type of playableTypes(); track type) {
								<button
									tuiButton
									class="cursor-pointer"
									size="s"
									type="button"
									[appearance]="type === currentType() ? 'primary' : 'outline'"
									[attr.aria-pressed]="type === currentType()"
									(click)="selectType(type)"
								>
									<hugeicons-icon [icon]="typeIconOf(type)" [size]="14" [strokeWidth]="2.2" />
									{{ typeLabelOf(type) | translate }}
								</button>
							}
						</div>
					}
				</div>

				@if (error(); as message) {
					<p class="mt-2 text-sm text-red-400" role="alert">
						{{ message | translate }}
					</p>
				}

				<div class="pap-scrub relative mt-4 min-w-0">
					<div class="pap-bars relative h-10 overflow-hidden rounded-xl max-[480px]:h-11">
						<div class="flex h-full w-full items-center gap-0.5 px-0.5" aria-hidden="true">
							@for (bar of waveform(); track $index) {
								<span
									class="pap-bar min-w-0 flex-1 basis-0 rounded-full bg-muted opacity-30"
									[style.--h.%]="bar"
									[style.height.%]="bar"
									[style.max-height.%]="100"
								></span>
							} @empty {
								<span
									class="pap-bar min-w-0 flex-1 basis-0 rounded-full bg-muted opacity-30"
									style="height: 25%"
								></span>
							}
						</div>

						<div class="pap-bars-fill flex h-full w-full items-center gap-0.5 px-0.5" aria-hidden="true">
							@for (bar of waveform(); track $index) {
								<span
									class="pap-bar min-w-0 flex-1 basis-0 rounded-full bg-accent"
									[style.--h.%]="bar"
									[style.height.%]="bar"
									[style.max-height.%]="100"
								></span>
							} @empty {
								<span
									class="pap-bar min-w-0 flex-1 basis-0 rounded-full bg-accent"
									style="height: 25%"
								></span>
							}
						</div>
					</div>

					<input
						class="pap-seek absolute inset-0 z-10 m-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed disabled:opacity-45"
						type="range"
						[min]="0"
						[max]="maxSeek()"
						step="0.1"
						[value]="currentTime()"
						[attr.aria-label]="'posts.audio.seek' | translate"
						[disabled]="disabled()"
						(input)="onSeekInput($event)"
					/>

					<span
						class="pap-playhead pointer-events-none absolute top-0 bottom-0 z-[5] flex -translate-x-1/2 items-center"
						[style.left.%]="progressFraction() * 100"
						aria-hidden="true"
					>
						<span
							class="pap-ring size-2.5 rounded-full border-2 border-accent bg-surface shadow-[0_0_0_3px_color-mix(in_srgb,var(--color-accent)_20%,transparent)]"
						></span>
					</span>
				</div>

				<div class="pap-times mt-2 flex min-w-0 items-center justify-between text-xs tabular-nums text-muted">
					<span>{{ currentTimeText() }}</span>

					<span aria-hidden="true"> −{{ remainingText() }} </span>
				</div>

				<div
					class="pap-ctrl mt-3 grid min-h-12 min-w-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 max-[480px]:gap-1"
				>
					<button
						tuiButton
						size="s"
						tuiAppearance="flat"
						class="justify-self-start disabled:cursor-not-allowed disabled:opacity-45"
						[attr.aria-label]="'posts.audio.speed' | translate"
						[disabled]="disabled()"
						(click)="cycleSpeed()"
					>
						{{ speed() }}×
					</button>

					<div class="pap-main flex items-center justify-center gap-0.5">
						<button
							tuiButton
							size="m"
							tuiAppearance="flat"
							class="disabled:cursor-not-allowed disabled:opacity-45"
							[attr.aria-label]="'posts.audio.back10' | translate"
							[disabled]="disabled()"
							(click)="skipBack()"
						>
							<hugeicons-icon [icon]="RotateLeft01Icon" [size]="18" [strokeWidth]="2.5" />
						</button>

						<button
							tuiButton
							size="m"
							class="pap-play disabled:cursor-not-allowed disabled:opacity-45"
							[attr.aria-label]="(playing() ? 'posts.audio.pause' : 'posts.audio.play') | translate"
							[disabled]="disabled()"
							(click)="togglePlay()"
						>
							@if (playing()) {
								<hugeicons-icon [icon]="PauseIcon" [size]="20" [strokeWidth]="2.5" />
							} @else {
								<hugeicons-icon [icon]="PlayIcon" [size]="20" [strokeWidth]="2.5" />
							}
						</button>

						<button
							tuiButton
							size="m"
							tuiAppearance="flat"
							class="disabled:cursor-not-allowed disabled:opacity-45"
							[attr.aria-label]="'posts.audio.fwd10' | translate"
							[disabled]="disabled()"
							(click)="skipForward()"
						>
							<hugeicons-icon [icon]="RotateRight01Icon" [size]="18" [strokeWidth]="2.5" />
						</button>
					</div>

					<div class="pap-vol flex items-center justify-self-end gap-1">
						<button
							type="button"
							class="cursor-pointer rounded-lg p-2 text-muted transition-colors hover:text-accent disabled:cursor-not-allowed disabled:opacity-45"
							[attr.aria-label]="(muted() ? 'posts.audio.unmute' : 'posts.audio.mute') | translate"
							[disabled]="disabled()"
							(click)="toggleMute()"
						>
							@if (muted()) {
								<hugeicons-icon [icon]="VolumeMute02Icon" [size]="18" [strokeWidth]="2.5" />
							} @else {
								<hugeicons-icon [icon]="VolumeHighIcon" [size]="18" [strokeWidth]="2.5" />
							}
						</button>

						<input
							class="w-20 accent-accent max-[480px]:hidden disabled:cursor-not-allowed disabled:opacity-45"
							type="range"
							min="0"
							max="1"
							step="0.05"
							[value]="volume()"
							[attr.aria-label]="'posts.audio.volume' | translate"
							[disabled]="disabled()"
							(input)="setVolume($event)"
						/>
					</div>
				</div>

				<span class="sr-only" aria-live="polite">
					{{ live() | translate }}
				</span>
			</section>
		}
	`,
})
export class AudioPlayerComponent {
	readonly audio = input<PostAudioDto | undefined>();
	private readonly audioService = inject(AudioService);
	private readonly languageService = inject(LanguageService);
	private readonly platformId = inject(PLATFORM_ID);
	private readonly destroyRef = inject(DestroyRef);

	readonly isBrowser = isPlatformBrowser(this.platformId);
	readonly HeadsetIcon = HeadsetIcon;
	readonly HeadphonesIcon = HeadphonesIcon;
	readonly Mic01Icon = Mic01Icon;
	readonly PauseIcon = PauseIcon;
	readonly PlayIcon = PlayIcon;
	readonly RotateLeft01Icon = RotateLeft01Icon;
	readonly RotateRight01Icon = RotateRight01Icon;
	readonly VolumeHighIcon = VolumeHighIcon;
	readonly VolumeMute02Icon = VolumeMute02Icon;

	private readonly audioEl = viewChild<ElementRef<HTMLAudioElement>>('audioEl');

	private readonly signed = signal<string | null>(null);
	private readonly signedKey = signal<string | null>(null);
	private readonly closed = signal(false);
	private readonly cumulative = signal(0);
	private readonly selectedType = signal<AudioType | null>(null);
	private readonly failedKeys = signal<Set<string>>(new Set());

	readonly playing = signal(false);
	readonly canPlay = signal(false);
	readonly stalled = signal(false);
	readonly muted = signal(false);
	readonly volume = signal(1);
	readonly speed = signal(1);
	readonly currentTime = signal(0);
	readonly duration = signal(0);
	readonly error = signal<string | null>(null);
	readonly live = signal('posts.audio.stopped');
	readonly waveform = signal<number[]>([]);

	private lastTick: number | null = null;

	readonly language = computed<Language>(() => this.languageService.language());

	readonly playableTypes = computed<AudioType[]>(() => {
		const payload = this.audio();
		const language = this.language();
		const failedKeys = this.failedKeys();

		if (!payload) {
			return [];
		}

		return (['NARRATION', 'PODCAST'] as AudioType[]).filter((type) => {
			const artifact = payload[type]?.[language];

			return artifact?.status === 'READY' && !!artifact.key && !failedKeys.has(artifact.key);
		});
	});

	readonly visible = computed(() => this.isBrowser && !this.closed() && this.playableTypes().length > 0);

	readonly currentType = computed<AudioType>(() => {
		const types = this.playableTypes();
		const selected = this.selectedType();

		return selected && types.includes(selected) ? selected : (types[0] ?? 'NARRATION');
	});

	readonly currentKey = computed(() => {
		if (!this.visible()) {
			return null;
		}

		return this.audio()?.[this.currentType()]?.[this.language()]?.key ?? null;
	});

	readonly buffering = computed(() => !this.canPlay() || this.stalled());

	readonly disabled = computed(() => this.buffering() || this.error() !== null);

	readonly progressFraction = computed(() => {
		const duration = this.duration();
		const time = this.currentTime();

		return duration > 0 ? Math.min(1, time / duration) : 0;
	});

	readonly sticky = computed(() => this.playing() || this.cumulative() >= 10);

	readonly currentTimeText = computed(() => formatTime(this.currentTime()));

	readonly remainingText = computed(() => formatTime(Math.max(0, this.duration() - this.currentTime())));

	readonly maxSeek = computed(() => this.duration() || 100);

	constructor() {
		afterNextRender(() => this.keyboardHook());

		effect(() => {
			if (!this.isBrowser) {
				return;
			}

			const key = this.currentKey();

			if (!key || key === this.signedKey()) {
				return;
			}

			const artifact = this.audio()?.[this.currentType()]?.[this.language()];

			if (!artifact) {
				return;
			}

			this.audioService.signArtifacts([artifact]).subscribe({
				next: (urls) => {
					if (key !== this.currentKey()) {
						return;
					}

					const url = urls[key];

					if (!url) {
						this.failKey(key);
						return;
					}

					this.signed.set(url);
					this.signedKey.set(key);
					this.error.set(null);
					this.waveform.set([]);

					this.decodeWaveform(url, key);
				},
				error: () => this.failKey(key),
			});
		});

		effect(() => {
			if (!this.isBrowser) {
				return;
			}

			const element = this.audioEl()?.nativeElement;
			const key = this.currentKey();
			const url = this.signed();

			if (!element || !key || !url || this.signedKey() !== key) {
				return;
			}

			element.pause();

			this.playing.set(false);
			this.canPlay.set(false);
			this.stalled.set(false);

			element.removeAttribute('src');
			element.setAttribute('data-key', key);

			element.src = url;
			element.load();

			this.duration.set(0);
			this.currentTime.set(0);
			this.lastTick = null;
		});

		this.destroyRef.onDestroy(() => {
			const element = this.audioEl();

			if (element) {
				element.nativeElement.pause();
				element.nativeElement.removeAttribute('src');
			}
		});
	}

	typeIconOf(type: AudioType) {
		return type === 'PODCAST' ? this.HeadphonesIcon : this.Mic01Icon;
	}

	typeLabelOf(type: AudioType): string {
		return type === 'PODCAST' ? 'posts.audio.podcast' : 'posts.audio.narration';
	}

	selectType(type: AudioType): void {
		if (!this.playableTypes().includes(type)) {
			return;
		}

		if (type === this.currentType()) {
			return;
		}

		const element = this.audioEl()?.nativeElement;

		element?.pause();
		this.signed.set(null);
		this.signedKey.set(null);
		this.playing.set(false);
		this.canPlay.set(false);
		this.stalled.set(false);
		this.error.set(null);
		this.currentTime.set(0);
		this.duration.set(0);
		this.waveform.set([]);
		this.lastTick = null;
		this.selectedType.set(type);
	}

	togglePlay(): void {
		const element = this.audioEl()?.nativeElement;

		if (!element || this.disabled()) {
			return;
		}

		if (element.paused) {
			const key = this.currentKey();

			element.play().catch(() => {
				if (key === this.currentKey()) {
					this.failKey(key);
				}
			});
		} else {
			element.pause();
		}
	}

	skipBack(): void {
		if (!this.canPlay()) {
			return;
		}

		this.shiftTime(-10);
	}

	skipForward(): void {
		if (!this.canPlay()) {
			return;
		}

		this.shiftTime(10);
	}

	cycleSpeed(): void {
		const rate = PLAYBACK_RATES[(PLAYBACK_RATES.indexOf(this.speed()) + 1) % PLAYBACK_RATES.length];

		const element = this.audioEl()?.nativeElement;

		this.speed.set(rate);

		if (element) {
			element.playbackRate = rate;
		}
	}

	toggleMute(): void {
		const element = this.audioEl()?.nativeElement;

		this.muted.update((value) => !value);

		if (element) {
			element.muted = this.muted();
		}
	}

	setVolume(event: Event): void {
		const value = Number((event.target as HTMLInputElement).value);

		const element = this.audioEl()?.nativeElement;

		this.volume.set(Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 1);

		if (element) {
			element.volume = this.volume();
			element.muted = this.muted() && this.volume() > 0;
		}
	}

	onSeekInput(event: Event): void {
		if (this.disabled()) {
			return;
		}

		const time = Number((event.target as HTMLInputElement).value);

		const element = this.audioEl()?.nativeElement;

		if (!element || !Number.isFinite(time)) {
			return;
		}

		element.currentTime = time;
		this.currentTime.set(time);
		this.lastTick = null;
	}

	onCanPlay(): void {
		if (this.signed() && !this.error()) {
			this.canPlay.set(true);
			this.stalled.set(false);
		}
	}

	onStalled(): void {
		this.stalled.set(true);
	}

	onLoadedMetadata(): void {
		const element = this.audioEl()?.nativeElement;

		if (element && Number.isFinite(element.duration)) {
			this.duration.set(element.duration);
		}

		if (element) {
			element.playbackRate = this.speed();
			element.volume = this.volume();
			element.muted = this.muted();
		}
	}

	onTimeUpdate(): void {
		const element = this.audioEl()?.nativeElement;

		if (!element) {
			return;
		}

		const time = element.currentTime;

		if (this.lastTick !== null && this.playing()) {
			this.cumulative.update((total) => total + Math.max(0, time - this.lastTick!));
		}

		this.currentTime.set(time);
		this.lastTick = time;
	}

	onPlay(): void {
		this.playing.set(true);
		this.live.set('posts.audio.playing');
	}

	onPause(): void {
		this.playing.set(false);
		this.live.set('posts.audio.paused');
		this.stalled.set(false);
	}

	onVolumeChange(): void {
		const element = this.audioEl()?.nativeElement;

		if (element) {
			this.muted.set(element.muted);
		}
	}

	onAudioError(): void {
		const element = this.audioEl()?.nativeElement;
		const key = element?.getAttribute('data-key');

		if (key && key === this.currentKey() && !this.closed()) {
			this.failKey(key);
		}
	}

	private shiftTime(seconds: number): void {
		const element = this.audioEl()?.nativeElement;

		if (!element) {
			return;
		}

		const limit = element.duration || this.duration();

		const time = Math.max(0, Math.min(limit || 0, this.currentTime() + seconds));

		if (limit > 0) {
			element.currentTime = time;
		}

		this.currentTime.set(time);
		this.lastTick = null;
	}

	private failKey(key: string | null): void {
		if (key) {
			this.failedKeys.update((keys) => {
				const next = new Set(keys);
				next.add(key);
				return next;
			});
		}

		this.signed.set(null);
		this.signedKey.set(null);
		this.playing.set(false);
		this.canPlay.set(false);
		this.stalled.set(false);
		this.error.set(null);
		this.currentTime.set(0);
		this.duration.set(0);
		this.waveform.set([]);
		this.live.set('posts.audio.stopped');
	}

	private keyboardHook(): void {
		const handler = (event: KeyboardEvent) => {
			if (!this.visible() || event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) {
				return;
			}

			const target = event.target;

			if (
				target instanceof HTMLElement &&
				(target.tagName === 'INPUT' ||
					target.tagName === 'TEXTAREA' ||
					target.tagName === 'SELECT' ||
					target.isContentEditable)
			) {
				return;
			}

			switch (event.key) {
				case 'j':
				case 'J':
					this.skipBack();
					break;

				case 'k':
				case 'K':
					if (!this.disabled()) {
						event.preventDefault();
						this.togglePlay();
					}
					break;

				case 'l':
				case 'L':
					this.skipForward();
					break;

				default:
					return;
			}
		};

		this.destroyRef.onDestroy(() => window.removeEventListener('keydown', handler));

		window.addEventListener('keydown', handler);
	}

	private decodeWaveform(url: string, key: string): void {
		fetch(url)
			.then((response) => (response.ok ? response.arrayBuffer() : Promise.reject(new Error('audio-fetch'))))
			.then((buffer) => {
				const context = new AudioContext();

				return context.decodeAudioData(buffer).finally(() => context.close().catch(() => undefined));
			})
			.then((decoded) => {
				if (key !== this.currentKey() || key !== this.signedKey()) {
					return;
				}

				const channel = decoded.getChannelData(0);

				const bucket = Math.max(1, Math.floor(channel.length / WAVE_BARS));

				const bars: number[] = [];

				for (let index = 0; index < WAVE_BARS; index++) {
					let peak = 0;

					for (let offset = 0; offset < Math.min(bucket, channel.length - index * bucket); offset++) {
						const sample = Math.abs(channel[index * bucket + offset] || 0);

						if (sample > peak) {
							peak = sample;
						}
					}

					bars.push(peak);
				}

				const max = Math.max(...bars, 0.01);

				this.waveform.set(bars.map((bar) => Math.max(4, Math.round((bar / max) * 100))));
			})
			.catch(() => {
				if (key === this.currentKey() && key === this.signedKey()) {
					this.waveform.set(fallbackWaveform());
				}
			});
	}
}

function fallbackWaveform(): number[] {
	return Array.from({ length: WAVE_BARS }, (_, index) => 24 + Math.round(Math.abs(Math.sin(index * 0.55)) * 60));
}

function formatTime(seconds: number): string {
	if (!Number.isFinite(seconds)) {
		return '0:00';
	}

	const total = Math.max(0, Math.round(seconds));

	return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}
