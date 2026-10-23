import { describe, expect, it } from "vitest";
import { annotate, findLemmaMatch, normalizeForm, resolveWord } from "../src/core/annotate";
import type { Lookup } from "../src/core/types";

const lookup: Record<string, Lookup> = {
  study: { ph: "", pos: "n", zh: "学习" },
  hard: { ph: "", pos: "a", zh: "难的" },
  run: { ph: "", pos: "v", zh: "跑" },
  do: { ph: "", pos: "v", zh: "做" },
  you: { ph: "", pos: "pron", zh: "你" },
  I: { ph: "", pos: "pron", zh: "我" },
};
const forms = { studies: "study", harder: "hard", running: "run", don: "do", does: "do" };

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

  it("resolves capitalized dictionary keys both ways", () => {
    const caps: Record<string, Lookup> = {
      France: { ph: "", pos: "n", zh: "法国" },
      AM: { ph: "", pos: "v", zh: "是" },
    };
    expect(resolveWord("france", forms, caps)).toBe("France");
    expect(resolveWord("France", forms, caps)).toBe("France");
    expect(resolveWord("am", forms, caps)).toBe("AM");
  });

  it("resolves contractions to their base word", () => {
    expect(resolveWord("don't", forms, lookup)).toBe("do");
    expect(resolveWord("doesn't", forms, lookup)).toBe("do");
    expect(resolveWord("you're", forms, lookup)).toBe("you");
    expect(resolveWord("I'm", forms, lookup)).toBe("I");
  });
});

describe("findLemmaMatch", () => {
  it("prefers the exact surface form over an inflection", () => {
    const hit = findLemmaMatch("Study hard. He studies.", "study", forms, lookup);
    expect(hit?.text).toBe("Study");
    expect(hit?.index).toBe(0);
  });

  it("falls back to an inflected form when the lemma is absent", () => {
    const word = findLemmaMatch("Running is fun.", "run", forms, lookup);
    expect(word?.text).toBe("Running");
  });

  it("returns null when the sentence has no matching form", () => {
    expect(findLemmaMatch("Nothing here.", "run", forms, lookup)).toBeNull();
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
