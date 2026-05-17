#!/usr/bin/env node
// Smoke test the freshly published @yadimon/ng-smart-images:
// - installs the latest version (or SMOKE_PUBLISHED_VERSION) in a temp dir
// - dynamic-imports the main export and verifies it loads
//
// We do NOT rebuild examples/basic-app in the smoke (too heavy + slow);
// the per-PR check already runs `build:example` against the local workspace,
// so packaging regressions are the only thing this catches.
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync, existsSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const PKG = "@yadimon/ng-smart-images";
const VERSION = process.env.SMOKE_PUBLISHED_VERSION ?? "latest";

function npm(args, cwd) {
  // On Node >=20 Windows requires shell: true to spawn .cmd / .bat files.
  return execFileSync("npm", args, { cwd, stdio: "inherit", shell: true });
}

const dir = mkdtempSync(join(tmpdir(), "ng-smart-images-smoke-"));
console.log(`[smoke] tmp dir: ${dir}`);

try {
  writeFileSync(
    join(dir, "package.json"),
    JSON.stringify({ name: "smoke", private: true, type: "module" }, null, 2),
  );

  console.log(`[smoke] installing ${PKG}@${VERSION} ...`);
  npm(["install", "--no-audit", "--no-fund", `${PKG}@${VERSION}`], dir);

  const installedPkgPath = join(dir, "node_modules", "@yadimon", "ng-smart-images", "package.json");
  if (!existsSync(installedPkgPath)) {
    throw new Error(`installed package.json missing: ${installedPkgPath}`);
  }
  const installed = JSON.parse(readFileSync(installedPkgPath, "utf8"));
  console.log(`[smoke] installed version: ${installed.version}`);

  // The main entry re-exports the Angular adapter which needs @angular/core
  // (peer dep). The `./runtime` subpath is Node-only and the right target
  // for a packaging smoke that runs without an Angular install.
  const runtimeEntryRel = installed.exports?.["./runtime"]?.default
    ?? installed.exports?.["./runtime"]?.import
    ?? "./dist/runtime/index.js";
  const entry = join(dir, "node_modules", "@yadimon", "ng-smart-images", runtimeEntryRel);
  if (!existsSync(entry)) {
    throw new Error(`runtime entry missing: ${entry}`);
  }

  const mod = await import(pathToFileURL(entry).href);
  const exportNames = Object.keys(mod);
  console.log(`[smoke] runtime exports: ${exportNames.join(", ")}`);
  if (exportNames.length === 0) {
    throw new Error("no exports from runtime entry");
  }

  console.log(`[smoke] OK -- ${PKG}@${installed.version} packaging looks healthy`);
} finally {
  rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
}
