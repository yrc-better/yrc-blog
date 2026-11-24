import { runChecks } from "./checks.ts";

const results = runChecks();
const failing = results.filter((result) => result.problems.length > 0);

for (const { check, problems } of results) {
  console.log(`${problems.length === 0 ? "✔" : "✖"} ${check.id}`);
}

if (failing.length > 0) {
  console.log("");
  for (const { check, problems } of failing) {
    console.log(`✖ [${check.id}] ${check.why}`);
    for (const problem of problems) {
      const where = problem.line ? `${problem.file}:${problem.line}` : problem.file;
      console.log(`    ${where}${problem.detail ? `  →  ${problem.detail}` : ""}`);
    }
    console.log(`  fix: ${check.fix}\n`);
  }
  const total = failing.reduce((sum, result) => sum + result.problems.length, 0);
  console.log(`repo-check: ${total} problem(s) in ${failing.length} check(s)`);
  process.exit(1);
}

console.log(`\nrepo-check: all ${results.length} checks passed`);
