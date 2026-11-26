// Publishes dist/ as the only commit of the gh-pages branch (GitHub Pages source).
// Run through `npm run deploy`, which tests and builds first.
import { execFileSync } from "node:child_process";
import { rmSync, writeFileSync } from "node:fs";

const git = (args, cwd = ".") => execFileSync("git", args, { cwd, encoding: "utf8" }).trim();

const remote = git(["remote", "get-url", "origin"]);
const source = git(["rev-parse", "--short", "HEAD"]);

writeFileSync("dist/.nojekyll", "");
git(["init", "-b", "gh-pages"], "dist");
git(["add", "-A"], "dist");
git(["commit", "-m", `Deploy ${source}`], "dist");
// forced on purpose: the branch holds only generated files
git(["push", "--force", remote, "gh-pages"], "dist");
rmSync("dist/.git", { recursive: true, force: true });

console.log(`Deployed ${source} to gh-pages`);
