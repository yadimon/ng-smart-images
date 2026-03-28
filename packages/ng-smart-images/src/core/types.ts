import type { SmartImageFormat, SmartImagesManifest } from '../runtime/manifest.js';

export interface SmartImageConfigEntry {
  ignore?: boolean;
  sizes?: number[];
  quality?: number;
  extension?: SmartImageFormat | SmartImageFormat[];
  extensions?: SmartImageFormat[];
}

export interface SmartImageProjectManifest {
  assetsRoot?: string;
  generatedAssetsDir?: string;
  publicPath?: string;
  runtimeManifestJsonPath?: string;
  runtimeManifestTsPath?: string;
  runtimeHelperTsPath?: string;
  ignore?: string[];
  defaults?: SmartImageConfigEntry;
  images?: Record<string, SmartImageConfigEntry>;
}

export interface SmartImageResolvedConfig {
  assetsRoot: string;
  generatedAssetsDir: string;
  publicPath: string;
  runtimeManifestJsonPath: string;
  runtimeManifestTsPath: string;
  runtimeHelperTsPath: string;
  ignore: string[];
  defaults: Required<Pick<SmartImageConfigEntry, 'sizes' | 'quality' | 'extensions'>> & {
    ignore: false;
  };
  images: Record<string, SmartImageConfigEntry>;
}

export interface SmartImageResolvedEntry {
  sourceKey: string;
  sourcePath: string;
  sizes: number[];
  quality: number;
  extensions: SmartImageFormat[];
}

export interface GenerateHashedOptions {
  cwd?: string;
  manifestPath?: string;
}

export interface GeneratedProjectArtifacts {
  manifestPath: string;
  runtimeManifestJsonPath: string;
  runtimeManifestTsPath: string;
  runtimeHelperTsPath: string;
  generatedAssetsDir: string;
  runtimeManifest: SmartImagesManifest;
}

export interface UpdateBundleOptions {
  cwd?: string;
  manifestPath?: string;
  distPath: string;
}
