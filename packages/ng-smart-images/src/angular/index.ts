import {
  inject,
  Injectable,
  InjectionToken,
  type ModuleWithProviders,
  NgModule,
  type Provider,
} from '@angular/core';

import type { SmartImagesManifest } from '../runtime/manifest.js';
import { EMPTY_SMART_IMAGES_MANIFEST } from '../runtime/manifest.js';
import {
  createSmartImageResolver,
  type SmartImageFormat,
  type SmartImageResolver,
  type SmartImageSource,
} from '../runtime/index.js';

export const SMART_IMAGES_MANIFEST = new InjectionToken<SmartImagesManifest>(
  'SMART_IMAGES_MANIFEST',
  {
    factory: () => EMPTY_SMART_IMAGES_MANIFEST,
  },
);

export function provideSmartImages(manifest: SmartImagesManifest): Provider[] {
  return [{ provide: SMART_IMAGES_MANIFEST, useValue: manifest }];
}

@Injectable({ providedIn: 'root' })
export class SmartImagesService {
  private readonly manifest = inject(SMART_IMAGES_MANIFEST);
  private readonly resolver: SmartImageResolver;

  constructor() {
    this.resolver = createSmartImageResolver(this.manifest);
  }

  hasImage(path: string): boolean {
    return this.resolver.hasImage(path);
  }

  hashed(path: string): string {
    return this.resolver.hashed(path);
  }

  imageEntry(path: string) {
    return this.resolver.imageEntry(path);
  }

  imagePlaceholder(path: string): string {
    return this.resolver.imagePlaceholder(path);
  }

  imageSources(path: string, format?: SmartImageFormat): SmartImageSource[] {
    return this.resolver.imageSources(path, format);
  }
}

@NgModule({})
export class SmartImagesModule {
  static forManifest(manifest: SmartImagesManifest): ModuleWithProviders<SmartImagesModule> {
    return {
      ngModule: SmartImagesModule,
      providers: provideSmartImages(manifest),
    };
  }
}
