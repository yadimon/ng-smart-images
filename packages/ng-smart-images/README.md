# @yadimon/ng-smart-images

`@yadimon/ng-smart-images` is a CLI-first image optimization tool for Angular and other frontend builds. It generates hashed local image variants, writes a runtime manifest, and can rewrite built HTML and CSS to hashed asset URLs after your normal build finishes.

## What It Does

- Generates hashed `avif`, `webp`, and original-format outputs.
- Reuses unchanged generated assets when the source image and manifest config have not changed.
- Writes a source manifest that you can keep in version control and extend over time.
- Writes a generated runtime manifest plus helper wrapper for code-driven lookups.
- Rewrites static `html` and `css` asset references in `dist/` to hashed URLs.
- Keeps defaults lightweight: `sizes`, `quality`, `extension(s)`, and `ignore`.

## Install

```bash
npm install @yadimon/ng-smart-images
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

```bash
npx ng-smart-images generate-hashed
```

### Update Bundle

Runs after your normal build and rewrites static `html` and `css` references in `dist`.

```bash
npx ng-smart-images update-bundle --dist dist/app/browser
```

## Suggested Angular Scripts

Keep Angular on the standard builders and add the image steps around it:

```json
{
  "scripts": {
    "smart-images:sync-manifest": "npx ng-smart-images sync-manifest",
    "smart-images:generate": "npx ng-smart-images generate-hashed",
    "smart-images:update-bundle": "npx ng-smart-images update-bundle --dist dist/app/browser",
    "build": "npm run smart-images:generate && ng build && npm run smart-images:update-bundle",
    "start": "npm run smart-images:generate && ng serve"
  }
}
```

## Runtime Helper

After `generate-hashed`, import the generated helper from your app:

```ts
import { hashed, imageEntry } from './generated/ng-smart-images.runtime';

const heroUrl = hashed('src/assets/landing/hero.webp');
const heroEntry = imageEntry('src/assets/landing/hero.webp');
```

Behavior:

- known image in the generated manifest: returns the hashed URL
- missing image or missing manifest entry: falls back to the original `/assets/...` path

## Angular Wrapper

The package also exports an optional Angular wrapper layer:

```ts
import { provideSmartImages } from '@yadimon/ng-smart-images/angular';
import manifest from './generated/ng-smart-images.manifest';

providers: [provideSmartImages(manifest)];
```

You can then inject `SmartImagesService` if you prefer DI over direct helper functions.

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
