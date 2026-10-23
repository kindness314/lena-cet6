import type { Msg, State } from "./types";

export const STORAGE_KEY = "cet6.state.v1";

export function defaultState(): State {
  return {
    v: 1,
    words: {},
    chat: { day: "", msgs: [], idx: 0 },
    goals: [{ id: "cet6", name: "六级笔试", date: "2026-12-12T15:00:00+08:00" }],
    settings: { quota: 12, newCap: 8, sound: true },
    reads: {},
    tasks: {},
  };
}

export function ensureDay(state: State, day: string, gen: () => Msg[]): void {
  if (state.chat.day === day) return;
  state.chat = { day, msgs: gen(), idx: 0 };
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
  return {
    v: 1,
    words: s.words,
    chat: s.chat,
    goals: s.goals,
    settings: { ...defaultState().settings, ...s.settings },
    reads: s.reads ?? {},
    tasks: s.tasks ?? {},
  };
}
