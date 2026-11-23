/**
 * 轻量级 Web Audio API 街机音效合成器（零外部音频依赖）
 */
class ArcadeSFX {
  constructor() {
    this.ctx = null;
    this.muted = false;
  }

  _ensureCtx() {
    if (this.muted) return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  _tone({ freq = 440, endFreq = null, type = 'square', duration = 0.08, gain = 0.08, delay = 0 }) {
    const ctx = this._ensureCtx();
    if (!ctx) return;

    const now = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const amp = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (endFreq !== null) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), now + duration);
    }

    amp.gain.setValueAtTime(0.0001, now);
    amp.gain.linearRampToValueAtTime(gain, now + 0.008);
    amp.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(amp);
    amp.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.01);
  }

  toggleMute() {
    this.muted = !this.muted;
    return this.muted;
  }

  tick() {
    this._tone({ freq: 680, endFreq: 860, type: 'triangle', duration: 0.04, gain: 0.05 });
  }

  confirm() {
    this._tone({ freq: 330, endFreq: 520, type: 'square', duration: 0.07, gain: 0.07 });
    this._tone({ freq: 660, endFreq: 880, type: 'triangle', duration: 0.1, gain: 0.07, delay: 0.045 });
  }

  swap() {
    this._tone({ freq: 480, endFreq: 720, type: 'sine', duration: 0.07, gain: 0.07 });
    this._tone({ freq: 720, endFreq: 540, type: 'sine', duration: 0.08, gain: 0.06, delay: 0.06 });
  }

  random() {
    const notes = [440, 554, 659, 880];
    notes.forEach((f, idx) => {
      this._tone({ freq: f, type: 'square', duration: 0.055, gain: 0.05, delay: idx * 0.04 });
    });
  }

  start() {
    this._tone({ freq: 220, endFreq: 440, type: 'sawtooth', duration: 0.16, gain: 0.08 });
    this._tone({ freq: 440, endFreq: 660, type: 'square', duration: 0.16, gain: 0.07, delay: 0.12 });
    this._tone({ freq: 880, endFreq: 1174, type: 'triangle', duration: 0.25, gain: 0.09, delay: 0.24 });
  }

  ko() {
    this._tone({ freq: 523, type: 'square', duration: 0.12, gain: 0.08 });
    this._tone({ freq: 659, type: 'square', duration: 0.12, gain: 0.08, delay: 0.1 });
    this._tone({ freq: 784, type: 'square', duration: 0.14, gain: 0.08, delay: 0.2 });
    this._tone({ freq: 1046, type: 'triangle', duration: 0.35, gain: 0.1, delay: 0.32 });
  }

  _noise({ duration = 0.08, gain = 0.08, filterType = 'bandpass', freq = 1200, endFreq = null, q = 1.2, delay = 0 }) {
    const ctx = this._ensureCtx();
    if (!ctx) return;

    const now = ctx.currentTime + delay;
    const sampleCount = Math.max(1, Math.floor(ctx.sampleRate * (duration + 0.02)));
    const buffer = ctx.createBuffer(1, sampleCount, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < sampleCount; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const src = ctx.createBufferSource();
    src.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = filterType;
    filter.frequency.setValueAtTime(freq, now);
    if (endFreq !== null) {
      filter.frequency.exponentialRampToValueAtTime(Math.max(40, endFreq), now + duration);
    }
    filter.Q.setValueAtTime(q, now);

    const amp = ctx.createGain();
    amp.gain.setValueAtTime(0.0001, now);
    amp.gain.linearRampToValueAtTime(gain, now + 0.006);
    amp.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    src.connect(filter);
    filter.connect(amp);
    amp.connect(ctx.destination);
    src.start(now);
    src.stop(now + duration + 0.02);
  }

  whoosh(heavy = false) {
    this._noise({
      duration: heavy ? 0.14 : 0.08,
      gain: heavy ? 0.1 : 0.065,
      filterType: 'bandpass',
      freq: heavy ? 900 : 1800,
      endFreq: heavy ? 240 : 620,
      q: 1.4
    });
  }

  hitLight() {
    this._tone({ freq: 240, endFreq: 75, type: 'triangle', duration: 0.075, gain: 0.13 });
    this._noise({ duration: 0.055, gain: 0.11, filterType: 'highpass', freq: 1100, q: 0.8 });
  }

  hitHeavy() {
    this._tone({ freq: 170, endFreq: 42, type: 'sawtooth', duration: 0.15, gain: 0.16 });
    this._tone({ freq: 110, endFreq: 36, type: 'sine', duration: 0.18, gain: 0.18 });
    this._noise({ duration: 0.11, gain: 0.14, filterType: 'bandpass', freq: 950, endFreq: 260, q: 0.9 });
  }

  guardBlock() {
    this._tone({ freq: 920, endFreq: 1180, type: 'triangle', duration: 0.09, gain: 0.1 });
    this._tone({ freq: 1480, endFreq: 980, type: 'square', duration: 0.07, gain: 0.06, delay: 0.01 });
    this._noise({ duration: 0.05, gain: 0.07, filterType: 'highpass', freq: 2400, q: 1.2 });
  }

  dash() {
    this._noise({ duration: 0.11, gain: 0.09, filterType: 'bandpass', freq: 520, endFreq: 1900, q: 1.5 });
    this._tone({ freq: 260, endFreq: 520, type: 'sine', duration: 0.08, gain: 0.04 });
  }

  buff() {
    const notes = [392, 494, 587, 784];
    notes.forEach((f, idx) => {
      this._tone({ freq: f, endFreq: f * 1.06, type: 'triangle', duration: 0.14, gain: 0.07, delay: idx * 0.045 });
    });
  }

  ultimate() {
    this._tone({ freq: 196, endFreq: 784, type: 'sawtooth', duration: 0.24, gain: 0.09 });
    this._tone({ freq: 587, endFreq: 1174, type: 'square', duration: 0.18, gain: 0.07, delay: 0.14 });
    this._tone({ freq: 880, endFreq: 1318, type: 'triangle', duration: 0.32, gain: 0.09, delay: 0.28 });
  }
}

export const sfx = new ArcadeSFX();
