const MAX_LENGTH = 48;

const requested = decodeURIComponent(window.location.pathname);
const shown = requested.length > MAX_LENGTH ? `${requested.slice(0, MAX_LENGTH - 1)}…` : requested;

document.querySelectorAll<HTMLElement>("[data-requested-path]").forEach((element) => {
  element.textContent = shown;
});
