import { describe, expect, it } from "vitest";
import { describeProgress, isTouched, progressStats, STAGE_LABEL, stageOf } from "../src/core/progress";
import type { WordState } from "../src/core/types";

const st = (box: number, seen: number, wrong: number, due = 0): WordState => ({ box, due, seen, wrong });

describe("word progress", () => {
  it("treats queued-but-unanswered words as untouched", () => {
    expect(isTouched(undefined)).toBe(false);
    expect(isTouched(st(0, 0, 0, Date.now()))).toBe(false);
    expect(stageOf(st(0, 0, 0))).toBe("new");
    expect(stageOf(undefined)).toBe("new");
  });

  it("maps boxes to four stages", () => {
    expect(stageOf(st(0, 0, 1))).toBe("learning");
    expect(stageOf(st(1, 1, 0))).toBe("learning");
    expect(stageOf(st(2, 2, 0))).toBe("familiar");
    expect(stageOf(st(3, 3, 0))).toBe("familiar");
    expect(stageOf(st(4, 4, 0))).toBe("mastered");
    expect(stageOf(st(5, 9, 2))).toBe("mastered");
    expect(STAGE_LABEL.mastered).toBe("已掌握");
  });

  it("counts stages, due words and accuracy from answer records", () => {
    const words = [
      { id: "a", w: "a", ph: "", pos: "n", zh: "甲", freq: 1 },
      { id: "b", w: "b", ph: "", pos: "n", zh: "乙", freq: 2 },
      { id: "c", w: "c", ph: "", pos: "n", zh: "丙", freq: 3 },
      { id: "d", w: "d", ph: "", pos: "n", zh: "丁", freq: 4 },
    ];
    const now = 10_000;
    const stats = progressStats(
      words,
      {
        a: st(1, 1, 0, now + 1), // 学习中，未到期
        b: st(2, 2, 1, now - 1), // 熟悉，到期
        c: st(5, 6, 0, now + 5), // 已掌握
        d: st(0, 0, 0, now - 1), // 只有空壳记录，不算进度
      },
      now,
    );
    expect(stats.touched).toBe(3);
    expect(stats.learning).toBe(1);
    expect(stats.familiar).toBe(1);
    expect(stats.mastered).toBe(1);
    expect(stats.due).toBe(1);
    expect(stats.correct).toBe(9);
    expect(stats.wrong).toBe(1);
    expect(stats.accuracy).toBeCloseTo(0.9);
  });

  it("reports no accuracy before the first answer", () => {
    expect(progressStats([], {}, 0).accuracy).toBeNull();
  });

  it("describes a single word without leaking a raw timestamp", () => {
    const now = 1_000_000;
    expect(describeProgress(undefined, now)).toBe("还没答过这个词。");
    expect(describeProgress(st(0, 1, 1, now - 1), now)).toContain("现在到期");
    expect(describeProgress(st(3, 3, 0, now + 3 * 86_400_000), now)).toContain("3 天后再复习");
    expect(describeProgress(st(3, 3, 0, now + 86_400_000), now)).toContain("明天再复习");
  });
});
