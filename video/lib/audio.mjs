// Small PCM toolbox: WAV I/O, mp3 decoding through ffmpeg, synthesised music and sound effects.
// Everything is mono Float32 at SR samples per second; the mixer writes 16-bit WAV.
import { spawnSync } from "node:child_process";
import fs from "node:fs";

export const SR = 48000;

export function writeWav(path, samples, sr = SR) {
  const n = samples.length;
  const buf = Buffer.alloc(44 + n * 2);
  buf.write("RIFF", 0); buf.writeUInt32LE(36 + n * 2, 4); buf.write("WAVE", 8);
  buf.write("fmt ", 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(sr, 24); buf.writeUInt32LE(sr * 2, 28); buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34);
  buf.write("data", 36); buf.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) {
    const v = Math.max(-1, Math.min(1, samples[i]));
    buf.writeInt16LE(Math.round(v * 32767), 44 + i * 2);
  }
  fs.writeFileSync(path, buf);
}

// Decode any audio file to Float32 mono at SR using ffmpeg.
export function decodeToFloat(ffmpeg, path) {
  const r = spawnSync(ffmpeg, ["-v", "error", "-i", path, "-f", "f32le", "-ac", "1", "-ar", String(SR), "-"], { maxBuffer: 1 << 28 });
  if (r.status !== 0) throw new Error(`ffmpeg decode failed for ${path}: ${r.stderr}`);
  const b = r.stdout;
  return new Float32Array(b.buffer, b.byteOffset, Math.floor(b.length / 4));
}

// Drop silence at both ends (keeps a little air) so line timings are tight.
export function trimSilence(s, threshold = 0.004, keepHead = 0.04, keepTail = 0.10) {
  let a = 0, b = s.length - 1;
  while (a < s.length && Math.abs(s[a]) < threshold) a++;
  while (b > a && Math.abs(s[b]) < threshold) b--;
  a = Math.max(0, a - Math.round(keepHead * SR));
  b = Math.min(s.length, b + Math.round(keepTail * SR));
  return s.slice(a, b);
}

export function peak(s) { let p = 0; for (let i = 0; i < s.length; i++) p = Math.max(p, Math.abs(s[i])); return p; }
export function normalize(s, target = 0.9) { const p = peak(s) || 1; const g = target / p; const o = new Float32Array(s.length); for (let i = 0; i < s.length; i++) o[i] = s[i] * g; return o; }

export function addInto(dest, src, atSec, gain = 1) {
  const off = Math.round(atSec * SR);
  for (let i = 0; i < src.length; i++) { const j = off + i; if (j >= 0 && j < dest.length) dest[j] += src[i] * gain; }
}

// ---------- synthesis primitives ----------
const TAU = Math.PI * 2;

export function tone(freq, dur, { gain = 1, attack = 0.01, release = 0.05, harmonics = [1] } = {}) {
  const n = Math.round(dur * SR); const o = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    let v = 0;
    for (let h = 0; h < harmonics.length; h++) v += harmonics[h] * Math.sin(TAU * freq * (h + 1) * t);
    const env = Math.min(1, t / attack, (dur - t) / release);
    o[i] = v * gain * Math.max(0, env);
  }
  return o;
}

// Plucked note: harmonics with exponential decay, slightly brighter at the start.
export function pluck(freq, dur, gain = 1, decay = 2.5) {
  const n = Math.round(dur * SR); const o = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SR; const e = Math.exp(-decay * t);
    const v = Math.sin(TAU * freq * t) + 0.45 * e * Math.sin(TAU * freq * 2 * t) + 0.2 * e * Math.sin(TAU * freq * 3 * t) + 0.08 * Math.sin(TAU * freq * 0.5 * t);
    o[i] = v * e * gain * Math.min(1, t / 0.004);
  }
  return o;
}

// Pad: detuned sines with slow swell, low-passed by construction (few harmonics).
export function pad(freqs, dur, gain = 1, { attack = 0.6, release = 0.8 } = {}) {
  const n = Math.round(dur * SR); const o = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SR; let v = 0;
    for (const f of freqs) {
      v += Math.sin(TAU * f * t) + Math.sin(TAU * f * 1.003 * t + 0.7) + 0.25 * Math.sin(TAU * f * 2 * t + 1.1);
    }
    const env = Math.max(0, Math.min(1, t / attack, (dur - t) / release));
    const lfo = 0.9 + 0.1 * Math.sin(TAU * 0.25 * t);
    o[i] = v / (freqs.length * 2.25) * env * lfo * gain;
  }
  return o;
}

export function noise(dur, gain = 1) {
  const n = Math.round(dur * SR); const o = new Float32Array(n);
  for (let i = 0; i < n; i++) o[i] = (Math.random() * 2 - 1) * gain;
  return o;
}

// One-pole low-pass with optional cutoff sweep (Hz at start, Hz at end).
export function lowpass(s, cutoffStart, cutoffEnd = cutoffStart) {
  const o = new Float32Array(s.length); let y = 0;
  for (let i = 0; i < s.length; i++) {
    const c = cutoffStart + (cutoffEnd - cutoffStart) * (i / s.length);
    const a = 1 - Math.exp(-TAU * c / SR);
    y += a * (s[i] - y); o[i] = y;
  }
  return o;
}

export function envelope(s, fn) { const o = new Float32Array(s.length); for (let i = 0; i < s.length; i++) o[i] = s[i] * fn(i / SR, s.length / SR); return o; }

// ---------- sound effects ----------
export const sfx = {
  // North American ring: 440 Hz + 480 Hz, two seconds on; we use a shorter 1.4 s burst.
  ring(dur = 1.4) {
    const a = tone(440, dur, { gain: 0.5, attack: 0.03, release: 0.08 });
    const b = tone(480, dur, { gain: 0.5, attack: 0.03, release: 0.08 });
    const o = new Float32Array(a.length);
    for (let i = 0; i < a.length; i++) o[i] = (a[i] + b[i]) * (0.85 + 0.15 * Math.sin(TAU * 20 * i / SR));
    return lowpass(o, 2200);
  },
  hangup() {
    const click = envelope(lowpass(noise(0.05, 1), 3000), (t) => Math.exp(-80 * t));
    const beep = tone(400, 0.12, { gain: 0.5, attack: 0.005, release: 0.04 });
    const o = new Float32Array(Math.round(0.25 * SR));
    addInto(o, click, 0, 0.9); addInto(o, beep, 0.06, 0.6);
    return o;
  },
  // Flash-cut whoosh: filtered noise with a fast attack and a sweep downwards.
  whoosh() {
    const n = envelope(noise(0.22, 1), (t, d) => Math.min(1, t / 0.02) * Math.exp(-14 * t));
    return lowpass(n, 6000, 500);
  },
  ding() {
    const a = tone(1318.5, 0.9, { gain: 0.6, attack: 0.004, release: 0.6 });
    const b = tone(1760, 0.7, { gain: 0.35, attack: 0.004, release: 0.5 });
    const o = new Float32Array(a.length);
    for (let i = 0; i < a.length; i++) { const t = i / SR; o[i] = (a[i] + (b[i] || 0)) * Math.exp(-3.5 * t); }
    return o;
  },
  pop() {
    const n = Math.round(0.12 * SR); const o = new Float32Array(n);
    for (let i = 0; i < n; i++) { const t = i / SR; const f = 700 - 400 * (t / 0.12); o[i] = Math.sin(TAU * f * t) * Math.exp(-28 * t) * 0.8; }
    return o;
  },
  tick() {
    return envelope(lowpass(noise(0.03, 1), 2500), (t) => Math.exp(-120 * t) * 0.8);
  },
};

// ---------- music ----------
// Soft, neutral bed: a four-chord loop in A minor at 96 bpm, pad plus a quiet plucked arpeggio.
// Nothing here is sampled or copied; it is all additive synthesis above.
export function music(durSec, { bpm = 96 } = {}) {
  const out = new Float32Array(Math.round(durSec * SR));
  const beat = 60 / bpm; const bar = beat * 4;
  const N = (name) => { const notes = { C: -9, D: -7, E: -5, F: -4, G: -2, A: 0, B: 2 }; const m = /^([A-G])(\d)$/.exec(name); return 440 * Math.pow(2, (notes[m[1]] + (parseInt(m[2]) - 4) * 12) / 12); };
  const chords = [
    ["A2", "E3", "C4", "A3"],
    ["F2", "C3", "A3", "F3"],
    ["C3", "G3", "E4", "C4"],
    ["G2", "D3", "B3", "G3"],
  ];
  const bars = Math.ceil(durSec / bar) + 1;
  for (let b = 0; b < bars; b++) {
    const ch = chords[b % chords.length];
    const t0 = b * bar;
    addInto(out, pad(ch.slice(0, 3).map(N), bar + 0.4, 0.5, { attack: 0.5, release: 0.6 }), t0);
    // arpeggio: eighth notes over the chord tones, rising then falling
    const arp = [ch[1], ch[2], ch[3], ch[2], ch[1], ch[2], ch[3], ch[2]];
    for (let k = 0; k < 8; k++) {
      const vel = k % 2 === 0 ? 0.22 : 0.14;
      addInto(out, pluck(N(arp[k]) * 2, 0.9, vel, 3.2), t0 + k * beat / 2);
    }
    // soft low pulse on beats 1 and 3
    for (const k of [0, 2]) addInto(out, lowpass(pluck(N(ch[0]) / 2, 0.5, 0.5, 6), 180), t0 + k * beat);
  }
  // overall fade in / out and gentle low-pass so it sits behind the voice
  const lp = lowpass(out, 3200);
  return envelope(lp, (t, d) => Math.min(1, t / 1.5, (d - t) / 2.5));
}

// Per-frame loudness of a signal, 0..1, for the on-screen waveform.
export function frameLevels(s, fps, frames) {
  const win = Math.round(SR / fps); const out = new Array(frames).fill(0); let mx = 1e-6;
  for (let f = 0; f < frames; f++) {
    let acc = 0; const a = f * win;
    for (let i = a; i < a + win && i < s.length; i++) acc += s[i] * s[i];
    const rms = Math.sqrt(acc / win); out[f] = rms; mx = Math.max(mx, rms);
  }
  return out.map((v) => Math.round(Math.min(1, v / (mx * 0.7)) * 100) / 100);
}
