import type { State } from "./types";
import { defaultState, STORAGE_KEY } from "./state";

export function loadState(): State {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw) as State;
    if (parsed.v !== 1) return defaultState();
    return { ...defaultState(), ...parsed, settings: { ...defaultState().settings, ...parsed.settings } };
  } catch {
    return defaultState();
  }
}

export function saveState(state: State): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Quota exceeded or private mode: keep the session usable.
  }
}
