import { describe, expect, it } from "vitest";
import { answerBox, INTERVALS } from "../src/core/srs";

describe("answerBox", () => {
  it("promotes a correct answer to the next interval", () => {
    const now = 1_000_000;
    const next = answerBox({ box: 0, due: now, seen: 0, wrong: 0 }, true, now);
    expect(next.box).toBe(1);
    expect(next.due).toBe(now + INTERVALS[1]);
    expect(next.seen).toBe(1);
    expect(next.wrong).toBe(0);
  });

  it("caps at the last interval", () => {
    const now = 0;
    const next = answerBox({ box: 5, due: 0, seen: 9, wrong: 0 }, true, now);
    expect(next.box).toBe(5);
    expect(next.due).toBe(now + INTERVALS[5]);
  });

  it("sends a wrong answer to tomorrow instead of ten minutes", () => {
    const now = 0;
    const next = answerBox({ box: 4, due: 0, seen: 4, wrong: 1 }, false, now);
    expect(next.box).toBe(0);
    expect(next.due).toBe(now + INTERVALS[0]);
    expect(next.wrong).toBe(2);
    expect(next.seen).toBe(4);
    expect(INTERVALS[0]).toBe(86_400_000);
  });
});
