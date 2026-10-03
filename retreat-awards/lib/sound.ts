/**
 * Tiny synthesized sound effects (Web Audio) — no audio files to ship.
 * Must be triggered from a user gesture the first time (browsers block autoplay).
 */
let ctx: AudioContext | null = null;

function audio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

/** Snare-style drumroll that swells over `seconds`. */
export function drumroll(seconds = 3) {
  const ac = audio();
  if (!ac) return;
  const len = Math.floor(ac.sampleRate * seconds);
  const buffer = ac.createBuffer(1, len, ac.sampleRate);
  const data = buffer.getChannelData(0);
  const hitsPerSec = 22;
  for (let i = 0; i < len; i++) {
    const t = i / ac.sampleRate;
    const phase = (t * hitsPerSec) % 1; // each hit decays quickly
    const env = Math.exp(-phase * 9);
    const swell = 0.25 + 0.75 * (t / seconds);
    data[i] = (Math.random() * 2 - 1) * env * swell;
  }
  const src = ac.createBufferSource();
  src.buffer = buffer;
  const bp = ac.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.value = 1800;
  bp.Q.value = 0.7;
  const gain = ac.createGain();
  gain.gain.value = 0.5;
  src.connect(bp).connect(gain).connect(ac.destination);
  src.start();
}

/** Short tick for each countdown number. */
export function tick(high = false) {
  const ac = audio();
  if (!ac) return;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = "sine";
  osc.frequency.value = high ? 1320 : 880;
  gain.gain.setValueAtTime(0.25, ac.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.15);
  osc.connect(gain).connect(ac.destination);
  osc.start();
  osc.stop(ac.currentTime + 0.16);
}

/** Bright brass-ish fanfare + cymbal crash for the reveal. */
export function fanfare() {
  const ac = audio();
  if (!ac) return;
  const now = ac.currentTime;
  const notes = [
    { f: 523.25, t: 0, d: 0.18 }, // C5
    { f: 659.25, t: 0.14, d: 0.18 }, // E5
    { f: 783.99, t: 0.28, d: 0.18 }, // G5
    { f: 1046.5, t: 0.42, d: 1.2 }, // C6 (held)
  ];
  const master = ac.createGain();
  master.gain.value = 0.18;
  const lp = ac.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 3500;
  master.connect(lp).connect(ac.destination);

  for (const n of notes) {
    for (const detune of [-6, 0, 6]) {
      const osc = ac.createOscillator();
      const g = ac.createGain();
      osc.type = "sawtooth";
      osc.frequency.value = n.f;
      osc.detune.value = detune;
      g.gain.setValueAtTime(0, now + n.t);
      g.gain.linearRampToValueAtTime(0.5, now + n.t + 0.03);
      g.gain.exponentialRampToValueAtTime(0.001, now + n.t + n.d);
      osc.connect(g).connect(master);
      osc.start(now + n.t);
      osc.stop(now + n.t + n.d + 0.05);
    }
  }

  // Cymbal crash: filtered noise burst.
  const len = Math.floor(ac.sampleRate * 1.8);
  const buffer = ac.createBuffer(1, len, ac.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * Math.exp((-i / ac.sampleRate) * 2.5);
  const src = ac.createBufferSource();
  src.buffer = buffer;
  const hp = ac.createBiquadFilter();
  hp.type = "highpass";
  hp.frequency.value = 5000;
  const g = ac.createGain();
  g.gain.value = 0.35;
  src.connect(hp).connect(g).connect(ac.destination);
  src.start(now + 0.42);
}
