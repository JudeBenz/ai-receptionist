#!/usr/bin/env node
// Builds video/afterring-pitch-1080p.mp4 and video/afterring-pitch-720p.mp4 from script.json.
//
//   node build.mjs                 full build (voices, music, frames, encode)
//   node build.mjs --audio-only    voices + timeline + mix only
//   node build.mjs --frames-only   frames from the existing build/timeline.json
//   node build.mjs --encode-only   MP4s from existing frames and mix
//   node build.mjs --jobs 6        PowerShell renderers to run in parallel (default: CPU count, max 8)
//
// Everything intermediate lives in video/build/ (ignored by git). TTS clips are cached there by
// voice + text, so changing one line only re-synthesises that line.
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import crypto from "node:crypto";
import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import ffmpegPath from "ffmpeg-static";
import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";
import { SR, writeWav, decodeToFloat, trimSilence, normalize, addInto, sfx, music, frameLevels, peak } from "./lib/audio.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const flag = (f) => args.includes(f);
const jobsArg = args.indexOf("--jobs") >= 0 ? parseInt(args[args.indexOf("--jobs") + 1]) : Math.min(8, os.cpus().length);
const doAudio = !flag("--frames-only") && !flag("--encode-only");
const doFrames = !flag("--audio-only") && !flag("--encode-only");
const doEncode = !flag("--audio-only") && !flag("--frames-only");

const buildDir = path.join(here, "build");
const ttsDir = path.join(buildDir, "tts");
const framesDir = path.join(buildDir, "frames");
for (const d of [buildDir, ttsDir, framesDir]) fs.mkdirSync(d, { recursive: true });

const script = JSON.parse(fs.readFileSync(path.join(here, "script.json"), "utf8"));
const brand = JSON.parse(fs.readFileSync(path.join(here, "..", "business", "brand.json"), "utf8"));
const FPS = script.fps;
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);

// [key] placeholders in script text come from brand.json (demo_number, email, booking_link ...).
function fill(v) {
  if (typeof v === "string") return v.replace(/\[([a-z_]+)\]/g, (m, k) => (k in brand ? String(brand[k]) : m));
  if (Array.isArray(v)) return v.map(fill);
  if (v && typeof v === "object") { const o = {}; for (const k of Object.keys(v)) o[k] = fill(v[k]); return o; }
  return v;
}

// ---------------- voices ----------------
async function synth(line, voiceCfg) {
  const key = crypto.createHash("sha1").update(JSON.stringify([voiceCfg, line.text])).digest("hex").slice(0, 16);
  const mp3 = path.join(ttsDir, `${key}.mp3`);
  if (!fs.existsSync(mp3) || fs.statSync(mp3).size < 1000) {
    // The Edge endpoint drops the socket now and then, so each line gets a few attempts.
    let buf, lastErr;
    for (let attempt = 1; attempt <= 5 && !buf; attempt++) {
      const tts = new MsEdgeTTS({ connectionTimeoutMs: 20000, synthesisTimeoutMs: 60000 });
      try {
        await tts.setMetadata(voiceCfg.voice, OUTPUT_FORMAT.AUDIO_24KHZ_96KBITRATE_MONO_MP3);
        const { audioStream } = tts.toStream(line.text, { rate: voiceCfg.rate, pitch: voiceCfg.pitch });
        const chunks = [];
        await new Promise((res, rej) => { audioStream.on("data", (d) => chunks.push(d)); audioStream.on("end", res); audioStream.on("error", rej); });
        const b = Buffer.concat(chunks);
        if (b.length < 1000) throw new Error(`only ${b.length} bytes`);
        buf = b;
      } catch (e) {
        lastErr = e;
        log(`  attempt ${attempt} failed for "${line.text.slice(0, 40)}": ${e.message}`);
        await new Promise((r) => setTimeout(r, 800 * attempt));
      } finally { try { tts.close(); } catch {} }
    }
    if (!buf) throw new Error(`TTS failed after retries: ${lastErr?.message}`);
    fs.writeFileSync(mp3, buf);
    log(`  synthesised ${voiceCfg.voice}: "${line.text.slice(0, 50)}"`);
  }
  return normalize(trimSilence(decodeToFloat(ffmpegPath, mp3)), 0.85);
}

async function buildAudioAndTimeline() {
  log("Synthesising voices (Edge neural voices via msedge-tts)");
  const scenes = [];
  let cursor = 0;
  const flashFrames = script.flash.frames;
  const flashDur = flashFrames / FPS;
  const clips = []; // {speaker, start, samples}
  const sfxCues = []; // {name, at, gain}
  let flashIndex = 0;

  for (const raw of script.scenes) {
    const sc = fill(raw);
    const hasFlash = sc.flash !== false && scenes.length > 0;
    const start = cursor;
    let t = start + (hasFlash ? flashDur : 0) + (sc.leadIn ?? 0.3);
    const lines = [];
    for (const line of sc.lines ?? []) {
      const samples = await synth(line, script.voices[line.speaker]);
      t += line.gap ?? 0;
      const dur = samples.length / SR;
      lines.push({ speaker: line.speaker, text: line.text, start: round(t), end: round(t + dur), t0: round(t - start), t1: round(t + dur - start) });
      clips.push({ speaker: line.speaker, start: t, samples });
      t += dur;
    }
    t += sc.tail ?? 0.5;
    const end = Math.max(t, start + (sc.minDuration ?? 0));
    const events = {};
    for (const ev of sc.events ?? []) {
      let base = start;
      if (ev.after?.startsWith("line:")) base = lines[parseInt(ev.after.slice(5))].end;
      else if (ev.after?.startsWith("linestart:")) base = lines[parseInt(ev.after.slice(10))].start;
      events[ev.id] = round(base + (ev.offset ?? 0) - start); // scene-relative seconds
    }
    const flashColor = hasFlash ? script.flash.colors[flashIndex++ % script.flash.colors.length] : null;
    scenes.push({ id: sc.id, type: sc.type, start: round(start), end: round(end), flash: flashColor, flashFrames, flashAlpha: script.flash.alpha ?? [1, 1, 0.6], lines, events, text: sc.text ?? {} });
    if (hasFlash) sfxCues.push({ name: "whoosh", at: start - 0.05, gain: 0.22 });
    cursor = end;
  }
  const duration = round(cursor);
  const frames = Math.round(duration * FPS);
  log(`Timeline: ${scenes.length} scenes, ${duration.toFixed(2)} s, ${frames} frames`);
  for (const s of scenes) log(`  ${s.id.padEnd(8)} ${s.start.toFixed(2).padStart(6)} -> ${s.end.toFixed(2).padStart(6)}  (${(s.end - s.start).toFixed(1)} s)`);

  // Scene-specific effects.
  const ev = (id, name) => { const s = scenes.find((s) => s.id === id); return s?.events?.[name] == null ? null : s.start + s.events[name]; };
  const shop = scenes.find((s) => s.id === "shop");
  if (shop) {
    sfxCues.push({ name: "ring", at: shop.start + shop.events.ring1, gain: 0.32 }, { name: "ring", at: shop.start + shop.events.ring2, gain: 0.32 });
    sfxCues.push({ name: "hangup", at: shop.start + shop.events.hangup, gain: 0.5 });
  }
  const call = scenes.find((s) => s.id === "call");
  if (call) sfxCues.push({ name: "tick", at: call.start + 0.5, gain: 0.35 });
  if (ev("owner", "text") != null) sfxCues.push({ name: "buzz", at: ev("owner", "text"), gain: 0.5 });
  if (ev("owner", "email") != null) sfxCues.push({ name: "ding", at: ev("owner", "email"), gain: 0.3 });
  if (ev("owner", "calendar") != null) sfxCues.push({ name: "pop", at: ev("owner", "calendar"), gain: 0.5 });
  if (ev("offer", "price") != null) sfxCues.push({ name: "pop", at: ev("offer", "price"), gain: 0.45 });
  const what = scenes.find((s) => s.id === "what");
  if (what) for (const k of ["step1", "step2", "step3", "step4"]) sfxCues.push({ name: "tick", at: what.start + what.events[k], gain: 0.3 });
  const stats = scenes.find((s) => s.id === "problem");
  if (stats) for (const k of ["stat1", "stat2", "stat3"]) if (stats.events[k] != null) sfxCues.push({ name: "tick", at: stats.start + stats.events[k], gain: 0.3 });
  const notS = scenes.find((s) => s.id === "not");
  if (notS) for (const l of notS.lines) sfxCues.push({ name: "tick", at: l.start - 0.05, gain: 0.3 });

  // ---------- mix ----------
  log("Mixing voices, music and effects");
  const total = new Float32Array(Math.round(duration * SR));
  const bySpeaker = {};
  for (const c of clips) {
    bySpeaker[c.speaker] ??= new Float32Array(total.length);
    addInto(bySpeaker[c.speaker], c.samples, c.start, 1);
  }
  const voiceMix = new Float32Array(total.length);
  for (const s of Object.values(bySpeaker)) for (let i = 0; i < total.length; i++) voiceMix[i] += s[i];

  const bed = music(duration);
  // Duck the music under speech: gain follows a smoothed "is anyone talking" envelope.
  const duck = new Float32Array(total.length);
  let g = 1; const win = Math.round(0.02 * SR);
  for (let i = 0; i < total.length; i += win) {
    let active = false;
    for (let j = i; j < i + win && j < total.length; j++) if (Math.abs(voiceMix[j]) > 0.02) { active = true; break; }
    const target = active ? 0.32 : 1;
    for (let j = i; j < i + win && j < total.length; j++) { g += (target - g) * (target < g ? 0.004 : 0.0007); duck[j] = g; }
  }
  const musicGain = 0.17;
  for (let i = 0; i < total.length; i++) total[i] = voiceMix[i] * 0.95 + bed[i] * musicGain * duck[i];
  for (const cue of sfxCues) addInto(total, sfx[cue.name](), cue.at, cue.gain);
  const p = peak(total);
  if (p > 0.98) for (let i = 0; i < total.length; i++) total[i] *= 0.98 / p;
  writeWav(path.join(buildDir, "mix.wav"), total);

  const levels = {};
  for (const sp of Object.keys(bySpeaker)) levels[sp] = frameLevels(bySpeaker[sp], FPS, frames);

  const timeline = {
    fps: FPS, width: script.width, height: script.height, duration, frames,
    brand: { company: brand.company, tagline: brand.tagline, demo_number: brand.demo_number, email: brand.email, booking_link: brand.booking_link },
    scenes, levels,
  };
  fs.writeFileSync(path.join(buildDir, "timeline.json"), JSON.stringify(timeline));
  log("Wrote build/mix.wav and build/timeline.json");
  return timeline;
}

function round(x) { return Math.round(x * 1000) / 1000; }

// ---------------- frames ----------------
function renderFrames(timeline) {
  return new Promise((resolve, reject) => {
    for (const f of fs.readdirSync(framesDir)) if (f.endsWith(".png")) fs.unlinkSync(path.join(framesDir, f));
    const jobs = Math.max(1, jobsArg);
    const per = Math.ceil(timeline.frames / jobs);
    log(`Rendering ${timeline.frames} frames with ${jobs} PowerShell renderers`);
    let open = 0, failed = false;
    const t0 = Date.now();
    for (let j = 0; j < jobs; j++) {
      const from = j * per, to = Math.min(timeline.frames, (j + 1) * per) - 1;
      if (from > to) continue;
      open++;
      const ps = spawn("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", path.join(here, "render-frames.ps1"),
        "-Timeline", path.join(buildDir, "timeline.json"), "-OutDir", framesDir, "-From", String(from), "-To", String(to)], { stdio: ["ignore", "pipe", "pipe"] });
      let err = "";
      ps.stdout.on("data", (d) => { const s = d.toString().trim(); if (s) log(`  [r${j}] ${s}`); });
      ps.stderr.on("data", (d) => { err += d.toString(); });
      ps.on("close", (code) => {
        open--;
        if (code !== 0 && !failed) { failed = true; reject(new Error(`renderer ${j} failed (${code}):\n${err}`)); }
        if (open === 0 && !failed) { log(`Frames done in ${((Date.now() - t0) / 1000).toFixed(0)} s`); resolve(); }
      });
    }
  });
}

// ---------------- encode ----------------
function encode(timeline) {
  const mix = path.join(buildDir, "mix.wav");
  const pattern = path.join(framesDir, "f%05d.png");
  const out1080 = path.join(here, "afterring-pitch-1080p.mp4");
  const out720 = path.join(here, "afterring-pitch-720p.mp4");
  const common = ["-y", "-v", "error", "-stats", "-framerate", String(timeline.fps), "-i", pattern, "-i", mix,
    "-c:v", "libx264", "-pix_fmt", "yuv420p", "-profile:v", "high", "-level", "4.0", "-movflags", "+faststart",
    "-c:a", "aac", "-ar", "48000", "-shortest"];
  log("Encoding 1080p");
  run(ffmpegPath, [...common, "-preset", "slow", "-crf", "18", "-b:a", "160k", "-metadata", `title=${brand.company} pitch`, out1080]);
  log("Encoding 720p");
  run(ffmpegPath, [...common, "-vf", "scale=1280:720:flags=lanczos", "-preset", "slow", "-crf", "22", "-maxrate", "2200k", "-bufsize", "4400k", "-b:a", "112k", "-metadata", `title=${brand.company} pitch`, out720]);
  for (const f of [out1080, out720]) log(`  ${path.basename(f)}: ${(fs.statSync(f).size / 1e6).toFixed(1)} MB`);
}

function run(cmd, a) {
  const r = spawnSync(cmd, a, { stdio: "inherit" });
  if (r.status !== 0) throw new Error(`${path.basename(cmd)} exited ${r.status}`);
}

// ---------------- main ----------------
let timeline;
if (doAudio) timeline = await buildAudioAndTimeline();
else timeline = JSON.parse(fs.readFileSync(path.join(buildDir, "timeline.json"), "utf8"));
if (doFrames) await renderFrames(timeline);
if (doEncode) encode(timeline);
log("Done");
