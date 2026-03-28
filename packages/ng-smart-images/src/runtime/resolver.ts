import type {
  SmartImageEntry,
  SmartImageFormat,
  SmartImageSource,
  SmartImagesManifest,
} from './manifest.js';
import { EMPTY_SMART_IMAGES_MANIFEST } from './manifest.js';

export interface SmartImageResolver {
  hasImage(path: string): boolean;
  hashed(path: string): string;
  imageEntry(path: string): SmartImageEntry | null;
  imagePlaceholder(path: string): string;
  imageSources(path: string, format?: SmartImageFormat): SmartImageSource[];
}

export function createSmartImageResolver(
  manifest: SmartImagesManifest = EMPTY_SMART_IMAGES_MANIFEST,
): SmartImageResolver {
  return {
    hasImage(path: string): boolean {
      return imageEntry(path, manifest) !== null;
    },
    hashed(path: string): string {
      return hashed(path, manifest);
    },
    imageEntry(path: string): SmartImageEntry | null {
      return imageEntry(path, manifest);
    },
    imagePlaceholder(path: string): string {
      return imagePlaceholder(path, manifest);
    },
    imageSources(path: string, format?: SmartImageFormat): SmartImageSource[] {
      return imageSources(path, manifest, format);
    },
  };
}

export function hashed(
  path: string,
  manifest: SmartImagesManifest = EMPTY_SMART_IMAGES_MANIFEST,
): string {
  return imageEntry(path, manifest)?.fallbackSrc ?? toPublicAssetPath(path);
}

export function imageEntry(
  path: string,
  manifest: SmartImagesManifest = EMPTY_SMART_IMAGES_MANIFEST,
): SmartImageEntry | null {
  return manifest[normalizeImageKey(path)] ?? null;
}

export function imagePlaceholder(
  path: string,
  manifest: SmartImagesManifest = EMPTY_SMART_IMAGES_MANIFEST,
): string {
  const entry = imageEntry(path, manifest);
  return entry?.placeholderDataUrl || entry?.fallbackSrc || toPublicAssetPath(path);
}

export function imageSources(
  path: string,
  manifest: SmartImagesManifest = EMPTY_SMART_IMAGES_MANIFEST,
  format?: SmartImageFormat,
): SmartImageSource[] {
  const entry = imageEntry(path, manifest);
  if (!entry) {
    return [];
  }

  const sources = [...entry.sources].sort((left, right) => left.width - right.width);
  return format ? sources.filter((source) => source.format === format) : sources;
}

export function normalizeImageKey(path: string): string {
  const normalized = path.trim().replace(/\\/g, '/');
  if (normalized.startsWith('src/assets/')) {
    return normalized;
  }
  if (normalized.startsWith('/assets/')) {
    return `src${normalized}`;
  }
  if (normalized.startsWith('assets/')) {
    return `src/${normalized}`;
  }
  return normalized;
}

export function toPublicAssetPath(path: string): string {
  const normalized = normalizeImageKey(path);
  if (normalized.startsWith('src/')) {
    return `/${normalized.slice('src/'.length)}`;
  }
  return normalized.startsWith('/') ? normalized : `/${normalized}`;
}
