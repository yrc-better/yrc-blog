import { every } from "../primitives/motion/schedule.client.ts";

const clock = document.querySelector<HTMLElement>("[data-clock]");

if (clock) {
  const format = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Shanghai",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  every(1000, () => {
    clock.textContent = `SHA ${format.format(new Date())}`;
  });
}
