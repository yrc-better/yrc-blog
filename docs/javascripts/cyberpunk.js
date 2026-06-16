/* 霓虹终端 · 轻量增强
   - hero 标语打字机效果(终端质感)
   - 全程尊重 prefers-reduced-motion:偏好减弱动效时直接显示完整文本 */
(function () {
  "use strict";

  function ready(fn) {
    if (document.readyState !== "loading") fn();
    else document.addEventListener("DOMContentLoaded", fn);
  }

  ready(function () {
    var el = document.querySelector(".cyber-hero__eyebrow .type");
    if (!el) return;

    var full = el.getAttribute("data-type") || el.textContent;
    var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduce) {
      el.textContent = full;
      return;
    }

    el.textContent = "";
    var i = 0;
    (function step() {
      if (i <= full.length) {
        el.textContent = full.slice(0, i);
        i += 1;
        setTimeout(step, 55);
      }
    })();
  });
})();
