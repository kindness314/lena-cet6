import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  ARCS,
  SCENES,
  arcById,
  beatIndex,
  dayOrdinal,
  defaultSceneForDay,
  sceneBeat,
  sceneById,
  sceneEnding,
  sceneFeedback,
  sceneForState,
  sceneQuestion,
} from "../src/core/scenes";

const WORD = "example";

describe("scene catalogue", () => {
  it("has four arcs and twenty-four unique scenes", () => {
    expect(ARCS).toHaveLength(4);
    expect(SCENES).toHaveLength(24);
    expect(new Set(SCENES.map((s) => s.id)).size).toBe(24);
    expect(new Set(SCENES.map((s) => s.arc))).toEqual(new Set(ARCS.map((a) => a.id)));
    for (const arc of ARCS) {
      expect(SCENES.filter((s) => s.arc === arc.id)).toHaveLength(6);
    }
  });

  it("gives every scene a full 12-beat story with themed vocabulary", () => {
    for (const scene of SCENES) {
      expect(scene.title).not.toBe("");
      expect(scene.beats).toHaveLength(12);
      for (const beat of scene.beats) {
        expect(beat.narr.length).toBeGreaterThan(10);
        expect(beat.prompt.length).toBeGreaterThan(4);
        expect(beat.good.length).toBeGreaterThan(4);
        expect(beat.miss.length).toBeGreaterThan(4);
        const placeholders = beat.prompt.match(/\{w\}/g)?.length ?? 0;
        expect(placeholders).toBeLessThanOrEqual(1);
      }
      expect(scene.theme.length).toBeGreaterThanOrEqual(8);
      expect(scene.theme.every((w) => /^[A-Za-z][A-Za-z-]*$/.test(w))).toBe(true);
      expect(scene.endGood).not.toBe("");
      expect(scene.endSoft).not.toBe("");
      expect(scene.endGood).not.toBe(scene.endSoft);
      expect(arcById(scene.arc).id).toBe(scene.arc);
      expect(sceneById(scene.id)).toBe(scene);
    }
  });

  it("weaves the current word into every prompt that uses {w}", () => {
    for (const scene of SCENES) {
      scene.beats.forEach((beat, i) => {
        if (!beat.prompt.includes("{w}")) return;
        const q = sceneQuestion(scene, i, WORD);
        expect(q.prompt).toContain(WORD);
        expect(q.prompt).not.toContain("{w}");
        expect(q.narr).toBe(beat.narr);
      });
    }
  });

  it("builds every pool from real words, curated first, with meaningful size", () => {
    const words = JSON.parse(readFileSync("public/data/words.json", "utf8")) as { w: string }[];
    const wordSet = new Set(words.map((w) => w.w));
    const covered = new Set<string>();
    for (const scene of SCENES) {
      expect(scene.theme.length).toBeGreaterThanOrEqual(24);
      expect(new Set(scene.theme).size).toBe(scene.theme.length);
      for (const w of scene.theme) {
        expect(wordSet.has(w)).toBe(true);
        covered.add(w);
      }
    }
    // 语义归类覆盖了词表的相当一部分（低于此说明判断过严或数据损坏）
    // 24 幕语义归类后应覆盖四成词表（16 幕时约 26%，掉到 35% 以下说明扩写幕丢了）
    expect(covered.size).toBeGreaterThan(words.length * 0.35);
  });
});

describe("daily scene selection", () => {
  it("rotates deterministically through every scene", () => {
    const first = defaultSceneForDay("2026-10-24");
    expect(defaultSceneForDay("2026-10-24")).toBe(first);
    const days = Array.from({ length: SCENES.length }, (_, i) => {
      const d = new Date(Date.UTC(2026, 9, 24 + i));
      return d.toISOString().slice(0, 10);
    });
    const picked = days.map((d) => defaultSceneForDay(d).id);
    expect(new Set(picked).size).toBe(SCENES.length);
  });

  it("falls back to the first scene for an invalid day", () => {
    expect(dayOrdinal("not-a-day")).toBe(0);
    expect(defaultSceneForDay("not-a-day")).toBe(SCENES[0]);
  });

  it("honours a valid manual scene and ignores an unknown one", () => {
    expect(sceneForState({ storySceneId: "lighthouse" }, "2026-10-24").id).toBe("lighthouse");
    expect(sceneForState({ storySceneId: "no-such-scene" }, "2026-10-24")).toBe(defaultSceneForDay("2026-10-24"));
    expect(sceneForState({ storySceneId: "" }, "2026-10-24")).toBe(defaultSceneForDay("2026-10-24"));
  });

  it("advances to a scene that still has unlearned words", () => {
    const day = "2026-10-24";
    const base = defaultSceneForDay(day);
    const words = Object.fromEntries(
      base.theme.map((word) => [word, { box: 1, due: 0, seen: 1, wrong: 0 }]),
    ) as Record<string, { box: number; due: number; seen: number; wrong: number }>;
    const scene = sceneForState({ storySceneId: "", words }, day);
    expect(scene.id).not.toBe(base.id);
    expect(scene.theme.some((word) => words[word] === undefined)).toBe(true);
  });

  it("keeps the manual scene even when its pool is exhausted", () => {
    const manual = SCENES[0];
    const words = Object.fromEntries(
      manual.theme.map((word) => [word, { box: 1, due: 0, seen: 1, wrong: 0 }]),
    ) as Record<string, { box: number; due: number; seen: number; wrong: number }>;
    expect(sceneForState({ storySceneId: manual.id, words }, "2026-10-24").id).toBe(manual.id);
  });
});

describe("beat progression", () => {
  const scene = SCENES[0];

  it("advances the story with the queue index", () => {
    expect(sceneQuestion(scene, 0, WORD).narr).toBe(scene.beats[0].narr);
    expect(sceneQuestion(scene, 4, WORD).narr).toBe(scene.beats[4].narr);
    expect(sceneQuestion(scene, 11, WORD).narr).toBe(scene.beats[11].narr);
  });

  it("clamps overflow to the final beat so the story holds its ending", () => {
    expect(sceneBeat(scene, 20)).toBe(scene.beats[11]);
    expect(beatIndex(-3, 12)).toBe(0);
    expect(beatIndex(0, 0)).toBe(0);
  });

  it("gives different feedback for correct and wrong answers on the same beat", () => {
    const good = sceneFeedback(scene, 3, WORD, true);
    const miss = sceneFeedback(scene, 3, WORD, false);
    expect(good).toBe(scene.beats[3].good);
    expect(miss).toBe(scene.beats[3].miss);
    expect(good).not.toBe(miss);
  });
});

describe("scene ending", () => {
  const scene = SCENES[5];

  it("picks the good ending at or above 70% accuracy", () => {
    expect(sceneEnding(scene, 10, 7)).toBe(scene.endGood);
    expect(sceneEnding(scene, 10, 10)).toBe(scene.endGood);
  });

  it("picks the soft ending below 70% accuracy and on an empty day", () => {
    expect(sceneEnding(scene, 10, 6)).toBe(scene.endSoft);
    expect(sceneEnding(scene, 0, 0)).toBe(scene.endSoft);
  });
});
