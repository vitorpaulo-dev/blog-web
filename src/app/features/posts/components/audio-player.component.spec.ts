import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PLATFORM_ID } from '@angular/core';
import { of } from 'rxjs';
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
});
