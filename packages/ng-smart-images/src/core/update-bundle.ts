import { access, readFile } from 'node:fs/promises';
import path from 'node:path';
import { constants } from 'node:fs';

import { loadProjectConfig, resolveEntryConfig } from './config.js';
import { generateImageArtifact } from './optimize.js';
import type { UpdateBundleOptions } from './types.js';
import type { SmartImagesManifest } from '../runtime/manifest.js';
import {
  isStaticLocalAssetReference,
  normalizeSourceKey,
  resolveAssetUrlToSourceKey,
} from './discovery.js';
import { listFilesRecursive, writeTextFile } from '../utils/fs.js';

const OUTPUT_FILE_PATTERN = /\.(css|html)$/i;

export async function updateBundle(
  options: UpdateBundleOptions,
): Promise<{ updatedFiles: string[]; generated: string[] }> {
  const cwd = path.resolve(options.cwd ?? process.cwd());
  const distPath = path.resolve(cwd, options.distPath);
  const { config } = await loadProjectConfig(cwd, options.manifestPath);
  const manifestCache = await loadGeneratedRuntimeManifest(cwd, config.runtimeManifestJsonPath);
  const generatedDistFiles = new Set<string>();

  const ensureEntry = async (sourceKey: string) => {
    const normalizedKey = normalizeSourceKey(sourceKey, cwd);
    const existing = manifestCache[normalizedKey];
    if (existing) {
      return existing;
    }

    const resolvedEntry = resolveEntryConfig(normalizedKey, config, cwd);
    if (!resolvedEntry) {
      return null;
    }
    try {
      await access(resolvedEntry.sourcePath, constants.F_OK);
    } catch {
      return null;
    }

    const artifact = await generateImageArtifact({
      sourceKey: normalizedKey,
      sourcePath: resolvedEntry.sourcePath,
      sourceRootPath: path.join(cwd, config.assetsRoot),
      publicPath: config.publicPath,
      outputRoot: path.join(distPath, config.publicPath.replace(/^\/+/, '')),
      entryConfig: resolvedEntry,
    });
    manifestCache[normalizedKey] = artifact.entry;
    generatedDistFiles.add(normalizedKey);
    return artifact.entry;
  };

  const files = await listFilesRecursive(distPath);
  const updatedFiles: string[] = [];

  for (const filePath of files) {
    if (!OUTPUT_FILE_PATTERN.test(filePath)) {
      continue;
    }

    const original = await readFile(filePath, 'utf8');
    const rewritten =
      path.extname(filePath).toLowerCase() === '.css'
        ? await rewriteCssContent(original, ensureEntry, config.assetsRoot, cwd)
        : await rewriteHtmlContent(original, ensureEntry, config.assetsRoot, cwd);
    if (rewritten !== original) {
      await writeTextFile(filePath, rewritten);
      updatedFiles.push(filePath);
    }
  }

  return {
    updatedFiles,
    generated: [...generatedDistFiles].sort(),
  };
}

async function rewriteHtmlContent(
  content: string,
  ensureEntry: (sourceKey: string) => Promise<SmartImagesManifest[string] | null>,
  assetsRoot: string,
  cwd: string,
): Promise<string> {
  return replaceAsync(
    content,
    /(['"])(\/?assets\/[^'"]+\.(?:avif|gif|jpe?g|png|webp))\1/gi,
    async (fullMatch, quote: string, assetUrl: string) => {
      if (!isStaticLocalAssetReference(assetUrl)) {
        return fullMatch;
      }
      const sourceKey = resolveAssetUrlToSourceKey(assetUrl, assetsRoot, cwd);
      if (!sourceKey) {
        return fullMatch;
      }
      const entry = await ensureEntry(sourceKey);
      return entry ? `${quote}${entry.fallbackSrc}${quote}` : fullMatch;
    },
  );
}

async function rewriteCssContent(
  content: string,
  ensureEntry: (sourceKey: string) => Promise<SmartImagesManifest[string] | null>,
  assetsRoot: string,
  cwd: string,
): Promise<string> {
  return replaceAsync(
    content,
    /url\(\s*(?:'([^']+)'|"([^"]+)"|([^'")]+))\s*\)/gi,
    async (fullMatch, singleQuoted: string, doubleQuoted: string, bare: string) => {
      const assetUrl = singleQuoted ?? doubleQuoted ?? bare ?? '';
      if (!isStaticLocalAssetReference(assetUrl)) {
        return fullMatch;
      }
      const sourceKey = resolveAssetUrlToSourceKey(assetUrl, assetsRoot, cwd);
      if (!sourceKey) {
        return fullMatch;
      }
      const entry = await ensureEntry(sourceKey);
      return entry ? `url("${entry.fallbackSrc}")` : fullMatch;
    },
  );
}

async function replaceAsync(
  input: string,
  pattern: RegExp,
  replacer: (...args: string[]) => Promise<string>,
): Promise<string> {
  const matches = [...input.matchAll(pattern)];
  if (matches.length === 0) {
    return input;
  }

  let output = '';
  let lastIndex = 0;
  for (const match of matches) {
    const fullMatch = match[0];
    const matchIndex = match.index ?? 0;
    output += input.slice(lastIndex, matchIndex);
    output += await replacer(...(match as unknown as string[]));
    lastIndex = matchIndex + fullMatch.length;
  }

  output += input.slice(lastIndex);
  return output;
}

async function loadGeneratedRuntimeManifest(
  cwd: string,
  runtimeManifestJsonPath: string,
): Promise<SmartImagesManifest> {
  const filePath = path.join(cwd, runtimeManifestJsonPath);
  try {
    await access(filePath, constants.F_OK);
  } catch {
    return {};
  }

  const raw = await readFile(filePath, 'utf8');
  if (!raw.trim()) {
    return {};
  }

  return JSON.parse(raw) as SmartImagesManifest;
}
