import type { Goal, Msg, State, WordState } from "./types";

export const STORAGE_KEY = "cet6.state.v1";

export function defaultState(): State {
  return {
    v: 1,
    words: {},
    chat: { day: "", msgs: [], idx: 0 },
    storySeen: 0,
    storySceneId: "",
    goals: [{ id: "cet6", name: "六级笔试", date: "2026-12-12T15:00:00+08:00" }],
    settings: { quota: 12, newCap: 8, sound: true },
    reads: {},
    tasks: {},
    gameQueue: [],
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function numberIn(value: unknown, min: number, max: number, fallback: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(value)));
}

function sanitizeMsg(value: unknown, index: number): Msg | null {
  if (!isRecord(value) || typeof value.w !== "string" || !value.w.trim()) return null;
  if (!Array.isArray(value.opts) || value.opts.length < 2) return null;
  if (!value.opts.every((opt) => typeof opt === "string")) return null;
  if (typeof value.zh !== "string" || !value.zh) return null;
  if (
    typeof value.correct !== "number" ||
    !Number.isInteger(value.correct) ||
    value.correct < 0 ||
    value.correct >= value.opts.length
  ) {
    return null;
  }
  const correct = value.correct;
  const msg: Msg = {
    id: typeof value.id === "string" && value.id ? value.id : `${value.w}:import:${index}`,
    w: value.w,
    en: typeof value.en === "string" ? value.en : "",
    zh: value.zh,
    opts: value.opts as string[],
    correct,
  };
  if (typeof value.ph === "string") msg.ph = value.ph;
  if (typeof value.picked === "number" && Number.isInteger(value.picked) && value.picked >= 0 && value.picked < msg.opts.length) {
    msg.picked = value.picked;
  }
  return msg;
}

function sanitizeWordState(value: unknown): WordState | null {
  if (!isRecord(value)) return null;
  if (typeof value.due !== "number" || !Number.isFinite(value.due)) return null;
  return {
    box: numberIn(value.box, 0, 5, 0),
    due: Math.max(0, Math.trunc(value.due)),
    seen: numberIn(value.seen, 0, Number.MAX_SAFE_INTEGER, 0),
    wrong: numberIn(value.wrong, 0, Number.MAX_SAFE_INTEGER, 0),
  };
}

function sanitizeGoal(value: unknown, index: number): Goal | null {
  if (!isRecord(value)) return null;
  if (typeof value.name !== "string" || !value.name.trim()) return null;
  if (typeof value.date !== "string" || Number.isNaN(+new Date(value.date))) return null;
  return {
    id: typeof value.id === "string" && value.id ? value.id : `goal:${index}`,
    name: value.name.trim(),
    date: value.date,
  };
}

export function sanitizeState(value: unknown, fallback = defaultState()): State {
  if (!isRecord(value) || value.v !== 1) throw new Error("版本不匹配，需要 v1 数据");
  if (!isRecord(value.words)) throw new Error("words 字段缺失");
  if (!isRecord(value.chat) || !Array.isArray(value.chat.msgs)) throw new Error("chat 字段缺失");
  if (!Array.isArray(value.goals)) throw new Error("goals 字段缺失");
  if (!isRecord(value.settings) || typeof value.settings.quota !== "number") throw new Error("settings 字段缺失");

  const words: Record<string, WordState> = {};
  for (const [key, raw] of Object.entries(value.words)) {
    const state = sanitizeWordState(raw);
    if (state) words[key] = state;
  }

  const msgs = value.chat.msgs.map((msg, index) => sanitizeMsg(msg, index)).filter((msg): msg is Msg => msg !== null);
  if (value.chat.msgs.length > 0 && msgs.length === 0) throw new Error("chat.msgs 没有有效记录");
  const idx = numberIn(value.chat.idx, 0, msgs.length, 0);
  const goals = value.goals.map((goal, index) => sanitizeGoal(goal, index)).filter((goal): goal is Goal => goal !== null);

  const reads: Record<string, number> = {};
  if (isRecord(value.reads)) {
    for (const [key, raw] of Object.entries(value.reads)) {
      if (typeof raw === "number" && Number.isFinite(raw) && raw >= 0) reads[key] = Math.trunc(raw);
    }
  }

  const gameQueue: string[] = [];
  if (Array.isArray(value.gameQueue)) {
    for (const raw of value.gameQueue) {
      if (typeof raw !== "string" || !raw || gameQueue.includes(raw)) continue;
      gameQueue.push(raw);
      if (gameQueue.length >= 200) break;
    }
  }

  const tasks: Record<string, boolean> = {};
  if (isRecord(value.tasks)) {
    for (const [key, raw] of Object.entries(value.tasks)) {
      if (typeof raw === "boolean") tasks[key] = raw;
    }
  }

  const quota = value.settings.quota;
  const settings = {
    quota: quota === 5 || quota === 8 || quota === 12 ? quota : fallback.settings.quota,
    newCap: numberIn(value.settings.newCap, 1, 20, fallback.settings.newCap),
    sound: typeof value.settings.sound === "boolean" ? value.settings.sound : fallback.settings.sound,
  } as State["settings"];

  return {
    v: 1,
    words,
    chat: {
      day: typeof value.chat.day === "string" ? value.chat.day : fallback.chat.day,
      msgs,
      idx,
    },
    storySeen: numberIn(value.storySeen, 0, msgs.length, 0),
    storySceneId: typeof value.storySceneId === "string" ? value.storySceneId : "",
    goals,
    settings,
    reads,
    tasks,
    gameQueue,
  };
}

export function ensureDay(state: State, day: string, gen: () => Msg[]): void {
  if (state.chat.day === day) return;
  state.chat = { day, msgs: gen(), idx: 0 };
  state.storySeen = 0;
}

export function exportJson(state: State): string {
  return JSON.stringify(state, null, 2);
}

export function importJson(raw: string): State {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("不是合法的 JSON");
  }
  const s = parsed as Partial<State>;
  if (!s || s.v !== 1) throw new Error("版本不匹配，需要 v1 数据");
  if (!s.words || typeof s.words !== "object" || Array.isArray(s.words)) {
    throw new Error("words 字段缺失");
  }
  if (!s.chat || !Array.isArray(s.chat.msgs)) throw new Error("chat 字段缺失");
  if (!Array.isArray(s.goals)) throw new Error("goals 字段缺失");
  if (!s.settings || typeof s.settings.quota !== "number") throw new Error("settings 字段缺失");
  return sanitizeState(s);
}
