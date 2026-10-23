export type View = (param?: string) => HTMLElement;

const routes = new Map<string, View>();

export function route(path: string, view: View): void {
  routes.set(path, view);
}

export function render(): void {
  window.dispatchEvent(new Event("route:before"));
  const raw = location.hash.replace(/^#\/?/, "");
  const [name, param] = raw.split("/");
  const view = routes.get(name || "chat") ?? routes.get("chat");
  const app = document.getElementById("app");
  if (!app || !view) return;
  app.replaceChildren(view(param));
  app.scrollTop = 0;
  window.scrollTo(0, 0);
}

export function start(): void {
  window.addEventListener("hashchange", render);
  render();
}
