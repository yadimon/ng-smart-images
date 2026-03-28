#!/usr/bin/env node

import { rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const packageRoot = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(packageRoot, '..');
const distRoot = path.join(repoRoot, 'dist');

await rm(distRoot, { recursive: true, force: true });
await execFileAsync('npx', ['tsc', '-p', 'tsconfig.json'], {
  cwd: repoRoot,
  windowsHide: true,
});
