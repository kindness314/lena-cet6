import { describe, expect, it } from "vitest";
import { annotate, normalizeForm, resolveWord } from "../src/core/annotate";
import type { Lookup } from "../src/core/types";

const lookup: Record<string, Lookup> = {
  study: { ph: "", pos: "n", zh: "学习" },
  hard: { ph: "", pos: "a", zh: "难的" },
  run: { ph: "", pos: "v", zh: "跑" },
  do: { ph: "", pos: "v", zh: "做" },
};
const forms = { studies: "study", harder: "hard", running: "run", don: "do" };

describe("resolveWord", () => {
  it("resolves inflected forms through the forms map", () => {
    expect(resolveWord("Studies", forms, lookup)).toBe("study");
    expect(resolveWord("harder", forms, lookup)).toBe("hard");
    expect(resolveWord("Running", forms, lookup)).toBe("run");
  });

  it("strips possessive and handles curly apostrophes", () => {
    expect(normalizeForm("Student’s")).toBe("student");
  });

  it("returns undefined for unknown words", () => {
    expect(resolveWord("zzzz", forms, lookup)).toBeUndefined();
  });
});

describe("annotate", () => {
  it("marks target words and keeps punctuation", () => {
    const tokens = annotate("He studies hard, doesn't he?", forms, lookup, new Set(["study"]));
    expect(tokens.map((t) => t.text).join("")).toBe("He studies hard, doesn't he?");
    const study = tokens.find((t) => t.text === "studies");
    expect(study?.word).toBe("study");
    expect(study?.target).toBe(true);
    expect(tokens.find((t) => t.text === "hard")?.target).toBe(false);
  });

  it("keeps hyphenated words as one token", () => {
    const tokens = annotate("a well-known fact", forms, lookup, new Set());
    expect(tokens.some((t) => t.text === "well-known")).toBe(true);
  });
});
