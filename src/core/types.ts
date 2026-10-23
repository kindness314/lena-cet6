export interface Word {
  id: string;
  w: string;
  ph: string;
  pos: string;
  zh: string;
  freq: number;
}

export interface Lookup {
  ph: string;
  pos: string;
  zh: string;
}

export interface Msg {
  id: string;
  w: string;
  en: string;
  zh: string;
  opts: string[];
  correct: number;
}

export interface Goal {
  id: string;
  name: string;
  date: string;
}

export type Sentences = Record<string, [string, string][]>;

export interface Article {
  id: string;
  title: string;
  source: string;
  url: string;
  license: string;
  paragraphs: string[];
}

export interface WordState {
  box: number;
  due: number;
  seen: number;
  wrong: number;
}

export type Quota = 5 | 8 | 12;

export interface State {
  v: 1;
  words: Record<string, WordState>;
  chat: { day: string; msgs: Msg[]; idx: number };
  goals: Goal[];
  settings: { quota: Quota; newCap: number; sound: boolean };
  reads: Record<string, number>;
  tasks: Record<string, boolean>;
}
