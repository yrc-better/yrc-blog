import { typeOut } from "../../primitives/motion/schedule.client.ts";

document.querySelectorAll<HTMLElement>("[data-typeout]").forEach((element) => {
  typeOut(element, element.dataset["typeout"] ?? element.textContent);
});
