export {
  EMPTY_SMART_IMAGES_MANIFEST,
  resolveSmartImage,
  type SmartImageEntry,
  type SmartImageFormat,
  type SmartImageSource,
  type SmartImagesManifest,
} from './runtime/manifest.js';
export {
  createSmartImageResolver,
  hashed,
  imageEntry,
  imagePlaceholder,
  imageSources,
  normalizeImageKey,
  toPublicAssetPath,
  type SmartImageResolver,
} from './runtime/index.js';
export {
  SmartImagesModule,
  SMART_IMAGES_MANIFEST,
  SmartImagesService,
  provideSmartImages,
} from './angular/index.js';
export {
  createDefaultProjectManifest,
  loadProjectConfig,
  resolveEntryConfig,
  saveProjectManifest,
  type LoadedConfig,
} from './core/config.js';
export { generateHashedImages } from './core/generate.js';
export { syncProjectManifest } from './core/manifest-sync.js';
export { updateBundle } from './core/update-bundle.js';
export type {
  GenerateHashedOptions,
  GeneratedProjectArtifacts,
  SmartImageConfigEntry,
  SmartImageProjectManifest,
  SmartImageResolvedConfig,
  SmartImageResolvedEntry,
  UpdateBundleOptions,
} from './core/types.js';
