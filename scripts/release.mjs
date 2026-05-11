#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pkgPath = path.join(repoRoot, 'packages/ng-smart-images/package.json');
const lockPath = path.join(repoRoot, 'package-lock.json');

const bump = process.argv[2];
if (!['patch', 'minor', 'major'].includes(bump)) {
  console.error(`Usage: node scripts/release.mjs <patch|minor|major>`);
  process.exit(1);
}

const isWindows = process.platform === 'win32';

// git.exe handles its own argv parsing, so we pass args verbatim without a shell.
// This avoids cmd.exe re-parsing characters like ()@: inside the release commit
// message ("chore(release): @yadimon/ng-smart-images@X.Y.Z").
const runGit = (args) => {
  const result = spawnSync('git', args, { cwd: repoRoot, stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
};

const captureGit = (args) => {
  const result = spawnSync('git', args, { cwd: repoRoot, encoding: 'utf8' });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    if (result.stderr) process.stderr.write(result.stderr);
    process.exit(result.status ?? 1);
  }
  return result.stdout.trim();
};

// npm is npm.cmd on Windows; Node refuses to spawn .cmd files without a shell
// (CVE-2024-27980). The npm args here contain no shell metacharacters, so this
// is safe.
const runNpm = (args) => {
  const result = spawnSync('npm', args, { cwd: repoRoot, stdio: 'inherit', shell: isWindows });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
};

const status = captureGit(['status', '--porcelain']);
if (status) {
  console.error('Working tree is not clean. Commit or stash changes before releasing.');
  console.error(status);
  process.exit(1);
}

runNpm(['version', bump, '--workspace', '@yadimon/ng-smart-images', '--no-git-tag-version']);

const version = JSON.parse(readFileSync(pkgPath, 'utf8')).version;
const tag = `v${version}`;
const message = `chore(release): @yadimon/ng-smart-images@${version}`;

runGit(['add', pkgPath, lockPath]);
runGit(['commit', '-m', message]);
runGit(['tag', '-a', tag, '-m', tag]);
runGit(['push', 'origin', 'HEAD', '--follow-tags']);

console.log(`\nReleased ${tag}. Publish workflow should now run on the pushed tag.`);
