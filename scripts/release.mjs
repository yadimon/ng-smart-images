#!/usr/bin/env node

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { execa } from 'execa';

const releaseType = process.argv[2];
const validReleaseTypes = new Set(['patch', 'minor', 'major']);

if (!validReleaseTypes.has(releaseType)) {
  console.error('Usage: npm run release:<patch|minor|major>');
  process.exit(1);
}

await ensureCleanWorkingTree();
await runCommand('npm', ['run', 'verify']);
await runCommand('npm', ['run', 'publish:dry-run']);
await runCommand('npm', ['run', `version:${releaseType}`]);
const version = await readPackageVersion();
await runCommand('git', ['add', 'package-lock.json', 'packages/ng-smart-images/package.json']);
await runCommand('git', ['commit', '-m', `chore(release): v${version}`]);
await runCommand('git', ['tag', `v${version}`]);
await runCommand('git', ['push']);
await runCommand('git', ['push', '--tags']);

console.log('');
console.log('Release preparation finished.');
console.log(`Created commit and tag v${version}.`);
console.log(
  'Next step: publish the matching GitHub Release or run the Publish Package workflow manually.',
);

async function readPackageVersion() {
  const packageJsonPath = path.join(process.cwd(), 'packages', 'ng-smart-images', 'package.json');
  const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf8'));
  return packageJson.version;
}

async function ensureCleanWorkingTree() {
  const { stdout } = await execa('git', ['status', '--short'], {
    cwd: process.cwd(),
    windowsHide: true,
  });

  if (stdout.trim().length > 0) {
    throw new Error('Release aborted: working tree is not clean.');
  }
}

async function runCommand(command, args) {
  await execa(command, args, {
    cwd: process.cwd(),
    stdio: 'inherit',
    windowsHide: true,
  });
}
