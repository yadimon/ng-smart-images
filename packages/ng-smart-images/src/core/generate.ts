import { createHash } from 'node:crypto';
import { constants } from 'node:fs';
import { access, readFile } from 'node:fs/promises';
import path from 'node:path';

import { loadProjectConfig, resolveEntryConfig } from './config.js';
import { generateImageArtifact } from './optimize.js';
import type {
  GenerateHashedOptions,
  GeneratedProjectArtifacts,
  SmartImageReuseCache,
  SmartImageReuseCacheEntry,
} from './types.js';
import type { SmartImagesManifest } from '../runtime/manifest.js';
import { writeTextFile } from '../utils/fs.js';

const IMAGE_REUSE_CACHE_FILE_NAME = '.ng-smart-images.cache.json';
const IMAGE_REUSE_CACHE_SCHEMA_VERSION = 1;

let installedPackageVersionPromise: Promise<string> | null = null;

export async function generateHashedImages(
  options: GenerateHashedOptions = {},
): Promise<GeneratedProjectArtifacts> {
  const cwd = path.resolve(options.cwd ?? process.cwd());
  const { manifestPath, config } = await loadProjectConfig(cwd, options.manifestPath);
  const generatedAssetsDir = path.join(cwd, config.generatedAssetsDir);
  const assetsRootAbsolute = path.join(cwd, config.assetsRoot);
  const runtimeManifestJsonPath = path.join(cwd, config.runtimeManifestJsonPath);
  const runtimeCacheJsonPath = path.join(
    path.dirname(runtimeManifestJsonPath),
    IMAGE_REUSE_CACHE_FILE_NAME,
  );
  const runtimeManifestTsPath = path.join(cwd, config.runtimeManifestTsPath);
  const runtimeHelperTsPath = path.join(cwd, config.runtimeHelperTsPath);
  const runtimeManifest: SmartImagesManifest = {};
  const previousRuntimeManifest = await loadRuntimeManifest(runtimeManifestJsonPath);
  const previousReuseCache = await loadReuseCache(runtimeCacheJsonPath);
  const packageVersion = await getInstalledPackageVersion();
  const runtimeReuseCache: SmartImageReuseCache = {
    schemaVersion: IMAGE_REUSE_CACHE_SCHEMA_VERSION,
    packageVersion,
    entries: {},
  };

  for (const sourceKey of Object.keys(config.images).sort()) {
    const resolvedEntry = resolveEntryConfig(sourceKey, config, cwd);
    if (!resolvedEntry) {
      continue;
    }

    const fingerprint = await createEntryFingerprint({
      sourceKey,
      sourcePath: resolvedEntry.sourcePath,
      sizes: resolvedEntry.sizes,
      quality: resolvedEntry.quality,
      extensions: resolvedEntry.extensions,
      packageVersion,
    });
    const reusableEntry = await tryReuseGeneratedEntry({
      existingEntry: previousRuntimeManifest[sourceKey],
      cacheEntry: previousReuseCache.entries[sourceKey],
      fingerprint,
      outputRoot: generatedAssetsDir,
      publicPath: config.publicPath,
    });
    if (reusableEntry) {
      runtimeManifest[sourceKey] = reusableEntry;
      runtimeReuseCache.entries[sourceKey] = { fingerprint };
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
    runtimeReuseCache.entries[sourceKey] = { fingerprint };
  }

  await writeTextFile(runtimeManifestJsonPath, `${JSON.stringify(runtimeManifest, null, 2)}\n`);
  await writeTextFile(runtimeCacheJsonPath, `${JSON.stringify(runtimeReuseCache, null, 2)}\n`);
  await writeTextFile(runtimeManifestTsPath, buildRuntimeManifestModule(runtimeManifest));
  await writeTextFile(
    runtimeHelperTsPath,
    buildRuntimeHelperModule(path.basename(runtimeManifestTsPath, '.ts')),
  );

  return {
    manifestPath,
    runtimeManifestJsonPath,
    runtimeCacheJsonPath,
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
  cacheEntry: SmartImageReuseCacheEntry | undefined;
  fingerprint: string;
  outputRoot: string;
  publicPath: string;
}): Promise<SmartImagesManifest[string] | null> {
  if (!input.existingEntry || !input.cacheEntry) {
    return null;
  }

  if (input.cacheEntry.fingerprint !== input.fingerprint) {
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

async function loadReuseCache(filePath: string): Promise<SmartImageReuseCache> {
  try {
    const raw = await readFile(filePath, 'utf8');
    if (!raw.trim()) {
      return createEmptyReuseCache();
    }

    const parsed = JSON.parse(raw) as Partial<SmartImageReuseCache>;
    if (parsed.schemaVersion !== IMAGE_REUSE_CACHE_SCHEMA_VERSION) {
      return createEmptyReuseCache();
    }

    const entries = Object.fromEntries(
      Object.entries(parsed.entries ?? {}).flatMap(([sourceKey, value]) =>
        value && typeof value.fingerprint === 'string'
          ? [[sourceKey, { fingerprint: value.fingerprint }]]
          : [],
      ),
    );

    return {
      schemaVersion: IMAGE_REUSE_CACHE_SCHEMA_VERSION,
      packageVersion: typeof parsed.packageVersion === 'string' ? parsed.packageVersion : '',
      entries,
    };
  } catch {
    return createEmptyReuseCache();
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

function createEmptyReuseCache(): SmartImageReuseCache {
  return {
    schemaVersion: IMAGE_REUSE_CACHE_SCHEMA_VERSION,
    packageVersion: '',
    entries: {},
  };
}

async function createEntryFingerprint(input: {
  sourceKey: string;
  sourcePath: string;
  sizes: number[];
  quality: number;
  extensions: string[];
  packageVersion: string;
}): Promise<string> {
  const sourceBytes = await readFile(input.sourcePath);
  const sourceHash = createHash('sha256').update(sourceBytes).digest('hex');

  return createHash('sha256')
    .update(
      JSON.stringify({
        sourceHash,
        sourceKey: input.sourceKey,
        entryConfig: {
          sizes: input.sizes,
          quality: input.quality,
          extensions: input.extensions,
        },
        packageVersion: input.packageVersion,
      }),
    )
    .digest('hex');
}

async function getInstalledPackageVersion(): Promise<string> {
  installedPackageVersionPromise ??= readFile(
    new URL('../../package.json', import.meta.url),
    'utf8',
  )
    .then((raw) => JSON.parse(raw) as { version?: unknown })
    .then((pkg) => (typeof pkg.version === 'string' ? pkg.version : '0.0.0'));

  return installedPackageVersionPromise;
}
