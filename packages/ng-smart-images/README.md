# @yadimon/ng-smart-images

[![npm](https://img.shields.io/npm/v/@yadimon/ng-smart-images)](https://www.npmjs.com/package/@yadimon/ng-smart-images)
[![CI](https://github.com/yadimon/ng-smart-images/actions/workflows/ci.yml/badge.svg)](https://github.com/yadimon/ng-smart-images/actions/workflows/ci.yml)
[![license](https://img.shields.io/npm/l/@yadimon/ng-smart-images)](https://github.com/yadimon/ng-smart-images/blob/main/LICENSE)

Optimize local frontend images at build time while keeping Angular's standard
builder. `ng-smart-images` creates resized AVIF, WebP, and original-format
variants with content-hashed filenames, then connects them to static templates,
CSS, and code-driven image URLs.

There is no image server and no required browser-side runtime. The generated
files deploy with the rest of your application.

## What It Does

- **Optimize once at build time:** resize and encode local JPEG, PNG, GIF,
  WebP, or AVIF sources through Sharp.
- **Ship immutable URLs:** each output filename includes a hash of its bytes,
  which is safe for long-lived browser and CDN caching.
- **Keep repeat builds fast:** unchanged sources are reused using a fingerprint
  of source content, normalized image config, and package version.
- **Cover static and dynamic references:** rewrite built HTML/CSS automatically,
  or resolve URLs and responsive sources from a generated TypeScript manifest.
- **Stay builder-independent:** add three CLI commands around the existing
  Angular or frontend build instead of installing a custom builder.

## When To Use It

| Use `ng-smart-images` when…                                          | Choose something else when…                                                 |
| -------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| Images live in your repository under `src/assets`                    | Images come from a CMS or image CDN and need on-demand transforms           |
| You want hashed local files and no production image service          | You need runtime URL signing or per-request resizing                        |
| Static templates/CSS and code-generated URLs must share one manifest | You only need Angular's loading-priority and layout hints for existing URLs |
| Your CI or Docker build can run native Sharp binaries                | Images must be transformed in a browser-only environment                    |

Angular's
[`NgOptimizedImage`](https://angular.dev/guide/image-optimization) and this
package solve different layers: `NgOptimizedImage` improves how the browser
loads an image, while `ng-smart-images` creates and versions the image files.
They can be used together.

## Install

```bash
npm install @yadimon/ng-smart-images
```

Requirements:

- Node.js `^20.19.0`, `^22.14.0`, or `^24.0.0`
- Angular 20–22 only when using the optional `/angular` entry point
- No Angular dependency for the CLI or `/runtime` entry point

## Five-Minute Setup

Start in the application directory. `sync-manifest` creates
`smart-images.manifest.json` when it is missing and adds every supported image
under `src/assets`:

```bash
npx ng-smart-images sync-manifest
npx ng-smart-images generate-hashed
```

Then wrap your existing build:

```json
{
  "scripts": {
    "smart-images:generate": "ng-smart-images generate-hashed",
    "smart-images:update-bundle": "ng-smart-images update-bundle --dist dist/app/browser",
    "build": "npm run smart-images:generate && ng build && npm run smart-images:update-bundle",
    "start": "npm run smart-images:generate && ng serve"
  }
}
```

The pipeline is deliberately explicit:

```text
source images + smart-images.manifest.json
  -> generate-hashed
  -> src/assets/ng-smart-images/* + generated runtime manifest
  -> your normal Angular build
  -> update-bundle
  -> dist HTML/CSS points at hashed assets
```

## Source Manifest

Create a `smart-images.manifest.json` file in your app root.

```json
{
  "assetsRoot": "src/assets",
  "generatedAssetsDir": "src/assets/ng-smart-images",
  "publicPath": "/assets/ng-smart-images",
  "runtimeManifestJsonPath": "src/app/generated/ng-smart-images.manifest.json",
  "runtimeManifestTsPath": "src/app/generated/ng-smart-images.manifest.ts",
  "runtimeHelperTsPath": "src/app/generated/ng-smart-images.runtime.ts",
  "ignore": ["src/assets/archive/**", "src/assets/ng-smart-images/**"],
  "defaults": {
    "extensions": ["avif", "webp", "original"],
    "quality": 76,
    "sizes": []
  },
  "images": {
    "src/assets/landing/hero.webp": {
      "sizes": [640, 960, 1408]
    },
    "src/assets/providers/logo.png": {
      "extensions": ["webp", "original"]
    },
    "src/assets/legacy/old-banner.jpg": {
      "ignore": true
    }
  }
}
```

## CLI Commands

### Sync Manifest

Scans `assetsRoot` and adds missing image entries without deleting existing config.

```bash
npx ng-smart-images sync-manifest
```

If you want a full refresh, delete `smart-images.manifest.json` and run the command again.

### Generate Hashed Assets

Generates hashed files into `generatedAssetsDir` and writes:

- `runtimeManifestJsonPath`
- `runtimeManifestTsPath`
- `runtimeHelperTsPath`
- a sibling `.ng-smart-images.cache.json` file for build-time reuse decisions

```bash
npx ng-smart-images generate-hashed
```

### Update Bundle

Runs after your normal build and rewrites static `html` and `css` references in `dist`.

```bash
npx ng-smart-images update-bundle --dist dist/app/browser
```

## Static Templates And CSS

Keep ordinary local asset references in source code:

```html
<img src="assets/landing/hero.png" width="1408" height="792" alt="Product overview" />
```

```css
.hero {
  background-image: url('/assets/landing/hero.png');
}
```

`update-bundle` scans the built `.html` and `.css` files and replaces those
static URLs with the generated fallback asset, for example
`/assets/ng-smart-images/landing/hero-1408-a1b2c3d4e5.png`.

It intentionally does not parse JavaScript expressions, remote URLs, `data:` or
`blob:` URLs, Angular interpolation such as `{{ imageUrl }}`, or create
`<picture>`/`srcset` markup. Use the runtime helper for those cases.

## Runtime Helper

For URLs assembled in TypeScript, import the helper generated by
`generate-hashed`:

```ts
import { hashed, imageEntry, imageSources } from './generated/ng-smart-images.runtime';

const heroPath = 'src/assets/landing/hero.png';
const heroUrl = hashed(heroPath);
const heroEntry = imageEntry(heroPath);
const heroSources = imageSources(heroPath);

const avifSrcset = heroSources
  .filter((source) => source.format === 'avif')
  .map((source) => `${source.src} ${source.width}w`)
  .join(', ');
```

Behavior:

- known image in the generated manifest: returns the hashed URL
- missing image or missing manifest entry: falls back to the original `/assets/...` path

Use the same data to build responsive markup:

```html
<picture>
  <source type="image/avif" [attr.srcset]="avifSrcset" sizes="100vw" />
  <img
    [src]="heroUrl"
    [attr.width]="heroEntry?.width"
    [attr.height]="heroEntry?.height"
    alt="Product overview"
  />
</picture>
```

The library exposes metadata; it does not impose an Angular component or CSS
layout. This keeps generated markup under your control and lets you combine it
with `NgOptimizedImage`, native lazy loading, or your existing design system.

## Angular Wrapper

The package also exports an optional Angular wrapper layer:

```ts
import { provideSmartImages } from '@yadimon/ng-smart-images/angular';
import manifest from './generated/ng-smart-images.manifest';

providers: [provideSmartImages(manifest)];
```

You can then inject `SmartImagesService` if you prefer DI over direct helper functions.

```ts
import { Component, inject } from '@angular/core';
import { SmartImagesService } from '@yadimon/ng-smart-images/angular';

@Component({/* ... */})
export class HeroComponent {
  private readonly images = inject(SmartImagesService);
  protected readonly heroUrl = this.images.hashed('src/assets/landing/hero.png');
}
```

## Cache And Generated Files

`generate-hashed` writes four kinds of output:

```text
src/assets/ng-smart-images/**                 optimized, content-hashed images
src/app/generated/ng-smart-images.manifest.json
src/app/generated/ng-smart-images.manifest.ts
src/app/generated/ng-smart-images.runtime.ts
src/app/generated/.ng-smart-images.cache.json
```

The cache fingerprint includes the source bytes, normalized per-image config,
and installed package version. Re-running the command reuses outputs only when
all three match. This is stable across fresh CI checkouts because it does not
depend on file modification times. Delete the cache file when you intentionally
want to force a full regeneration.

Commit `smart-images.manifest.json`: it is your editable source configuration.
Whether generated files are committed or produced in CI is a project choice;
keep the image files, runtime manifest, runtime helper, and cache together so a
cached entry never points at missing output.

## CI, Docker, And Monorepos

All commands accept `--cwd <app-directory>` and
`--manifest <manifest-file>`. In a monorepo you can keep scripts in the app's
own `package.json`, or call the tool from the workspace root:

```bash
ng-smart-images generate-hashed \
  --cwd projects/portal-web \
  --manifest smart-images.manifest.json
```

For a multi-stage Docker build, run `generate-hashed` in a dependency/build
stage, copy both `generatedAssetsDir` and the generated runtime files into the
Angular build stage, then run `update-bundle` against the final browser output.
Sharp is only needed in the build image, not in the image that serves static
files.

## Troubleshooting

- **An image still uses its original URL:** `update-bundle` only rewrites
  literal local image URLs in built HTML and CSS. Use `hashed()` for URLs built
  in TypeScript or Angular expressions.
- **A new source image is missing:** run `sync-manifest`, or add its normalized
  `src/assets/...` key to the `images` object manually.
- **Responsive sizes were not generated:** an empty `sizes` array creates one
  output at the source width. Add positive widths under `defaults.sizes` or the
  individual image entry; widths larger than the source are skipped.
- **CI reused nothing:** preserve/restore the generated asset directory,
  runtime manifest, and `.ng-smart-images.cache.json` as one cache unit.
- **The Angular import reports a peer mismatch:** use Angular 20–22, or import
  from `@yadimon/ng-smart-images/runtime` instead of the optional `/angular`
  entry point.

## Development

From the repository root:

```bash
npm install
npm run verify
```

## Release Notes For Maintainers

Repository-wide release guidance lives in [`RELEASING.md`](../../RELEASING.md). The short version:

- keep the package on semver
- use `npm run publish:dry-run` before a real publish
- bump versions with the root `release:*` scripts
- prefer GitHub trusted publishing once the repository is connected on npm
