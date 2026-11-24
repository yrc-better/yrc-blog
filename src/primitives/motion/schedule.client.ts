export type Cancel = () => void;

export function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function every(intervalMs: number, tick: () => void): Cancel {
  tick();
  const handle = window.setInterval(tick, intervalMs);
  return () => window.clearInterval(handle);
}

export function typeOut(element: HTMLElement, text: string, charsPerSecond = 22): Cancel {
  if (prefersReducedMotion() || text.length === 0) {
    element.textContent = text;
    return () => undefined;
  }
  let shown = 0;
  element.textContent = "";
  const handle = window.setInterval(() => {
    shown += 1;
    element.textContent = text.slice(0, shown);
    if (shown >= text.length) window.clearInterval(handle);
  }, 1000 / charsPerSecond);
  return () => window.clearInterval(handle);
}
