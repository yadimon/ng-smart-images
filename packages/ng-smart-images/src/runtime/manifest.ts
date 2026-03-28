export type SmartImageFormat = 'avif' | 'webp' | 'original';

export interface SmartImageSource {
  format: SmartImageFormat;
  src: string;
  width: number;
}

export interface SmartImageEntry {
  key: string;
  originalPath: string;
  width: number;
  height: number;
  fallbackSrc: string;
  placeholderDataUrl: string;
  sources: ReadonlyArray<SmartImageSource>;
}

export type SmartImagesManifest = Record<string, SmartImageEntry>;

export const EMPTY_SMART_IMAGES_MANIFEST: SmartImagesManifest = {};

export function resolveSmartImage(
  key: string,
  manifest: SmartImagesManifest = EMPTY_SMART_IMAGES_MANIFEST,
): SmartImageEntry | null {
  return manifest[key] ?? null;
}

export default EMPTY_SMART_IMAGES_MANIFEST;
