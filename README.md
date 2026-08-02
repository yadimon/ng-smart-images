# @yadimon/ng-smart-images

[![npm](https://img.shields.io/npm/v/@yadimon/ng-smart-images)](https://www.npmjs.com/package/@yadimon/ng-smart-images)
[![CI](https://github.com/yadimon/ng-smart-images/actions/workflows/ci.yml/badge.svg)](https://github.com/yadimon/ng-smart-images/actions/workflows/ci.yml)
[![license](https://img.shields.io/npm/l/@yadimon/ng-smart-images)](LICENSE)

Build fast, cacheable local images without replacing Angular's standard
builder. `ng-smart-images` generates resized AVIF/WebP/original variants with
content-hashed filenames, rewrites static asset URLs after the build, and gives
application code a typed runtime manifest for dynamic images.

It is a build tool, not an image CDN or an Angular image component. Your source
images stay in the repository and the optimized files ship with the app.

## Quick Start

```bash
npm install @yadimon/ng-smart-images
npx ng-smart-images sync-manifest
npx ng-smart-images generate-hashed
ng build
npx ng-smart-images update-bundle --dist dist/app/browser
```

The first command discovers images under `src/assets`. The remaining commands
create immutable image variants, build the app normally, then replace static
`assets/...` references in generated HTML and CSS with hashed URLs.

For package scripts, responsive `srcset` examples, cache behavior, Angular DI,
and Docker/CI integration, read the
[package guide](./packages/ng-smart-images/README.md).

## Repository Layout

- `packages/ng-smart-images`: publishable package source, runtime helpers, Angular wrapper, tests, and build scripts.
- `examples/basic-app`: Angular 21 fixture app used for integration verification.
- `.github/`: CI workflow, publish workflow, Dependabot, and contribution templates.

## Local Development

```bash
npm install
npm run verify
```

Useful focused commands:

- `npm run lint`
- `npm run format:check`
- `npm run typecheck`
- `npm run test`
- `npm run build:example`
- `npm run pack`
- `npm run publish:dry-run`
- `npm run check`
- `npm run release:patch`
- `npm run release:minor`
- `npm run release:major`

## Publishing

The package workflow is set up for npm trusted publishing with explicit semver bumps and `v*` tags. The release flow and maintainer steps are documented in [`RELEASING.md`](./RELEASING.md).

## Community Files

The repo includes:

- `AGENTS.md` for automation and contributor instructions.
- `CONTRIBUTING.md` for local workflow and contribution expectations.
- `SECURITY.md` for vulnerability reporting guidance.
- GitHub issue forms and a pull request template.

Package-specific usage and integration details live in [`packages/ng-smart-images/README.md`](./packages/ng-smart-images/README.md).
