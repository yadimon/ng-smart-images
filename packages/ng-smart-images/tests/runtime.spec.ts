import { describe, expect, it } from 'vitest';

import {
  createSmartImageResolver,
  hashed,
  imageEntry,
  imageSources,
  type SmartImagesManifest,
} from '../src/runtime/index.js';

describe('runtime resolver', () => {
  const manifest: SmartImagesManifest = {
    'src/assets/hero/banner.webp': {
      key: 'src/assets/hero/banner.webp',
      originalPath: 'src/assets/hero/banner.webp',
      width: 1280,
      height: 720,
      fallbackSrc: '/assets/ng-smart-images/hero/banner-1280-hash.webp',
      placeholderDataUrl: '',
      sources: [
        {
          format: 'avif',
          width: 1280,
          src: '/assets/ng-smart-images/hero/banner-1280-hash.avif',
        },
        {
          format: 'webp',
          width: 1280,
          src: '/assets/ng-smart-images/hero/banner-1280-hash.webp',
        },
      ],
    },
  };

  it('returns hashed fallback when the manifest contains the asset', () => {
    expect(hashed('src/assets/hero/banner.webp', manifest)).toBe(
      '/assets/ng-smart-images/hero/banner-1280-hash.webp',
    );
  });

  it('falls back to the original public asset path when the manifest is missing', () => {
    expect(hashed('src/assets/hero/banner.webp')).toBe('/assets/hero/banner.webp');
  });

  it('creates a reusable resolver facade', () => {
    const resolver = createSmartImageResolver(manifest);

    expect(resolver.hasImage('src/assets/hero/banner.webp')).toBe(true);
    expect(imageEntry('assets/hero/banner.webp', manifest)?.fallbackSrc).toBe(
      '/assets/ng-smart-images/hero/banner-1280-hash.webp',
    );
    expect(imageSources('assets/hero/banner.webp', manifest, 'avif')).toHaveLength(1);
    expect(resolver.hashed('assets/hero/banner.webp')).toBe(
      '/assets/ng-smart-images/hero/banner-1280-hash.webp',
    );
  });
});
