export interface Word {
  id: string;
  w: string;
  ph: string;
  pos: string;
  zh: string;
  freq: number;
  tier?: "foundation" | "core" | "advanced";
  sourceRank?: number;
  forms?: string[];
}

export interface Lookup {
  ph: string;
  pos: string;
  zh: string;
}

export interface Msg {
  id: string;
  w: string;
  ph?: string;
  en: string;
  zh: string;
  opts: string[];
  correct: number;
  picked?: number;
}

export interface Goal {
  id: string;
  name: string;
  date: string;
}

export type SentenceSource = "tatoeba" | "unpc" | "wikimatrix" | "opensubtitles";

export type SentencePair = [string, string, SentenceSource?];

export type Sentences = Record<string, SentencePair[]>;

export const SENTENCE_SOURCE_LABEL: Record<SentenceSource, string> = {
  tatoeba: "Tatoeba",
  unpc: "UNPC",
  wikimatrix: "WikiMatrix",
  opensubtitles: "OpenSubtitles",
};

export interface ArticleTranslation {
  provider: string;
  kind: "machine";
  retrieved: string;
}

export interface Article {
  id: string;
  title: string;
  source: string;
  url: string;
  license: string;
  paragraphs: string[];
  paragraphsZh?: string[];
  translation?: ArticleTranslation;
  author?: string;
  category?: string;
  level?: string;
  wordCount?: number;
  targetWords?: number;
  keyWords?: string[];
  retrieved?: string;
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
  storySeen: number;
  storySceneId: string;
  goals: Goal[];
  settings: { quota: Quota; newCap: number; sound: boolean };
  reads: Record<string, number>;
  tasks: Record<string, boolean>;
  /** 小说里点进小游戏的词，下一轮优先出题。 */
  gameQueue: string[];
}
