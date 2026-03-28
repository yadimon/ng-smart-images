#!/usr/bin/env node

import { rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const scriptsRoot = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.resolve(scriptsRoot, '..');
const distRoot = path.join(packageRoot, 'dist');
const tscEntrypoint = path.join(
  packageRoot,
  '..',
  '..',
  'node_modules',
  'typescript',
  'bin',
  'tsc',
);

await rm(distRoot, { recursive: true, force: true });
await execFileAsync(process.execPath, [tscEntrypoint, '-p', 'tsconfig.json'], {
  cwd: packageRoot,
  windowsHide: true,
});
