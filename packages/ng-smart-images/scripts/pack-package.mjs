#!/usr/bin/env node

import { execFile } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.resolve(scriptDir, '..');
const repoRoot = path.resolve(packageRoot, '..', '..');
const artifactsDir = path.join(repoRoot, '.artifacts');
const npmCliEntrypoint = process.env.npm_execpath;

await mkdir(artifactsDir, { recursive: true });

if (npmCliEntrypoint) {
  await execFileAsync(process.execPath, [npmCliEntrypoint, 'run', 'build'], {
    cwd: packageRoot,
    windowsHide: true,
  });
  await execFileAsync(
    process.execPath,
    [npmCliEntrypoint, 'pack', '--pack-destination', artifactsDir],
    {
      cwd: packageRoot,
      windowsHide: true,
    },
  );
} else {
  const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  await execFileAsync(npmCommand, ['run', 'build'], {
    cwd: packageRoot,
    windowsHide: true,
  });
  await execFileAsync(npmCommand, ['pack', '--pack-destination', artifactsDir], {
    cwd: packageRoot,
    windowsHide: true,
  });
}
