const CJK = /[\u3400-\u9fff\uf900-\ufaff]/g;
const LATIN_WORD = /[A-Za-z0-9]+(?:[-'][A-Za-z0-9]+)*/g;
const CJK_PER_MINUTE = 400;
const WORDS_PER_MINUTE = 220;

export function readingMinutes(markdown: string | undefined): number {
  if (!markdown) return 1;
  const prose = markdown.replace(/```[\s\S]*?```/g, "").replace(/\$\$[\s\S]*?\$\$/g, "");
  const cjk = prose.match(CJK)?.length ?? 0;
  const words = prose.replace(CJK, " ").match(LATIN_WORD)?.length ?? 0;
  return Math.max(1, Math.round(cjk / CJK_PER_MINUTE + words / WORDS_PER_MINUTE));
}
