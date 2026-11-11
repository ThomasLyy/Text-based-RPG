// Saving. A run in progress is saved as its random seed and the list of answers given so far: to continue it,
// the game plays the run again with those answers, silently, and hands over at the first unanswered question.
// shortcut: a run cannot be replayed once the rules changed (RULES below), so it is ended and paid out by its
// saved floor; upgrade to saving the full state if updates during a run must keep the run.
import { io } from "./io";

import { newProfile, type Profile } from "./meta";

export const SAVE_VERSION = 2;
// Bump whenever a change would make an old run play out differently: new or changed enemies, items, odds, or the order of random draws.
export const RULES = 2;

export interface RunSave {
  seed: number;
  rules: number;
  level: number; // difficulty level
  answers: number[]; // the index picked at each question, in order
  floor: number; // furthest floor reached, kept so a run that cannot be replayed can still be paid out
}

export interface Save {
  version: number;
  run: RunSave | null;
  profile: Profile;
}

export const newSave = (): Save => ({ version: SAVE_VERSION, run: null, profile: newProfile() });
export const newRun = (seed: number, level = 1): RunSave => ({ seed, rules: RULES, level, answers: [], floor: 0 });

// Old formats are converted one version at a time, never dropped. Unreadable text gives a new save.
// MIGRATIONS[n - 1] turns version n into version n + 1.
const MIGRATIONS: ((old: any) => any)[] = [
  // 1 -> 2: the profile (store, levels, best results) arrives; a run in progress was at level 1
  (v1) => ({ version: 2, run: v1.run && { ...v1.run, level: 1 }, profile: newProfile() }),
];

export function loadSave(text: string | null): Save {
  let data: any;
  try {
    data = JSON.parse(text ?? "");
  } catch {
    return newSave();
  }
  if (typeof data?.version !== "number" || data.version < 1 || data.version > SAVE_VERSION) return newSave();
  while (data.version < SAVE_VERSION) data = MIGRATIONS[data.version - 1](data);
  return data;
}

export class SaveMismatch extends Error {}

// Wraps io for one run: saved answers are given back at once, with no drawing and no waiting; new answers are
// added to `run` and reported through `onAnswer` so the caller can store them. Returns a function that undoes the wrapping.
export function record(run: RunSave, onAnswer: () => void): () => void {
  const { ask, sleep, render } = io;
  let next = 0;
  let replaying = run.answers.length > 0; // until the first question with no saved answer, so the last saved action is not animated again
  io.ask = async (question, options, disabled, details) => {
    if (next < run.answers.length) {
      const a = run.answers[next++];
      if (a >= options.length || disabled?.[a]) throw new SaveMismatch(`saved answer ${a} does not fit "${question}"`);
      return a;
    }
    replaying = false;
    const a = await ask(question, options, disabled, details);
    run.answers.push(a);
    next++;
    run.floor = Math.max(run.floor, io.snapshot?.().floor ?? 0);
    onAnswer();
    return a;
  };
  io.sleep = (ms) => (replaying ? Promise.resolve() : sleep(ms));
  io.render = (view) => void (replaying || render(view));
  return () => Object.assign(io, { ask, sleep, render });
}
