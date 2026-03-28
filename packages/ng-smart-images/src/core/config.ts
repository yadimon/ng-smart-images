import { access, readFile } from 'node:fs/promises';
import path from 'node:path';
import { constants } from 'node:fs';

import type {
  SmartImageConfigEntry,
  SmartImageProjectManifest,
  SmartImageResolvedConfig,
  SmartImageResolvedEntry,
} from './types.js';
import type { SmartImageFormat } from '../runtime/manifest.js';
import { normalizeSourceKey } from './discovery.js';
import { toPosixPath, writeTextFile } from '../utils/fs.js';

const DEFAULT_MANIFEST_FILE = 'smart-images.manifest.json';
const DEFAULT_PUBLIC_PATH = '/assets/ng-smart-images';
const DEFAULT_ASSETS_ROOT = 'src/assets';
const DEFAULT_GENERATED_ASSETS_DIR = 'src/assets/ng-smart-images';
const DEFAULT_RUNTIME_MANIFEST_JSON = 'src/app/generated/ng-smart-images.manifest.json';
const DEFAULT_RUNTIME_MANIFEST_TS = 'src/app/generated/ng-smart-images.manifest.ts';
const DEFAULT_RUNTIME_HELPER_TS = 'src/app/generated/ng-smart-images.runtime.ts';
const DEFAULT_QUALITY = 76;
const DEFAULT_EXTENSIONS: SmartImageFormat[] = ['avif', 'webp', 'original'];

export interface LoadedConfig {
  manifestPath: string;
  config: SmartImageResolvedConfig;
}

export async function loadProjectConfig(
  cwd: string,
  manifestPathInput?: string,
): Promise<LoadedConfig> {
  const manifestPath = resolveManifestPath(cwd, manifestPathInput);
  const raw = await readProjectManifest(manifestPath);

  const config: SmartImageResolvedConfig = {
    assetsRoot: normalizeProjectPath(raw.assetsRoot ?? DEFAULT_ASSETS_ROOT),
    generatedAssetsDir: normalizeProjectPath(
      raw.generatedAssetsDir ?? DEFAULT_GENERATED_ASSETS_DIR,
    ),
    publicPath: normalizePublicPath(raw.publicPath ?? DEFAULT_PUBLIC_PATH),
    runtimeManifestJsonPath: normalizeProjectPath(
      raw.runtimeManifestJsonPath ?? DEFAULT_RUNTIME_MANIFEST_JSON,
    ),
    runtimeManifestTsPath: normalizeProjectPath(
      raw.runtimeManifestTsPath ?? DEFAULT_RUNTIME_MANIFEST_TS,
    ),
    runtimeHelperTsPath: normalizeProjectPath(raw.runtimeHelperTsPath ?? DEFAULT_RUNTIME_HELPER_TS),
    ignore: normalizeIgnore(
      raw.ignore ?? [],
      raw.generatedAssetsDir ?? DEFAULT_GENERATED_ASSETS_DIR,
    ),
    defaults: {
      ignore: false,
      sizes: normalizeSizes(raw.defaults?.sizes),
      quality: normalizeQuality(raw.defaults?.quality),
      extensions: normalizeExtensions(raw.defaults),
    },
    images: normalizeImageConfigMap(raw.images ?? {}, cwd),
  };

  return {
    manifestPath,
    config,
  };
}

export async function saveProjectManifest(
  manifestPath: string,
  config: SmartImageProjectManifest,
): Promise<void> {
  await writeTextFile(manifestPath, `${JSON.stringify(config, null, 2)}\n`);
}

export function resolveEntryConfig(
  sourceKey: string,
  config: SmartImageResolvedConfig,
  cwd: string,
): SmartImageResolvedEntry | null {
  const normalizedKey = normalizeSourceKey(sourceKey, cwd);
  const entry = config.images[normalizedKey];
  if (entry?.ignore) {
    return null;
  }

  return {
    sourceKey: normalizedKey,
    sourcePath: path.join(cwd, normalizedKey),
    sizes: normalizeSizes(entry?.sizes, config.defaults.sizes),
    quality: normalizeQuality(entry?.quality, config.defaults.quality),
    extensions: normalizeExtensions(entry, config.defaults.extensions),
  };
}

export function createDefaultProjectManifest(): SmartImageProjectManifest {
  return {
    assetsRoot: DEFAULT_ASSETS_ROOT,
    generatedAssetsDir: DEFAULT_GENERATED_ASSETS_DIR,
    publicPath: DEFAULT_PUBLIC_PATH,
    runtimeManifestJsonPath: DEFAULT_RUNTIME_MANIFEST_JSON,
    runtimeManifestTsPath: DEFAULT_RUNTIME_MANIFEST_TS,
    runtimeHelperTsPath: DEFAULT_RUNTIME_HELPER_TS,
    ignore: ['src/assets/archive/**', 'src/assets/ng-smart-images/**'],
    defaults: {
      quality: DEFAULT_QUALITY,
      extensions: [...DEFAULT_EXTENSIONS],
      sizes: [],
    },
    images: {},
  };
}

async function readProjectManifest(manifestPath: string): Promise<SmartImageProjectManifest> {
  try {
    await access(manifestPath, constants.F_OK);
  } catch {
    return createDefaultProjectManifest();
  }

  const raw = await readFile(manifestPath, 'utf8');
  if (!raw.trim()) {
    return createDefaultProjectManifest();
  }

  return JSON.parse(raw) as SmartImageProjectManifest;
}

function resolveManifestPath(cwd: string, manifestPathInput?: string): string {
  return path.resolve(cwd, manifestPathInput ?? DEFAULT_MANIFEST_FILE);
}

function normalizeProjectPath(value: string): string {
  return toPosixPath(value).replace(/^\.\/+/, '');
}

function normalizePublicPath(value: string): string {
  const normalized = normalizeProjectPath(value);
  return normalized.startsWith('/') ? normalized : `/${normalized}`;
}

function normalizeIgnore(values: string[], generatedAssetsDir: string): string[] {
  return Array.from(
    new Set(
      [
        ...values,
        normalizeProjectPath(generatedAssetsDir),
        `${normalizeProjectPath(generatedAssetsDir)}/**`,
      ]
        .map((value) => normalizeProjectPath(value))
        .filter((value) => value.length > 0),
    ),
  );
}

function normalizeImageConfigMap(
  input: Record<string, SmartImageConfigEntry>,
  cwd: string,
): Record<string, SmartImageConfigEntry> {
  return Object.fromEntries(
    Object.entries(input).map(([key, value]) => [normalizeSourceKey(key, cwd), value]),
  );
}

function normalizeSizes(input?: number[], fallback: number[] = []): number[] {
  if (!Array.isArray(input) || input.length === 0) {
    return [...fallback];
  }

  return Array.from(
    new Set(input.filter((value): value is number => Number.isFinite(value) && value > 0)),
  ).sort((left, right) => left - right);
}

function normalizeQuality(input?: number, fallback = DEFAULT_QUALITY): number {
  if (typeof input !== 'number' || !Number.isFinite(input)) {
    return fallback;
  }
  return Math.max(1, Math.min(100, Math.round(input)));
}

function normalizeExtensions(
  input?: SmartImageConfigEntry,
  fallback: SmartImageFormat[] = DEFAULT_EXTENSIONS,
): SmartImageFormat[] {
  const source = Array.isArray(input?.extensions)
    ? input.extensions
    : input?.extension
      ? Array.isArray(input.extension)
        ? input.extension
        : [input.extension]
      : fallback;
  const normalized = source.filter(
    (value): value is SmartImageFormat =>
      value === 'avif' || value === 'webp' || value === 'original',
  );
  return normalized.length > 0 ? Array.from(new Set(normalized)) : [...fallback];
}
