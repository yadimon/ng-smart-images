#!/usr/bin/env node

import path from 'node:path';

import { generateHashedImages } from './core/generate.js';
import { syncProjectManifest } from './core/manifest-sync.js';
import { updateBundle } from './core/update-bundle.js';

interface ParsedArgs {
  command: string;
  flags: Record<string, string>;
}

async function main(): Promise<void> {
  const parsed = parseArgs(process.argv.slice(2));

  switch (parsed.command) {
    case 'sync-manifest': {
      const result = await syncProjectManifest({
        cwd: parsed.flags.cwd,
        manifestPath: parsed.flags.manifest,
      });
      console.log(
        `synced ${result.added.length} image entries into ${relativeOrAbsolute(result.manifestPath)}`,
      );
      return;
    }
    case 'generate-hashed': {
      const result = await generateHashedImages({
        cwd: parsed.flags.cwd,
        manifestPath: parsed.flags.manifest,
      });
      console.log(
        `generated ${Object.keys(result.runtimeManifest).length} hashed image entries into ${relativeOrAbsolute(
          result.generatedAssetsDir,
        )}`,
      );
      return;
    }
    case 'update-bundle': {
      const distPath = parsed.flags.dist;
      if (!distPath) {
        throw new Error('Missing required --dist argument for update-bundle.');
      }
      const result = await updateBundle({
        cwd: parsed.flags.cwd,
        manifestPath: parsed.flags.manifest,
        distPath,
      });
      console.log(
        `updated ${result.updatedFiles.length} bundle files and generated ${result.generated.length} additional images`,
      );
      return;
    }
    default:
      printHelp();
      process.exitCode = parsed.command ? 1 : 0;
  }
}

function parseArgs(args: string[]): ParsedArgs {
  const [command = '', ...rest] = args;
  const flags: Record<string, string> = {};

  for (let index = 0; index < rest.length; index += 1) {
    const value = rest[index];
    if (!value.startsWith('--')) {
      continue;
    }
    const key = value.slice('--'.length);
    const nextValue = rest[index + 1];
    if (nextValue && !nextValue.startsWith('--')) {
      flags[key] = nextValue;
      index += 1;
    } else {
      flags[key] = 'true';
    }
  }

  return {
    command,
    flags,
  };
}

function relativeOrAbsolute(value: string): string {
  const cwd = process.cwd();
  const relative = path.relative(cwd, value);
  return relative && !relative.startsWith('..') ? relative : value;
}

function printHelp(): void {
  console.log(`ng-smart-images

Usage:
  ng-smart-images sync-manifest [--manifest smart-images.manifest.json] [--cwd path]
  ng-smart-images generate-hashed [--manifest smart-images.manifest.json] [--cwd path]
  ng-smart-images update-bundle --dist dist/app/browser [--manifest smart-images.manifest.json] [--cwd path]
`);
}

void main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exitCode = 1;
});
