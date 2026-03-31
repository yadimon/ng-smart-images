# @yadimon/ng-smart-images

CLI-first image optimization for Angular and other frontend builds. The package generates hashed AVIF/WebP/original assets, rewrites built HTML and CSS when asked, and exposes a runtime manifest plus optional Angular helpers for code-driven lookups.

The repository is structured like a modern OSS package repo: linting and formatting are enforced, CI verifies the full package plus the example app, and npm publishing is handled through GitHub Actions with explicit version bumps and tags.

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
