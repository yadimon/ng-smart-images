import { constants } from 'node:fs';
import { access, readFile, stat } from 'node:fs/promises';
import path from 'node:path';

import { loadProjectConfig, resolveEntryConfig } from './config.js';
import { generateImageArtifact } from './optimize.js';
import type { GenerateHashedOptions, GeneratedProjectArtifacts } from './types.js';
import type { SmartImagesManifest } from '../runtime/manifest.js';
import { writeTextFile } from '../utils/fs.js';

export async function generateHashedImages(
  options: GenerateHashedOptions = {},
): Promise<GeneratedProjectArtifacts> {
  const cwd = path.resolve(options.cwd ?? process.cwd());
  const { manifestPath, config } = await loadProjectConfig(cwd, options.manifestPath);
  const generatedAssetsDir = path.join(cwd, config.generatedAssetsDir);
  const assetsRootAbsolute = path.join(cwd, config.assetsRoot);
  const runtimeManifestJsonPath = path.join(cwd, config.runtimeManifestJsonPath);
  const runtimeManifestTsPath = path.join(cwd, config.runtimeManifestTsPath);
  const runtimeHelperTsPath = path.join(cwd, config.runtimeHelperTsPath);
  const runtimeManifest: SmartImagesManifest = {};
  const previousRuntimeManifest = await loadRuntimeManifest(runtimeManifestJsonPath);
  const runtimeManifestMtimeMs = await getFileModifiedTime(runtimeManifestJsonPath);
  const projectManifestMtimeMs = await getFileModifiedTime(manifestPath);

  for (const sourceKey of Object.keys(config.images).sort()) {
    const resolvedEntry = resolveEntryConfig(sourceKey, config, cwd);
    if (!resolvedEntry) {
      continue;
    }

    const reusableEntry = await tryReuseGeneratedEntry({
      existingEntry: previousRuntimeManifest[sourceKey],
      runtimeManifestMtimeMs,
      projectManifestMtimeMs,
      sourcePath: resolvedEntry.sourcePath,
      outputRoot: generatedAssetsDir,
      publicPath: config.publicPath,
    });
    if (reusableEntry) {
      runtimeManifest[sourceKey] = reusableEntry;
      continue;
    }

    const artifact = await generateImageArtifact({
      sourceKey,
      sourcePath: resolvedEntry.sourcePath,
      sourceRootPath: assetsRootAbsolute,
      publicPath: config.publicPath,
      outputRoot: generatedAssetsDir,
      entryConfig: resolvedEntry,
    });
    runtimeManifest[sourceKey] = artifact.entry;
  }

  await writeTextFile(runtimeManifestJsonPath, `${JSON.stringify(runtimeManifest, null, 2)}\n`);
  await writeTextFile(runtimeManifestTsPath, buildRuntimeManifestModule(runtimeManifest));
  await writeTextFile(
    runtimeHelperTsPath,
    buildRuntimeHelperModule(path.basename(runtimeManifestTsPath, '.ts')),
  );

  return {
    manifestPath,
    runtimeManifestJsonPath,
    runtimeManifestTsPath,
    runtimeHelperTsPath,
    generatedAssetsDir,
    runtimeManifest,
  };
}

function buildRuntimeManifestModule(runtimeManifest: SmartImagesManifest): string {
  return `import type { SmartImagesManifest } from '@yadimon/ng-smart-images/runtime';\n\nconst manifest: SmartImagesManifest = ${JSON.stringify(
    runtimeManifest,
    null,
    2,
  )};\n\nexport default manifest;\n`;
}

function buildRuntimeHelperModule(runtimeManifestBaseName: string): string {
  return `import manifest from './${runtimeManifestBaseName}.js';\nimport { createSmartImageResolver } from '@yadimon/ng-smart-images/runtime';\n\nconst resolver = createSmartImageResolver(manifest);\n\nexport const hashed = (path: string): string => resolver.hashed(path);\nexport const imageEntry = (path: string) => resolver.imageEntry(path);\nexport const imagePlaceholder = (path: string): string => resolver.imagePlaceholder(path);\nexport const imageSources = (path: string) => resolver.imageSources(path);\nexport const hasImage = (path: string): boolean => resolver.hasImage(path);\n\nexport default resolver;\n`;
}

async function tryReuseGeneratedEntry(input: {
  existingEntry: SmartImagesManifest[string] | undefined;
  runtimeManifestMtimeMs: number | null;
  projectManifestMtimeMs: number | null;
  sourcePath: string;
  outputRoot: string;
  publicPath: string;
}): Promise<SmartImagesManifest[string] | null> {
  if (!input.existingEntry || input.runtimeManifestMtimeMs === null) {
    return null;
  }

  const sourceMtimeMs = await getFileModifiedTime(input.sourcePath);
  if (sourceMtimeMs === null) {
    return null;
  }

  const freshnessFloor = Math.max(sourceMtimeMs, input.projectManifestMtimeMs ?? 0);
  if (input.runtimeManifestMtimeMs < freshnessFloor) {
    return null;
  }

  const generatedFilesExist = await allGeneratedFilesExist(
    input.existingEntry,
    input.outputRoot,
    input.publicPath,
  );
  return generatedFilesExist ? input.existingEntry : null;
}

async function allGeneratedFilesExist(
  entry: SmartImagesManifest[string],
  outputRoot: string,
  publicPath: string,
): Promise<boolean> {
  if (entry.sources.length === 0) {
    return false;
  }

  for (const source of entry.sources) {
    const generatedPath = resolveGeneratedPath(source.src, outputRoot, publicPath);
    if (!generatedPath || !(await fileExists(generatedPath))) {
      return false;
    }
  }

  return true;
}

function resolveGeneratedPath(
  sourceSrc: string,
  outputRoot: string,
  publicPath: string,
): string | null {
  const normalizedPublicPath = normalizePublicPath(publicPath);
  if (sourceSrc !== normalizedPublicPath && !sourceSrc.startsWith(`${normalizedPublicPath}/`)) {
    return null;
  }

  const relativePath = sourceSrc.slice(normalizedPublicPath.length).replace(/^\/+/, '');
  if (!relativePath) {
    return null;
  }

  return path.join(outputRoot, relativePath);
}

function normalizePublicPath(publicPath: string): string {
  const trimmed = publicPath.replace(/\/+$/, '');
  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
}

async function loadRuntimeManifest(filePath: string): Promise<SmartImagesManifest> {
  try {
    const raw = await readFile(filePath, 'utf8');
    if (!raw.trim()) {
      return {};
    }

    return JSON.parse(raw) as SmartImagesManifest;
  } catch {
    return {};
  }
}

async function getFileModifiedTime(filePath: string): Promise<number | null> {
  try {
    const fileStat = await stat(filePath);
    return fileStat.mtimeMs;
  } catch {
    return null;
  }
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}
