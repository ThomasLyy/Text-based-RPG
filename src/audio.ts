// All sound is made here, in code, with the browser's Web Audio: square and triangle waves and noise, like an
// 8-bit console. No audio files, so nothing to license. Browsers only allow sound after a first press, so the
// audio starts on the first click or key.

let ctx: AudioContext | null = null;
let soundGain: GainNode | null = null;
let musicGain: GainNode | null = null;
let volumes = { sound: 60, music: 60 };

export function setVolumes(sound: number, music: number) {
  volumes = { sound, music };
  if (soundGain) soundGain.gain.value = (sound / 100) * 0.5;
  if (musicGain) musicGain.gain.value = (music / 100) * 0.25;
}

function start() {
  if (ctx) return void ctx.resume();
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return; // no Web Audio: the game is silent
  ctx = new Ctor();
  soundGain = ctx.createGain();
  musicGain = ctx.createGain();
  soundGain.connect(ctx.destination);
  musicGain.connect(ctx.destination);
  setVolumes(volumes.sound, volumes.music);
  if (track !== null) tick();
}
addEventListener("pointerdown", start);
addEventListener("keydown", start);

const hz = (midi: number) => 440 * 2 ** ((midi - 69) / 12);

// One note: a wave that starts at full volume and dies away.
function tone(out: GainNode, type: OscillatorType, from: number, to: number, at: number, length: number, level = 1) {
  const osc = ctx!.createOscillator();
  const gain = ctx!.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(from, at);
  if (to !== from) osc.frequency.exponentialRampToValueAtTime(to, at + length);
  gain.gain.setValueAtTime(level, at);
  gain.gain.exponentialRampToValueAtTime(0.001, at + length);
  osc.connect(gain).connect(out);
  osc.start(at);
  osc.stop(at + length);
}

function noise(at: number, length: number, level = 1) {
  const buffer = ctx!.createBuffer(1, Math.ceil(ctx!.sampleRate * length), ctx!.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  const src = ctx!.createBufferSource();
  const gain = ctx!.createGain();
  gain.gain.value = level;
  src.buffer = buffer;
  src.connect(gain).connect(soundGain!);
  src.start(at);
}

export type Sound = "hit" | "crit" | "hurt" | "level" | "buy" | "win" | "lose";

export function sfx(name: Sound) {
  if (!ctx || !soundGain || volumes.sound === 0) return;
  const t = ctx.currentTime;
  const out = soundGain;
  const notes = (midis: number[], step: number, length = step * 1.5) => midis.forEach((m, i) => tone(out, "square", hz(m), hz(m), t + i * step, length, 0.5));
  if (name === "hit") noise(t, 0.08, 0.7);
  else if (name === "crit") (noise(t, 0.12), tone(out, "square", 660, 1320, t, 0.12, 0.5));
  else if (name === "hurt") tone(out, "square", 220, 80, t, 0.2, 0.6);
  else if (name === "level") notes([72, 76, 79, 84], 0.08);
  else if (name === "buy") notes([88, 95], 0.06, 0.15);
  else if (name === "win") notes([72, 76, 79, 84, 79, 84, 88], 0.12);
  else notes([64, 60, 57, 52], 0.18, 0.3);
}

// --- music: one loop per act. `lead` is 32 eighth notes, `bass` 16 quarter notes, as MIDI numbers (0 = silence). ---

const TRACKS: { bpm: number; lead: number[]; bass: number[] }[] = [
  {
    // The Sewers: A minor, a slow walk
    bpm: 100,
    lead: [69, 0, 72, 0, 76, 0, 72, 0, 74, 0, 72, 0, 69, 0, 67, 0, 69, 0, 72, 0, 76, 0, 81, 0, 79, 0, 76, 0, 74, 0, 72, 0],
    bass: [45, 45, 45, 45, 41, 41, 41, 41, 48, 48, 48, 48, 43, 43, 43, 43],
  },
  {
    // The Catacombs: D minor, sparse and slow
    bpm: 84,
    lead: [74, 0, 0, 0, 77, 0, 0, 0, 81, 0, 0, 79, 0, 0, 77, 0, 76, 0, 0, 0, 79, 0, 0, 0, 70, 0, 0, 72, 0, 0, 74, 0],
    bass: [38, 0, 38, 0, 34, 0, 34, 0, 36, 0, 36, 0, 38, 0, 33, 0],
  },
  {
    // Hell: E phrygian, fast and driving
    bpm: 132,
    lead: [76, 76, 77, 76, 79, 76, 77, 76, 76, 76, 77, 76, 81, 79, 77, 76, 71, 71, 72, 71, 74, 71, 72, 71, 76, 74, 72, 71, 72, 74, 76, 0],
    bass: [40, 40, 40, 40, 40, 40, 40, 40, 35, 35, 35, 35, 40, 38, 36, 35],
  },
];

let track: number | null = null;
let step = 0;
let nextAt = 0;
let timer = 0;

// Schedules the notes of the next fraction of a second, again and again.
function tick() {
  clearTimeout(timer);
  if (!ctx || !musicGain || track === null) return;
  const t = TRACKS[track];
  const eighth = 60 / t.bpm / 2;
  if (nextAt < ctx.currentTime) nextAt = ctx.currentTime + 0.05;
  while (nextAt < ctx.currentTime + 0.3) {
    const lead = t.lead[step % t.lead.length];
    const bass = step % 2 === 0 ? t.bass[(step / 2) % t.bass.length] : 0;
    if (lead) tone(musicGain, "square", hz(lead), hz(lead), nextAt, eighth * 0.9, 0.35);
    if (bass) tone(musicGain, "triangle", hz(bass), hz(bass), nextAt, eighth * 1.8, 0.9);
    nextAt += eighth;
    step++;
  }
  timer = window.setTimeout(tick, 100);
}

// The act's track, or null for silence (home screen, end of run).
export function music(act: number | null) {
  if (act === track) return;
  track = act !== null && TRACKS[act] ? act : null;
  step = 0;
  nextAt = 0;
  tick();
}
