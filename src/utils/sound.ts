/**
 * Studio Sound Manager for CODE NAMES — ELITE CLASH.
 * Preloads studio-mastered WAV audio files from `/sounds/*.wav` into Web Audio API AudioBuffers,
 * with volume control (0..1), mute state, anti-overlap voice stealing, and synthesized fallback
 * for headless/offline environments.
 */

export type SoundCue =
  | 'card-flip'
  | 'clue-declared'
  | 'reveal-correct'
  | 'reveal-neutral'
  | 'reveal-opponent'
  | 'reveal-black'
  | 'turn-change'
  | 'near-victory'
  | 'time-up'
  | 'victory';

const SOUND_CUE_FILES: Record<SoundCue, string> = {
  'card-flip': '/sounds/card-flip.wav',
  'clue-declared': '/sounds/clue-declared.wav',
  'reveal-correct': '/sounds/reveal-correct.wav',
  'reveal-neutral': '/sounds/reveal-neutral.wav',
  'reveal-opponent': '/sounds/reveal-opponent.wav',
  'reveal-black': '/sounds/reveal-black.wav',
  'turn-change': '/sounds/turn-change.wav',
  'near-victory': '/sounds/near-victory.wav',
  'time-up': '/sounds/time-up.wav',
  'victory': '/sounds/victory.wav',
};

// Minimum interval (ms) before the exact same cue can re-trigger (prevents audio spam/clipping)
const CUE_COOLDOWN_MS: Record<SoundCue, number> = {
  'card-flip': 60,
  'clue-declared': 350,
  'reveal-correct': 120,
  'reveal-neutral': 120,
  'reveal-opponent': 150,
  'reveal-black': 500,
  'turn-change': 250,
  'near-victory': 600,
  'time-up': 500,
  'victory': 800,
};

// Exclusive stinger group: starting one of these stops any currently playing stinger so cues never clash
const EXCLUSIVE_STINGERS = new Set<SoundCue>([
  'clue-declared',
  'reveal-black',
  'near-victory',
  'time-up',
  'victory',
]);

class SoundManager {
  private ctx: AudioContext | null = null;
  private buffers = new Map<SoundCue, AudioBuffer>();
  private htmlAudioPool = new Map<SoundCue, HTMLAudioElement>();
  private lastPlayedAt = new Map<SoundCue, number>();
  private activeStingerSource: AudioBufferSourceNode | null = null;
  private activeStingerHtml: HTMLAudioElement | null = null;
  private preloadStarted = false;
  private preloadedCount = 0;
  private masterVolume = 0.85;
  private muted = false;

  constructor() {
    if (typeof window !== 'undefined') {
      try {
        const savedVol = localStorage.getItem('elite_clash_sound_volume');
        if (savedVol !== null) {
          const parsed = Number(savedVol);
          if (!Number.isNaN(parsed)) {
            this.masterVolume = Math.max(0, Math.min(1, parsed));
          }
        }
      } catch {
        // ignore storage errors
      }
    }
  }

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  /**
   * Preloads all 10 studio WAV assets from `/sounds/*.wav`.
   */
  public async preloadAll(): Promise<void> {
    if (typeof window === 'undefined' || this.preloadStarted) return;
    this.preloadStarted = true;

    const entries = Object.entries(SOUND_CUE_FILES) as Array<[SoundCue, string]>;
    await Promise.allSettled(
      entries.map(async ([cue, url]) => {
        try {
          // Prepare HTMLAudioElement as immediate fallback
          if (typeof Audio !== 'undefined') {
            const audioEl = new Audio(url);
            audioEl.preload = 'auto';
            this.htmlAudioPool.set(cue, audioEl);
          }

          const res = await fetch(url);
          if (!res.ok) return;
          const arrayBuffer = await res.arrayBuffer();
          const ctx = this.getContext();
          if (ctx) {
            const decoded = await ctx.decodeAudioData(arrayBuffer);
            this.buffers.set(cue, decoded);
            this.preloadedCount += 1;
          }
        } catch {
          // Fallback synth handles environments where audio decoding is restricted
        }
      })
    );
  }

  public setVolume(vol: number) {
    this.masterVolume = Math.max(0, Math.min(1, vol));
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('elite_clash_sound_volume', String(this.masterVolume));
      } catch {
        // ignore
      }
    }
  }

  public getVolume(): number {
    return this.masterVolume;
  }

  public setMuted(muted: boolean) {
    this.muted = muted;
    if (muted) {
      this.stopActiveStingers();
    }
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public getPreloadedCount(): number {
    return this.preloadedCount || this.htmlAudioPool.size;
  }

  public stopActiveStingers() {
    if (this.activeStingerSource) {
      try {
        this.activeStingerSource.stop();
      } catch {
        // ignore
      }
      this.activeStingerSource = null;
    }
    if (this.activeStingerHtml) {
      try {
        this.activeStingerHtml.pause();
        this.activeStingerHtml.currentTime = 0;
      } catch {
        // ignore
      }
      this.activeStingerHtml = null;
    }
  }

  public playCue(cue: SoundCue, enabled: boolean = true) {
    if (!enabled || this.muted || this.masterVolume <= 0.01) return;
    if (!this.preloadStarted) {
      this.preloadAll().catch(() => {});
    }

    const nowMs = Date.now();
    const lastMs = this.lastPlayedAt.get(cue) || 0;
    if (nowMs - lastMs < CUE_COOLDOWN_MS[cue]) {
      return; // Prevent rapid overlapping of identical sound cue
    }
    this.lastPlayedAt.set(cue, nowMs);

    if (EXCLUSIVE_STINGERS.has(cue)) {
      this.stopActiveStingers();
    }

    const ctx = this.getContext();
    const buffer = this.buffers.get(cue);
    if (ctx && buffer) {
      try {
        const source = ctx.createBufferSource();
        const gainNode = ctx.createGain();
        source.buffer = buffer;
        gainNode.gain.setValueAtTime(this.masterVolume, ctx.currentTime);
        source.connect(gainNode);
        gainNode.connect(ctx.destination);
        if (EXCLUSIVE_STINGERS.has(cue)) {
          this.activeStingerSource = source;
          source.onended = () => {
            if (this.activeStingerSource === source) {
              this.activeStingerSource = null;
            }
          };
        }
        source.start(0);
        return;
      } catch {
        // fallback below
      }
    }

    const htmlAudio = this.htmlAudioPool.get(cue);
    if (htmlAudio) {
      try {
        htmlAudio.currentTime = 0;
        htmlAudio.volume = this.masterVolume;
        if (EXCLUSIVE_STINGERS.has(cue)) {
          this.activeStingerHtml = htmlAudio;
        }
        htmlAudio.play().catch(() => {
          this.playFallbackTone(cue);
        });
        return;
      } catch {
        // fallback below
      }
    }

    this.playFallbackTone(cue);
  }

  private playFallbackTone(cue: SoundCue) {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const vol = 0.16 * this.masterVolume;

    switch (cue) {
      case 'card-flip':
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(280, now);
        osc.frequency.exponentialRampToValueAtTime(520, now + 0.06);
        gain.gain.setValueAtTime(vol, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.075);
        break;
      case 'reveal-correct':
      case 'victory':
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, now);
        osc.frequency.exponentialRampToValueAtTime(783.99, now + 0.22);
        gain.gain.setValueAtTime(vol, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.26);
        break;
      case 'reveal-black':
      case 'time-up':
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.exponentialRampToValueAtTime(58, now + 0.42);
        gain.gain.setValueAtTime(vol * 1.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.46);
        break;
      default:
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(587.33, now + 0.18);
        gain.gain.setValueAtTime(vol, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.21);
        break;
    }
  }

  // Backward-compatible helper methods
  public playCardFlip(enabled: boolean) {
    this.playCue('card-flip', enabled);
  }
  public playCorrectReveal(enabled: boolean) {
    this.playCue('reveal-correct', enabled);
  }
  public playNeutralReveal(enabled: boolean) {
    this.playCue('reveal-neutral', enabled);
  }
  public playOpponentReveal(enabled: boolean) {
    this.playCue('reveal-opponent', enabled);
  }
  public playBlackCardReveal(enabled: boolean) {
    this.playCue('reveal-black', enabled);
  }
  public playVictory(enabled: boolean) {
    this.playCue('victory', enabled);
  }
  public playClueDeclared(enabled: boolean) {
    this.playCue('clue-declared', enabled);
  }
  public playTurnChange(enabled: boolean) {
    this.playCue('turn-change', enabled);
  }
  public playNearVictory(enabled: boolean) {
    this.playCue('near-victory', enabled);
  }
  public playTimeUp(enabled: boolean) {
    this.playCue('time-up', enabled);
  }
}

export const soundFX = new SoundManager();
