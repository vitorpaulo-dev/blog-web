import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PLATFORM_ID } from '@angular/core';
import { of, Subject } from 'rxjs';
import { vi } from 'vitest';
import { signal } from '@angular/core';
import { AudioPlayerComponent, STICKY_TOP } from './audio-player.component';
import { AudioService } from '../data-access/audio.service';
import { LanguageService } from '../../../core/i18n/language.service';
import { PostAudioDto } from '../data-access/post.service';
import { translationProvider } from '../../../core/i18n/testing';

describe('AudioPlayerComponent', () => {
  let fixture: ComponentFixture<AudioPlayerComponent>;
  let component: AudioPlayerComponent;
  let audioServiceMock: { signArtifacts: ReturnType<typeof vi.fn> };
  let languageSignal: ReturnType<typeof signal>;

  function setup(audio: PostAudioDto, language: 'ENGLISH' | 'PORTUGUESE' = 'ENGLISH') {
    languageSignal = signal(language);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));
    audioServiceMock = { signArtifacts: vi.fn().mockReturnValue(of({ 'post/audio/NARRATION-ENGLISH.wav': 'https://signed/narration-en', 'post/audio/PODCAST-ENGLISH.wav': 'https://signed/podcast-en' })) };

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [AudioPlayerComponent],
      providers: [
        { provide: AudioService, useValue: audioServiceMock },
        { provide: PLATFORM_ID, useValue: 'browser' },
        { provide: LanguageService, useValue: { language: languageSignal } },
        translationProvider(),
      ],
    });

    fixture = TestBed.createComponent(AudioPlayerComponent);
    fixture.componentRef.setInput('audio', audio);
    component = fixture.componentInstance;
  }



  function stubAudioState(audio: HTMLAudioElement, state: { readyState?: number; duration?: number }) {
    if (state.readyState !== undefined) {
      Object.defineProperty(audio, 'readyState', { configurable: true, value: state.readyState });
    }
    if (state.duration !== undefined) {
      Object.defineProperty(audio, 'duration', { configurable: true, value: state.duration });
    }
  }

  function seekState(component: AudioPlayerComponent): number | null {
    return (component as unknown as { pendingSeekFraction: number | null }).pendingSeekFraction;
  }

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders nothing when no artifact is READY for the active language', () => {
    setup({
      NARRATION: {
        ENGLISH: { status: 'GENERATING', key: 'post/audio/NARRATION-ENGLISH.wav', progress: 40 },
      },
    });
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('section')).toBeNull();
  });

  it('binds narration button aria-pressed from the default LanguageService language', () => {
    setup({
      NARRATION: {
        ENGLISH: { status: 'READY', key: 'post/audio/NARRATION-ENGLISH.wav' },
        PORTUGUESE: { status: 'READY', key: 'post/audio/NARRATION-PORTUGUESE.wav' },
      },
      PODCAST: {
        ENGLISH: { status: 'READY', key: 'post/audio/PODCAST-ENGLISH.wav' },
      },
    });
    fixture.detectChanges();

    expect(component.playableTypes()).toEqual(['NARRATION', 'PODCAST']);
    expect(component.currentType()).toBe('NARRATION');

    const button = fixture.nativeElement.querySelector('button[aria-pressed]');
    expect(button?.getAttribute('aria-pressed')).toBe('true');
  });

  it('switches URL when the podcast version button is selected', () => {
    setup({
      NARRATION: { ENGLISH: { status: 'READY', key: 'post/audio/NARRATION-ENGLISH.wav' } },
      PODCAST: { ENGLISH: { status: 'READY', key: 'post/audio/PODCAST-ENGLISH.wav' } },
    });
    fixture.detectChanges();

    component.selectType('PODCAST');
    fixture.detectChanges();
    fixture.detectChanges();

    expect(component.currentType()).toBe('PODCAST');
    expect(audioServiceMock.signArtifacts).toHaveBeenCalled();
  });

  it('disables playback until the hidden audio is ready', () => {
    setup({
      NARRATION: {
        ENGLISH: { status: 'READY', key: 'post/audio/NARRATION-ENGLISH.wav' },
      },
    });
    fixture.detectChanges();

    const playButton = fixture.nativeElement.querySelector('button.pap-play') as HTMLButtonElement;
    expect(playButton).not.toBeNull();
    expect(playButton.disabled).toBe(true);
    expect(fixture.nativeElement.querySelector('section')?.getAttribute('data-buffering')).toBe('true');
    expect(fixture.nativeElement.querySelector('section')?.getAttribute('data-playing')).toBe('false');

    component.onCanPlay();
    fixture.detectChanges();

    expect(playButton.disabled).toBe(false);
    expect(fixture.nativeElement.querySelector('section')?.getAttribute('data-buffering')).toBe('false');
  });

  it('displays one filled waveform layer clipped by the progress variable', () => {
    setup({
      NARRATION: {
        ENGLISH: { status: 'READY', key: 'post/audio/NARRATION-ENGLISH.wav' },
      },
    });
    fixture.detectChanges();

    const section = fixture.nativeElement.querySelector('section') as HTMLElement;
    const fills = fixture.nativeElement.querySelectorAll('.pap-bars-fill');

    expect(fills.length).toBe(1);
    expect(section.style.getPropertyValue('--p')).toBe('0');
  });

  it('marks the player sticky within the top offset while playing', () => {
    setup({
      NARRATION: {
        ENGLISH: { status: 'READY', key: 'post/audio/NARRATION-ENGLISH.wav' },
      },
    });
    fixture.detectChanges();

    const section = fixture.nativeElement.querySelector('section') as HTMLElement;

    expect(section.getAttribute('data-sticky')).toBe('false');

    component.playing.set(true);
    fixture.detectChanges();

    expect(section.getAttribute('data-sticky')).toBe('true');
    expect(STICKY_TOP).toBe('1.25rem');
  });

  it('buffers a seek clicked before metadata is ready and applies it on loadedmetadata instead of restarting', () => {
    setup({
      NARRATION: {
        ENGLISH: { status: 'READY', key: 'post/audio/NARRATION-ENGLISH.wav' },
      },
    });
    fixture.detectChanges();

    const audio = fixture.nativeElement.querySelector('audio') as HTMLAudioElement;
    stubAudioState(audio, { readyState: 0, duration: NaN });
    const loadSpy = vi.spyOn(audio, 'load').mockImplementation(() => undefined);
    const currentTimeBefore = audio.currentTime;
    const seekInput = fixture.nativeElement.querySelector('input.pap-seek') as HTMLInputElement;

    seekInput.value = '60';
    seekInput.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(component.disabled()).toBe(true);
    expect(audio.currentTime).toBe(currentTimeBefore);
    expect(loadSpy).not.toHaveBeenCalled();

    stubAudioState(audio, { readyState: 1, duration: 200 });
    component.onLoadedMetadata();
    fixture.detectChanges();

    expect(audio.currentTime).toBe(120);
    expect(component.currentTime()).toBe(120);
    expect(seekState(component)).toBeNull();
  });

  it('seeks to the clicked position when the audio is ready', () => {
    setup({
      NARRATION: {
        ENGLISH: { status: 'READY', key: 'post/audio/NARRATION-ENGLISH.wav' },
      },
    });
    fixture.detectChanges();

    const audio = fixture.nativeElement.querySelector('audio') as HTMLAudioElement;
    stubAudioState(audio, { readyState: 3, duration: 200 });
    component.onLoadedMetadata();
    component.onCanPlay();
    fixture.detectChanges();

    const seekInput = fixture.nativeElement.querySelector('input.pap-seek') as HTMLInputElement;
    seekInput.value = '80';
    seekInput.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(audio.currentTime).toBe(80);
    expect(component.currentTime()).toBe(80);
    expect(seekState(component)).toBeNull();
  });

  it('clamps a ready seek to the audio duration', () => {
    setup({
      NARRATION: {
        ENGLISH: { status: 'READY', key: 'post/audio/NARRATION-ENGLISH.wav' },
      },
    });
    fixture.detectChanges();

    const audio = fixture.nativeElement.querySelector('audio') as HTMLAudioElement;
    stubAudioState(audio, { readyState: 3, duration: 100 });
    component.onLoadedMetadata();
    component.onCanPlay();
    fixture.detectChanges();

    const seekInput = fixture.nativeElement.querySelector('input.pap-seek') as HTMLInputElement;
    seekInput.value = '180';
    seekInput.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(audio.currentTime).toBe(100);
  });

  it('clears a pending seek when the source changes', () => {
    setup({
      NARRATION: { ENGLISH: { status: 'READY', key: 'post/audio/NARRATION-ENGLISH.wav' } },
      PODCAST: { ENGLISH: { status: 'READY', key: 'post/audio/PODCAST-ENGLISH.wav' } },
    });
    fixture.detectChanges();

    const audio = fixture.nativeElement.querySelector('audio') as HTMLAudioElement;
    stubAudioState(audio, { readyState: 0, duration: NaN });
    const seekInput = fixture.nativeElement.querySelector('input.pap-seek') as HTMLInputElement;
    seekInput.value = '60';
    seekInput.dispatchEvent(new Event('input'));

    expect(seekState(component)).toBe(0.6);

    component.selectType('PODCAST');
    fixture.detectChanges();

    expect(seekState(component)).toBeNull();
  });

  it('no-ops skip when podcast duration is not yet finite instead of resetting to start', () => {
    setup({
      PODCAST: { ENGLISH: { status: 'READY', key: 'post/audio/PODCAST-ENGLISH.wav' } },
    });
    fixture.detectChanges();

    const audio = fixture.nativeElement.querySelector('audio') as HTMLAudioElement;
    stubAudioState(audio, { readyState: 0, duration: NaN });
    component.canPlay.set(true);
    component.currentTime.set(45);

    component.skipForward();
    component.skipBack();

    expect(audio.currentTime).toBe(0);
    expect(component.currentTime()).toBe(45);

    stubAudioState(audio, { readyState: 3, duration: 300 });
    Object.defineProperty(audio, 'currentTime', { configurable: true, writable: true, value: 20 });

    component.skipForward();

    expect(audio.currentTime).toBe(30);
    expect(component.currentTime()).toBe(30);
  });

  it('clamps skips to the element bounds instead of resetting', () => {
    setup({
      PODCAST: { ENGLISH: { status: 'READY', key: 'post/audio/PODCAST-ENGLISH.wav' } },
    });
    fixture.detectChanges();

    const audio = fixture.nativeElement.querySelector('audio') as HTMLAudioElement;
    stubAudioState(audio, { readyState: 3, duration: 100 });
    component.canPlay.set(true);

    Object.defineProperty(audio, 'currentTime', { configurable: true, writable: true, value: 95 });
    component.skipForward();
    expect(audio.currentTime).toBe(100);

    Object.defineProperty(audio, 'currentTime', { configurable: true, writable: true, value: 5 });
    component.skipBack();
    expect(audio.currentTime).toBe(0);
  });

  it('does not write a seek into the stale narration element while podcast is loading and applies it on the podcast source', () => {
    const signSubject = new Subject<Record<string, string>>();

    setup({
      NARRATION: { ENGLISH: { status: 'READY', key: 'post/audio/NARRATION-ENGLISH.wav' } },
      PODCAST: { ENGLISH: { status: 'READY', key: 'post/audio/PODCAST-ENGLISH.wav' } },
    });

    audioServiceMock.signArtifacts.mockImplementation((artifacts: { key?: string | null }[]) =>
      artifacts.some((artifact) => artifact.key === 'post/audio/PODCAST-ENGLISH.wav')
        ? signSubject.asObservable()
        : of({ 'post/audio/NARRATION-ENGLISH.wav': 'https://signed/narration-en' }),
    );
    fixture.detectChanges();

    const audio = fixture.nativeElement.querySelector('audio') as HTMLAudioElement;
    expect(audio.getAttribute('data-key')).toBe('post/audio/NARRATION-ENGLISH.wav');
    stubAudioState(audio, { readyState: 3, duration: 100 });
    component.onCanPlay();

    component.selectType('PODCAST');
    fixture.detectChanges();

    const seekInput = fixture.nativeElement.querySelector('input.pap-seek') as HTMLInputElement;
    seekInput.value = '60';
    seekInput.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(audio.currentTime).toBe(0);
    expect(seekState(component)).toBe(0.6);

    signSubject.next({
      'post/audio/PODCAST-ENGLISH.wav': 'https://signed/podcast-en',
    });
    fixture.detectChanges();

    expect(audio.getAttribute('data-key')).toBe('post/audio/PODCAST-ENGLISH.wav');
    stubAudioState(audio, { readyState: 1, duration: 200 });
    component.onLoadedMetadata();

    expect(audio.currentTime).toBe(120);
    expect(component.currentTime()).toBe(120);
    expect(seekState(component)).toBeNull();
  });

  it('does not reload the audio element when the key is unchanged but the input payload is refreshed', () => {
    setup({
      PODCAST: { ENGLISH: { status: 'READY', key: 'post/audio/PODCAST-ENGLISH.wav' } },
    });
    fixture.detectChanges();

    const audio = fixture.nativeElement.querySelector('audio') as HTMLAudioElement;
    const loadSpy = vi.spyOn(audio, 'load');
    const callsAfterFirstLoad = loadSpy.mock.calls.length;
    const signCallsAfterFirst = audioServiceMock.signArtifacts.mock.calls.length;

    fixture.componentRef.setInput('audio', {
      PODCAST: { ENGLISH: { status: 'READY', key: 'post/audio/PODCAST-ENGLISH.wav' } },
    });
    fixture.detectChanges();
    fixture.detectChanges();

    expect(loadSpy.mock.calls.length).toBe(callsAfterFirstLoad);
    expect(audioServiceMock.signArtifacts.mock.calls.length).toBe(signCallsAfterFirst);
  });

  it('applies the clicked fraction of the element duration when the seek max is stale on a long podcast', () => {
    setup({
      PODCAST: { ENGLISH: { status: 'READY', key: 'post/audio/PODCAST-ENGLISH.wav' } },
    });
    fixture.detectChanges();

    const audio = fixture.nativeElement.querySelector('audio') as HTMLAudioElement;
    stubAudioState(audio, { readyState: 3, duration: 300 });
    component.canPlay.set(true);

    expect(component.maxSeek()).toBe(100);

    const seekInput = fixture.nativeElement.querySelector('input.pap-seek') as HTMLInputElement;
    seekInput.value = '80';
    seekInput.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(audio.currentTime).toBeCloseTo(240, 5);
    expect(component.currentTime()).toBeCloseTo(240, 5);
    expect(seekState(component)).toBeNull();
  });

  it('syncs the seek timeline from durationchange when metadata duration is not finite yet', () => {
    setup({
      PODCAST: { ENGLISH: { status: 'READY', key: 'post/audio/PODCAST-ENGLISH.wav' } },
    });
    fixture.detectChanges();

    const audio = fixture.nativeElement.querySelector('audio') as HTMLAudioElement;
    stubAudioState(audio, { readyState: 1, duration: Number.POSITIVE_INFINITY });
    component.onLoadedMetadata();

    expect(component.duration()).toBe(0);
    expect(component.maxSeek()).toBe(100);

    stubAudioState(audio, { readyState: 1, duration: 300 });
    component.onDurationChange();
    fixture.detectChanges();

    expect(component.duration()).toBe(300);
    expect(component.maxSeek()).toBe(300);

    component.canPlay.set(true);

    const seekInput = fixture.nativeElement.querySelector('input.pap-seek') as HTMLInputElement;
    seekInput.value = '150';
    seekInput.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(audio.currentTime).toBe(150);
    expect(component.currentTime()).toBe(150);
    expect(component.maxSeek()).toBe(300);
  });
});
