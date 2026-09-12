export type SfxId =
  | "player_laser"
  | "enemy_laser"
  | "impact"
  | "explosion"
  | "player_hit"
  | "super"
  | "boost"
  | "gate_unlock"
  | "hyperspace"
  | "game_over";

export interface SfxOptions {
  volume?: number;
  pan?: number;
}

const MASTER_GAIN = 0.34;
const COOLDOWN_MS: Partial<Record<SfxId, number>> = {
  player_laser: 40,
  enemy_laser: 55,
  impact: 35,
  explosion: 70,
  player_hit: 90,
  boost: 220,
  gate_unlock: 400,
  hyperspace: 900,
  game_over: 2000,
};

type VoiceFn = (
  ctx: AudioContext,
  dest: AudioNode,
  noise: AudioBuffer,
) => void;

function now(ctx: AudioContext): number {
  return ctx.currentTime;
}

function envGain(
  ctx: AudioContext,
  peak: number,
  attack: number,
  duration: number,
): GainNode {
  const gain = ctx.createGain();
  const t = now(ctx);
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
  return gain;
}

function tone(
  ctx: AudioContext,
  dest: AudioNode,
  type: OscillatorType,
  startHz: number,
  endHz: number,
  duration: number,
  peak: number,
  attack = 0.006,
): void {
  const osc = ctx.createOscillator();
  const gain = envGain(ctx, peak, attack, duration);
  const t = now(ctx);
  osc.type = type;
  osc.frequency.setValueAtTime(startHz, t);
  osc.frequency.exponentialRampToValueAtTime(Math.max(20, endHz), t + duration);
  osc.connect(gain);
  gain.connect(dest);
  osc.start(t);
  osc.stop(t + duration + 0.03);
}

function noiseBurst(
  ctx: AudioContext,
  dest: AudioNode,
  noise: AudioBuffer,
  duration: number,
  peak: number,
  startHz: number,
  endHz: number,
  type: BiquadFilterType = "lowpass",
  attack = 0.004,
): void {
  const src = ctx.createBufferSource();
  src.buffer = noise;
  const filter = ctx.createBiquadFilter();
  filter.type = type;
  const t = now(ctx);
  filter.frequency.setValueAtTime(startHz, t);
  filter.frequency.exponentialRampToValueAtTime(Math.max(40, endHz), t + duration);
  filter.Q.value = 0.85;
  const gain = envGain(ctx, peak, attack, duration);
  src.connect(filter);
  filter.connect(gain);
  gain.connect(dest);
  src.start(t);
  src.stop(t + duration + 0.02);
}

function jitter(amount: number): number {
  return 1 + (Math.random() - 0.5) * amount;
}

const VOICES: Record<SfxId, VoiceFn> = {
  player_laser(ctx, dest) {
    const j = jitter(0.12);
    tone(ctx, dest, "square", 980 * j, 260 * j, 0.075, 0.16);
    tone(ctx, dest, "triangle", 1960 * j, 520 * j, 0.045, 0.05);
  },
  enemy_laser(ctx, dest) {
    const j = jitter(0.1);
    tone(ctx, dest, "sawtooth", 430 * j, 140 * j, 0.11, 0.11);
  },
  impact(ctx, dest, noise) {
    const j = jitter(0.16);
    noiseBurst(ctx, dest, noise, 0.055, 0.18, 4200 * j, 900, "bandpass");
    tone(ctx, dest, "triangle", 1680 * j, 420 * j, 0.07, 0.08);
  },
  explosion(ctx, dest, noise) {
    const j = jitter(0.14);
    noiseBurst(ctx, dest, noise, 0.42, 0.42, 1600 * j, 90, "lowpass", 0.002);
    tone(ctx, dest, "sine", 92 * j, 38, 0.28, 0.28, 0.004);
    tone(ctx, dest, "triangle", 210 * j, 55, 0.18, 0.08);
  },
  player_hit(ctx, dest, noise) {
    noiseBurst(ctx, dest, noise, 0.22, 0.32, 900, 140, "lowpass");
    tone(ctx, dest, "sawtooth", 180, 70, 0.16, 0.14);
    tone(ctx, dest, "square", 320, 140, 0.09, 0.07);
  },
  super(ctx, dest, noise) {
    noiseBurst(ctx, dest, noise, 0.38, 0.28, 700, 1800, "bandpass", 0.02);
    tone(ctx, dest, "sawtooth", 90, 720, 0.32, 0.2, 0.02);
    tone(ctx, dest, "sine", 1400, 480, 0.18, 0.1, 0.01);
  },
  boost(ctx, dest, noise) {
    noiseBurst(ctx, dest, noise, 0.22, 0.11, 420, 1680, "bandpass", 0.024);
    tone(ctx, dest, "sine", 168, 410, 0.3, 0.075, 0.022);
    tone(ctx, dest, "triangle", 92, 210, 0.22, 0.045, 0.03);
  },
  gate_unlock(ctx, dest) {
    tone(ctx, dest, "sine", 784, 784, 0.28, 0.12, 0.01);
    tone(ctx, dest, "sine", 1175, 1175, 0.34, 0.1, 0.018);
    tone(ctx, dest, "triangle", 1568, 1568, 0.22, 0.05, 0.03);
  },
  hyperspace(ctx, dest, noise) {
    noiseBurst(ctx, dest, noise, 1.15, 0.22, 280, 2400, "bandpass", 0.08);
    tone(ctx, dest, "sine", 70, 420, 1.05, 0.16, 0.06);
    tone(ctx, dest, "triangle", 220, 880, 0.7, 0.06, 0.08);
  },
  game_over(ctx, dest, noise) {
    noiseBurst(ctx, dest, noise, 0.95, 0.3, 720, 70, "lowpass", 0.012);
    tone(ctx, dest, "sine", 196, 49, 1.15, 0.22, 0.03);
    tone(ctx, dest, "triangle", 294, 73, 0.9, 0.1, 0.05);
    tone(ctx, dest, "sawtooth", 98, 36, 0.75, 0.07, 0.04);
  },
};

function createNoiseBuffer(ctx: AudioContext): AudioBuffer {
  const length = Math.floor(ctx.sampleRate * 1.2);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  return buffer;
}

class GameAudio {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  private lastPlayed = new Map<SfxId, number>();
  private boostMix: GainNode | null = null;
  private boostFilter: BiquadFilterNode | null = null;
  private boostEngine: OscillatorNode | null = null;
  private boostEngineGain: GainNode | null = null;
  private boostRumble: OscillatorNode | null = null;
  private boostRumbleGain: GainNode | null = null;
  private lastBoost = -1;

  unlock(): void {
    if (typeof window === "undefined") return;
    if (!this.ctx) {
      const Ctx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!Ctx) return;
      this.ctx = new Ctx();
      this.master = this.ctx.createGain();
      this.master.gain.value = MASTER_GAIN;
      this.master.connect(this.ctx.destination);
      this.noise = createNoiseBuffer(this.ctx);
    }
    if (this.ctx.state === "suspended") {
      void this.ctx.resume();
    }
  }

  play(id: SfxId, options: SfxOptions = {}): void {
    this.unlock();
    const ctx = this.ctx;
    const master = this.master;
    const noise = this.noise;
    if (!ctx || !master || !noise || ctx.state === "suspended") return;

    const cooldown = COOLDOWN_MS[id] ?? 0;
    const stamp = performance.now();
    const previous = this.lastPlayed.get(id) ?? 0;
    if (stamp - previous < cooldown) return;
    this.lastPlayed.set(id, stamp);

    const mix = ctx.createGain();
    mix.gain.value = options.volume ?? 1;

    const panAmount = Math.max(-1, Math.min(1, options.pan ?? 0));
    if (ctx.createStereoPanner) {
      const panner = ctx.createStereoPanner();
      panner.pan.value = panAmount;
      mix.connect(panner);
      panner.connect(master);
    } else {
      mix.connect(master);
    }

    VOICES[id](ctx, mix, noise);
  }

  setBoost(intensity: number): void {
    if (!this.ctx || !this.master || !this.noise) return;
    if (!this.ensureBoostLoop()) return;

    const ctx = this.ctx;
    const t = ctx.currentTime;
    const amount = Math.max(0, Math.min(1.2, intensity));
    const audible = amount < 0.02 ? 0 : amount;
    if (Math.abs(audible - this.lastBoost) < 0.012) return;
    this.lastBoost = audible;

    this.boostMix!.gain.setTargetAtTime(audible * 0.18, t, 0.06);
    this.boostFilter!.frequency.setTargetAtTime(280 + audible * 720, t, 0.08);
    this.boostEngine!.frequency.setTargetAtTime(72 + audible * 48, t, 0.07);
    this.boostEngineGain!.gain.setTargetAtTime(audible * 0.04, t, 0.06);
    this.boostRumble!.frequency.setTargetAtTime(36 + audible * 18, t, 0.07);
    this.boostRumbleGain!.gain.setTargetAtTime(audible * 0.035, t, 0.06);
  }

  private ensureBoostLoop(): boolean {
    const ctx = this.ctx;
    const master = this.master;
    const noise = this.noise;
    if (!ctx || !master || !noise || this.boostMix) {
      return Boolean(this.boostMix);
    }

    const mix = ctx.createGain();
    mix.gain.value = 0;

    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 280;
    filter.Q.value = 1.4;

    const rush = ctx.createBufferSource();
    rush.buffer = noise;
    rush.loop = true;
    rush.connect(filter);
    filter.connect(mix);

    const engineGain = ctx.createGain();
    engineGain.gain.value = 0;
    const engine = ctx.createOscillator();
    engine.type = "triangle";
    engine.frequency.value = 72;
    engine.connect(engineGain);
    engineGain.connect(mix);

    const rumbleGain = ctx.createGain();
    rumbleGain.gain.value = 0;
    const rumble = ctx.createOscillator();
    rumble.type = "sine";
    rumble.frequency.value = 40;
    rumble.connect(rumbleGain);
    rumbleGain.connect(mix);

    mix.connect(master);
    rush.start();
    engine.start();
    rumble.start();

    this.boostMix = mix;
    this.boostFilter = filter;
    this.boostEngine = engine;
    this.boostEngineGain = engineGain;
    this.boostRumble = rumble;
    this.boostRumbleGain = rumbleGain;
    return true;
  }
}

const gameAudio = new GameAudio();

export function unlockGameAudio(): void {
  gameAudio.unlock();
}

export function playSfx(id: SfxId, options?: SfxOptions): void {
  gameAudio.play(id, options);
}

export function setBoostAudio(intensity: number): void {
  gameAudio.setBoost(intensity);
}

export function sfxPan(worldX: number, listenerX: number, spread = 9): number {
  return Math.max(-1, Math.min(1, (worldX - listenerX) / spread));
}

export function installGameAudioUnlock(): () => void {
  const unlock = () => unlockGameAudio();
  window.addEventListener("pointerdown", unlock, { passive: true });
  window.addEventListener("keydown", unlock);
  window.addEventListener("touchstart", unlock, { passive: true });
  return () => {
    window.removeEventListener("pointerdown", unlock);
    window.removeEventListener("keydown", unlock);
    window.removeEventListener("touchstart", unlock);
  };
}
