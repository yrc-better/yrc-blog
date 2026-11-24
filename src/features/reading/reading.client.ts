const bar = document.querySelector<HTMLElement>("[data-progress]");
const prose = document.querySelector<HTMLElement>("[data-prose]");

if (bar && prose) {
  const update = (): void => {
    const rect = prose.getBoundingClientRect();
    const travel = Math.max(1, rect.height - window.innerHeight);
    const done = Math.min(1, Math.max(0, -rect.top / travel));
    bar.style.transform = `scaleX(${done})`;
  };
  update();
  window.addEventListener("scroll", update, { passive: true });
  window.addEventListener("resize", update);
}

const tocLinks = Array.from(document.querySelectorAll<HTMLAnchorElement>("[data-toc] a"));

if (tocLinks.length > 0) {
  const linkFor = new Map(tocLinks.map((link) => [decodeURIComponent(link.hash.slice(1)), link]));
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        tocLinks.forEach((link) => link.removeAttribute("aria-current"));
        linkFor.get(entry.target.id)?.setAttribute("aria-current", "true");
      }
    },
    { rootMargin: "-15% 0px -75% 0px" },
  );
  for (const id of linkFor.keys()) {
    const heading = document.getElementById(id);
    if (heading) observer.observe(heading);
  }
}
