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
const npmCmd = isWindows ? 'npm.cmd' : 'npm';

const run = (cmd, args) => {
  const result = spawnSync(cmd, args, { cwd: repoRoot, stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
};

const capture = (cmd, args) => {
  const result = spawnSync(cmd, args, { cwd: repoRoot, encoding: 'utf8' });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    if (result.stderr) process.stderr.write(result.stderr);
    process.exit(result.status ?? 1);
  }
  return result.stdout.trim();
};

const status = capture('git', ['status', '--porcelain']);
if (status) {
  console.error('Working tree is not clean. Commit or stash changes before releasing.');
  console.error(status);
  process.exit(1);
}

run(npmCmd, ['version', bump, '--workspace', '@yadimon/ng-smart-images', '--no-git-tag-version']);

const version = JSON.parse(readFileSync(pkgPath, 'utf8')).version;
const tag = `v${version}`;
const message = `chore(release): @yadimon/ng-smart-images@${version}`;

run('git', ['add', pkgPath, lockPath]);
run('git', ['commit', '-m', message]);
run('git', ['tag', '-a', tag, '-m', tag]);
run('git', ['push', 'origin', 'HEAD', '--follow-tags']);

console.log(`\nReleased ${tag}. Publish workflow should now run on the pushed tag.`);
