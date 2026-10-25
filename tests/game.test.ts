import { describe, expect, it } from "vitest";
import { coverage, gamePool, nextRound, normalizeSpelling, sceneWordSet, spellHint, spellOk, wordHome } from "../src/core/game";
import { SCENES } from "../src/core/scenes";
import type { Word, WordState } from "../src/core/types";

const w = (word: string, freq: number): Word => ({
  id: word,
  w: word,
  ph: "",
  pos: "n",
  zh: `释义-${word}`,
  freq,
});

const themedWord = SCENES[0].theme[0];
const words: Word[] = [
  w(themedWord, 1),
  w("alpha", 2),
  w("beta", 3),
  w("gamma", 4),
  w("delta", 5),
  w("epsilon", 6),
  w("zeta", 7),
];

describe("game pool", () => {
  it("excludes every word that belongs to a scene pool", () => {
    const pool = gamePool(words).map((x) => x.w);
    expect(pool).not.toContain(themedWord);
    expect(sceneWordSet().has(themedWord)).toBe(true);
    expect(pool).toEqual(["alpha", "beta", "gamma", "delta", "epsilon", "zeta"]);
  });

  it("collects every theme word from all scenes", () => {
    const all = new Set(SCENES.flatMap((scene) => scene.theme));
    expect(sceneWordSet().size).toBe(all.size);
    for (const word of all) expect(sceneWordSet().has(word)).toBe(true);
  });
});

describe("nextRound", () => {
  it("takes unlearned words in freq order up to the round size", () => {
    expect(nextRound(words, {}, 5).map((x) => x.w)).toEqual(["alpha", "beta", "gamma", "delta", "epsilon"]);
  });

  it("tops the round up with learned words by due date once fresh words run out", () => {
    const wordsState: Record<string, WordState> = {
      alpha: { box: 1, due: 9000, seen: 1, wrong: 0 },
      beta: { box: 1, due: 8000, seen: 1, wrong: 0 },
      gamma: { box: 1, due: 3000, seen: 1, wrong: 0 },
      delta: { box: 1, due: 5000, seen: 1, wrong: 0 },
      epsilon: { box: 1, due: 4000, seen: 1, wrong: 0 },
    };
    // zeta 是唯一没学过的词，其余按到期时间补足 3 个
    expect(nextRound(words, wordsState, 3, { now: 1000 }).map((x) => x.w)).toEqual([
      "zeta",
      "gamma",
      "epsilon",
    ]);
  });

  it("leaves due words to the review page", () => {
    const wordsState: Record<string, WordState> = {
      alpha: { box: 1, due: 500, seen: 1, wrong: 0 },
      beta: { box: 1, due: 2000, seen: 1, wrong: 0 },
    };
    const round = nextRound(words, wordsState, 5, { now: 1000 }).map((x) => x.w);
    expect(round).not.toContain("alpha");
    expect(round).toContain("beta");
  });

  it("skips words already shown in today's story queue", () => {
    const round = nextRound(words, {}, 3, { exclude: ["alpha", "beta"] }).map((x) => x.w);
    expect(round).toEqual(["gamma", "delta", "epsilon"]);
  });

  it("serves words the reader sent over before anything else", () => {
    const round = nextRound(words, {}, 3, { priority: ["zeta", "epsilon"] }).map((x) => x.w);
    expect(round).toEqual(["zeta", "epsilon", "alpha"]);
  });

  it("ignores priority words that belong to a scene pool or are due", () => {
    const list = [...words, w(themedWord, 99)];
    const wordsState: Record<string, WordState> = { zeta: { box: 1, due: 10, seen: 1, wrong: 0 } };
    const round = nextRound(list, wordsState, 2, { priority: [themedWord, "zeta"], now: 1000 }).map((x) => x.w);
    expect(round).toEqual(["alpha", "beta"]);
  });

  it("returns an empty round when there are no game words", () => {
    expect(nextRound([w(themedWord, 1)], {}, 5)).toEqual([]);
  });
});

describe("tier mixing", () => {
  const tiered = (name: string, freq: number, tier: "foundation" | "core" | "advanced"): Word => ({
    ...w(name, freq),
    tier,
  });
  const mix: Word[] = [
    ...[1, 2, 3, 4].map((i) => tiered(`f${i}`, i, "foundation")),
    ...[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((i) => tiered(`c${i}`, 20 + i, "core")),
    ...[1, 2, 3, 4].map((i) => tiered(`a${i}`, 40 + i, "advanced")),
  ];
  const count = (round: Word[]): Record<string, number> => {
    const out: Record<string, number> = {};
    for (const word of round) {
      const tier = word.tier ?? "core";
      out[tier] = (out[tier] ?? 0) + 1;
    }
    return out;
  };

  it("splits a round across tiers by the remaining word counts", () => {
    expect(count(nextRound(mix, {}, 5))).toEqual({ foundation: 1, core: 3, advanced: 1 });
  });

  it("gives the quota back to the other tiers when one runs dry", () => {
    const noFoundation = mix.filter((word) => word.tier !== "foundation");
    expect(count(nextRound(noFoundation, {}, 5))).toEqual({ core: 4, advanced: 1 });
  });

  it("keeps each tier in frequency order", () => {
    const round = nextRound(mix, {}, 5);
    const core = round.filter((word) => word.tier === "core").map((word) => word.w);
    expect(core).toEqual(["c1", "c2", "c3"]);
  });
});

describe("gloss collisions", () => {
  it("never puts two words with the same Chinese gloss in one round", () => {
    const same = { zh: "一模一样" };
    const list: Word[] = [
      { ...w("twin-a", 1), ...same },
      { ...w("twin-b", 2), ...same },
      w("other-a", 3),
      w("other-b", 4),
      w("other-c", 5),
      w("other-d", 6),
    ];
    const round = nextRound(list, {}, 5);
    expect(round).toHaveLength(5);
    expect(round.filter((x) => x.zh === "一模一样")).toHaveLength(1);
  });
});

describe("word home", () => {
  it("sends pool words to the story and everything else to the game", () => {
    expect(wordHome(themedWord)).toBe("story");
    expect(wordHome("alpha")).toBe("game");
  });
});

describe("coverage", () => {
  it("counts learned words per home", () => {
    const cov = coverage(words, {
      alpha: { box: 1, due: 0, seen: 1, wrong: 0 },
      [themedWord]: { box: 1, due: 0, seen: 1, wrong: 0 },
    });
    expect(cov.total).toBe(7);
    expect(cov.learned).toBe(2);
    expect(cov.story).toEqual({ total: 1, learned: 1 });
    expect(cov.game).toEqual({ total: 6, learned: 1 });
  });

  it("does not count a word that is only queued and never answered", () => {
    const cov = coverage(words, {
      alpha: { box: 0, due: 0, seen: 0, wrong: 0 },
      beta: { box: 0, due: 0, seen: 0, wrong: 1 },
    });
    expect(cov.learned).toBe(1);
    expect(cov.game.learned).toBe(1);
  });
});

describe("spell mode", () => {
  it("accepts case, padding and hyphen/space variants", () => {
    expect(spellOk("  Abroad ", "abroad")).toBe(true);
    expect(spellOk("well known", "well-known")).toBe(true);
    expect(spellOk("well-known", "well known")).toBe(true);
    expect(normalizeSpelling("  Ice_Cream  ")).toBe("ice cream");
  });

  it("rejects near misses instead of fuzzy-matching them", () => {
    expect(spellOk("abroa", "abroad")).toBe(false);
    expect(spellOk("abroads", "abroad")).toBe(false);
    expect(spellOk("", "abroad")).toBe(false);
    expect(spellOk("   ", "abroad")).toBe(false);
  });

  it("hints with the first letter and the remaining letter count", () => {
    expect(spellHint("abroad")).toEqual({ letter: "a", rest: 5 });
    expect(spellHint("Well-Known")).toEqual({ letter: "w", rest: 8 });
    expect(spellHint("a")).toEqual({ letter: "a", rest: 0 });
  });
});
