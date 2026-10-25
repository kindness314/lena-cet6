import { h } from "../core/dom";
import { localDay } from "../core/random";
import { SCENES, dayOrdinal, type Scene } from "../core/scenes";

export type Mood = "calm" | "curious" | "happy";

export function mountArt(html: string, className: string, scene?: Scene): HTMLElement {
  const el = h("div", { class: className });
  if (scene) el.setAttribute("style", `--scene-a:${scene.accent};--scene-b:${scene.accent2}`);
  el.innerHTML = html;
  return el;
}

/** 7 套立绘（CC BY-SA 4.0，见 public/art/CREDITS.md）；兔耳那套按用户要求不用。 */
const PORTRAITS = Array.from({ length: 7 }, (_, i) => `${import.meta.env.BASE_URL}art/lena-${i + 1}.png`);

function hashId(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return hash;
}

/** 造型轮换：同一幕同一天固定，换幕或换天换一套，保证一天内不会跳变。 */
export function portraitVariant(scene?: Scene, day = localDay(Date.now())): number {
  const index = scene ? SCENES.findIndex((s) => s.id === scene.id) : -1;
  const base = index >= 0 ? index : hashId(scene?.id ?? "");
  return (base + dayOrdinal(day)) % PORTRAITS.length;
}

/** Lena 的立绘：按幕轮换造型，mood 只做轻微角度与饱和度微调。 */
export function lenaPortrait(mood: Mood = "calm", scene?: Scene): HTMLElement {
  const src = PORTRAITS[portraitVariant(scene)];
  const img = `<img class="lena-svg" src="${src}" alt="Lena 的立绘" draggable="false" decoding="async">`;
  return mountArt(img, `lena-portrait mood-${mood}`, scene);
}

export function avatarMark(): HTMLElement {
  const svg = `<svg viewBox="0 0 40 40" role="img" aria-label="Lena">
    <circle cx="20" cy="20" r="18" fill="currentColor" opacity=".13"/>
    <path d="M20 6 L22.8 16.6 L33 18.2 L24.9 24.6 L27.5 34.5 L20 28.6 L12.5 34.5 L15.1 24.6 L7 18.2 L17.2 16.6 Z" fill="currentColor" opacity=".9"/>
    <circle cx="27.5" cy="11" r="2.2" fill="currentColor" opacity=".55"/>
  </svg>`;
  return mountArt(svg, "avatar-mark");
}
