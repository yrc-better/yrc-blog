const dialog = document.querySelector<HTMLDialogElement>("#command-palette");
const input = document.querySelector<HTMLInputElement>("[data-command-input]");
const list = document.querySelector<HTMLUListElement>("[data-command-list]");
const empty = document.querySelector<HTMLElement>("[data-command-empty]");

if (dialog && input && list && empty) {
  const options = Array.from(list.querySelectorAll<HTMLLIElement>("[role='option']"));
  let active = -1;

  const visible = (): HTMLLIElement[] => options.filter((option) => !option.hidden);

  const select = (index: number): void => {
    const shown = visible();
    options.forEach((option) => option.setAttribute("aria-selected", "false"));
    if (shown.length === 0) {
      active = -1;
      input.removeAttribute("aria-activedescendant");
      return;
    }
    active = (index + shown.length) % shown.length;
    const current = shown[active];
    if (!current) return;
    current.setAttribute("aria-selected", "true");
    input.setAttribute("aria-activedescendant", current.id);
    current.scrollIntoView({ block: "nearest" });
  };

  const filter = (): void => {
    const terms = input.value.toLowerCase().split(/\s+/).filter(Boolean);
    for (const option of options) {
      const haystack = option.dataset["search"] ?? "";
      option.hidden = !terms.every((term) => haystack.includes(term));
    }
    empty.hidden = visible().length > 0;
    select(0);
  };

  const go = (option: HTMLLIElement | undefined): void => {
    const href = option?.dataset["href"];
    if (href) window.location.assign(href);
  };

  const open = (): void => {
    if (dialog.open) return;
    input.value = "";
    filter();
    dialog.showModal();
    input.focus();
  };

  document.querySelectorAll<HTMLElement>("[data-command-open]").forEach((trigger) => {
    trigger.addEventListener("click", open);
  });

  document.addEventListener("keydown", (event) => {
    const typing = event.target instanceof HTMLElement && event.target.closest("input, textarea, [contenteditable]");
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
      event.preventDefault();
      if (dialog.open) dialog.close();
      else open();
    } else if (event.key === "/" && !typing && !dialog.open) {
      event.preventDefault();
      open();
    }
  });

  input.addEventListener("input", filter);

  input.addEventListener("keydown", (event) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      select(active + 1);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      select(active - 1);
    } else if (event.key === "Enter") {
      event.preventDefault();
      go(visible()[active]);
    }
  });

  list.addEventListener("click", (event) => {
    const option = event.target instanceof Element ? event.target.closest<HTMLLIElement>("[role='option']") : null;
    go(option ?? undefined);
  });

  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });
}
