import path from 'node:path';

import picomatch from 'picomatch';

import { toPosixPath } from '../utils/fs.js';

const IMAGE_EXTENSION_PATTERN = /\.(avif|gif|jpe?g|png|webp)$/i;

export function isSupportedImagePath(value: string): boolean {
  return IMAGE_EXTENSION_PATTERN.test(value);
}

export function normalizeSourceKey(value: string, cwd: string): string {
  const normalized = toPosixPath(path.isAbsolute(value) ? path.relative(cwd, value) : value);
  return normalized.replace(/^\.\/+/, '');
}

export function isIgnored(value: string, ignorePatterns: string[]): boolean {
  const normalized = toPosixPath(value);
  return ignorePatterns.some((pattern) => picomatch(pattern)(normalized));
}

export function resolveAssetUrlToSourceKey(
  assetUrl: string,
  assetsRoot: string,
  cwd: string,
): string | null {
  const normalized = assetUrl.trim();
  if (!isStaticLocalAssetReference(normalized)) {
    return null;
  }

  const relativeAssetPath = normalized
    .replace(/^\/+/, '')
    .replace(/^assets\//, '')
    .replace(/^\/assets\//, '');
  return normalizeSourceKey(path.join(assetsRoot, relativeAssetPath), cwd);
}

export function isStaticLocalAssetReference(value: string): boolean {
  if (!value || value.includes('{{')) {
    return false;
  }
  if (/^(https?:)?\/\//i.test(value)) {
    return false;
  }
  if (/^(data:|blob:|#)/i.test(value)) {
    return false;
  }
  return isSupportedImagePath(value);
}
