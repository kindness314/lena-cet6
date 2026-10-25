// Shared ECDICT parsing and gloss cleaning. Keep this file dependency-free:
// both the word builder and the article glossary builder import it.
export function parseCsvLine(line) {
  const out = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (quoted) {
      if (c === '"') {
        if (line[i + 1] === '"') {
          field += '"';
          i++;
        } else quoted = false;
      } else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") {
      out.push(field);
      field = "";
    } else field += c;
  }
  out.push(field);
  return out;
}

function linesOf(translation) {
  return translation
    .replace(/\\n/g, "\n")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
}

function stripPos(line) {
  return line.replace(/^(?:[a-z]{1,5}\.\s*)+/i, "").trim();
}

function sensesOf(line, limit) {
  return stripPos(line)
    .split(/[，,；;]/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, limit);
}

// Concise gloss for learning cards: one primary part of speech, at most two
// senses. The quiz uses this, so keep it short and stable.
export function cleanZh(translation) {
  const lines = linesOf(translation);
  const first = lines.find((l) => !l.startsWith("[")) ?? lines[0] ?? "";
  const noPos = stripPos(first);
  const senses = sensesOf(first, 2);
  return (senses.join("，") || noPos).replace(/\s+/g, " ").slice(0, 28);
}

// Reading lookup can afford the ambiguity: merge up to four glosses from
// different parts of speech (for example saw: "锯子" + "see 的过去式") so a
// word clicked inside an article is not reduced to its rarest sense.
export function lookupZh(translation) {
  const glosses = [];
  for (const line of linesOf(translation)) {
    if (line.startsWith("[") || !/[\u4e00-\u9fa5]/.test(line)) continue;
    const senses = sensesOf(line, 2);
    if (senses.length === 0) continue;
    const gloss = senses.join("，").replace(/\s+/g, " ");
    if (glosses.some((x) => x === gloss || x.includes(gloss) || gloss.includes(x))) continue;
    glosses.push(gloss);
    if (glosses.join("；").length >= 48) break;
  }
  return glosses.join("；").slice(0, 48);
}

export function posKey(pos, translation) {
  let raw = (pos || "").split(":")[0].trim();
  if (!raw) {
    const m = /^([a-z]{1,5})\./i.exec(translation.replace(/\\n/g, "\n"));
    raw = m ? m[1].toLowerCase() : "";
  }
  if (raw.startsWith("v")) return "v";
  if (raw === "n") return "n";
  if (raw === "a" || raw === "adj") return "a";
  if (raw === "ad" || raw === "adv") return "r";
  return raw || "?";
}
