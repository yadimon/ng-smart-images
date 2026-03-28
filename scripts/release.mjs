#!/usr/bin/env node

import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const releaseType = process.argv[2];
const validReleaseTypes = new Set(['patch', 'minor', 'major']);

if (!validReleaseTypes.has(releaseType)) {
  console.error('Usage: npm run release:<patch|minor|major>');
  process.exit(1);
}

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

async function runCommand(command, args) {
  await new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: process.cwd(),
      windowsHide: true,
      stdio: 'inherit',
      shell: process.platform === 'win32',
    });

    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`${command} ${args.join(' ')} exited with code ${code ?? 'unknown'}`));
    });

    child.on('error', reject);
  });
}
