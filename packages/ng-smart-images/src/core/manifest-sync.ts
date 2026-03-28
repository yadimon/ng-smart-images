import path from 'node:path';

import { loadProjectConfig, saveProjectManifest } from './config.js';
import type { GenerateHashedOptions, SmartImageProjectManifest } from './types.js';
import { isIgnored, isSupportedImagePath, normalizeSourceKey } from './discovery.js';
import { listFilesRecursive } from '../utils/fs.js';

export async function syncProjectManifest(
  options: GenerateHashedOptions = {},
): Promise<{ manifestPath: string; added: string[] }> {
  const cwd = path.resolve(options.cwd ?? process.cwd());
  const { manifestPath, config } = await loadProjectConfig(cwd, options.manifestPath);
  const assetsRootAbsolute = path.join(cwd, config.assetsRoot);
  const assetFiles = await listFilesRecursive(assetsRootAbsolute);
  const existingImages = { ...config.images };
  const added: string[] = [];

  for (const assetFile of assetFiles) {
    const normalizedKey = normalizeSourceKey(assetFile, cwd);
    if (!isSupportedImagePath(normalizedKey)) {
      continue;
    }
    if (isIgnored(normalizedKey, config.ignore)) {
      continue;
    }
    if (!(normalizedKey in existingImages)) {
      existingImages[normalizedKey] = {};
      added.push(normalizedKey);
    }
  }

  const sourceManifest: SmartImageProjectManifest = {
    assetsRoot: config.assetsRoot,
    generatedAssetsDir: config.generatedAssetsDir,
    publicPath: config.publicPath,
    runtimeManifestJsonPath: config.runtimeManifestJsonPath,
    runtimeManifestTsPath: config.runtimeManifestTsPath,
    runtimeHelperTsPath: config.runtimeHelperTsPath,
    ignore: [...config.ignore],
    defaults: {
      quality: config.defaults.quality,
      sizes: [...config.defaults.sizes],
      extensions: [...config.defaults.extensions],
    },
    images: Object.fromEntries(
      Object.entries(existingImages).sort(([left], [right]) => left.localeCompare(right)),
    ),
  };

  await saveProjectManifest(manifestPath, sourceManifest);
  return {
    manifestPath,
    added,
  };
}
