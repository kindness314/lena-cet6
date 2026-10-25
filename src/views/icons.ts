export type NavIcon = "chat" | "story" | "read" | "game" | "review" | "goals";

const ICONS: Record<NavIcon, string> = {
  chat: `<path d="M5 6.5A3.5 3.5 0 0 1 8.5 3h7A3.5 3.5 0 0 1 19 6.5v5a3.5 3.5 0 0 1-3.5 3.5H10l-3.8 3v-3.4A3.5 3.5 0 0 1 5 11.5Z"/><path d="M9 9.5h6M9 12h3.5"/>`,
  story: `<path d="M4 5.5c3-1.2 5.4-.7 8 1.2 2.6-1.9 5-2.4 8-1.2v12c-3-1.1-5.4-.6-8 1.2-2.6-1.8-5-2.3-8-1.2Z"/><path d="M12 6.7V18"/><path d="m18.5 3 .7 1.7 1.8.7-1.8.7-.7 1.7-.7-1.7-1.8-.7 1.8-.7Z"/>`,
  read: `<path d="M6 3.5h9.5A2.5 2.5 0 0 1 18 6v14.5H8.5A2.5 2.5 0 0 1 6 18Z"/><path d="M6 18a2.5 2.5 0 0 1 2.5-2.5H18"/><path d="M10 7.5h4.5"/>`,
  game: `<rect x="3.5" y="7" width="7" height="7" rx="1.6"/><rect x="13.5" y="7" width="7" height="7" rx="1.6"/><rect x="8.5" y="14.5" width="7" height="6" rx="1.6"/>`,
  review: `<path d="M20 8.5A8.5 8.5 0 1 0 20 15"/><path d="M20 3.5v5h-5"/><path d="M9 12.5 11 14l4-4.5"/>`,
  goals: `<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/><path d="m18.5 3 .7 1.7 1.8.7-1.8.7-.7 1.7-.7-1.7-1.8-.7 1.8-.7Z"/>`,
};

export function navIcon(name: NavIcon): HTMLElement {
  const span = document.createElement("span");
  span.className = "nav-icon";
  span.setAttribute("aria-hidden", "true");
  span.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${ICONS[name]}</svg>`;
  return span;
}

export function backIcon(): HTMLElement {
  const span = document.createElement("span");
  span.className = "back-icon";
  span.setAttribute("aria-hidden", "true");
  span.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m14.5 5-7 7 7 7"/><path d="M8 12h11"/></svg>`;
  return span;
}
