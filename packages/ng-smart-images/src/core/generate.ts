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
  const runtimeManifest: SmartImagesManifest = {};
  const generatedAssetsDir = path.join(cwd, config.generatedAssetsDir);
  const assetsRootAbsolute = path.join(cwd, config.assetsRoot);

  for (const sourceKey of Object.keys(config.images).sort()) {
    const resolvedEntry = resolveEntryConfig(sourceKey, config, cwd);
    if (!resolvedEntry) {
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

  const runtimeManifestJsonPath = path.join(cwd, config.runtimeManifestJsonPath);
  const runtimeManifestTsPath = path.join(cwd, config.runtimeManifestTsPath);
  const runtimeHelperTsPath = path.join(cwd, config.runtimeHelperTsPath);

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
