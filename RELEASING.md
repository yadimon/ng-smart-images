# Releasing

`@yadimon/ng-smart-images` uses a simple single-package release flow:

1. configure npm Trusted Publishing for GitHub Actions
2. bump the package version locally
3. push the generated `v*` tag so GitHub Actions publishes that exact version

Do not set `"private": true` in `packages/ng-smart-images/package.json`; that blocks publishing entirely.

## Package Status

The package already exists on npm, so there is no first-publish bootstrap requirement before enabling Trusted Publishing.

## Trusted Publishing

1. open the package settings on npm
2. add a Trusted Publisher for:
   - GitHub user or org: `yadimon`
   - repository: `ng-smart-images`
   - workflow filename: `publish.yml`
3. keep using `.github/workflows/publish.yml` for future releases

This repository uses GitHub Actions for Trusted Publishing. npm also supports other CI providers, but this repo is already wired for GitHub Actions.

The publish workflow uses a current Node runtime and updates npm before publishing so Trusted Publishing keeps working with npm's current OIDC requirements.

## Normal Release Flow

1. choose one:

```bash
npm run release:patch
npm run release:minor
npm run release:major
```

These scripts:

- run `npm run check`
- run `npm version ... --workspace @yadimon/ng-smart-images`
- create the Git commit and `v*` tag
- push the commit and tag to `origin`

2. GitHub Actions sees the pushed `v*` tag and publishes that version to npm with Trusted Publishing

If you prefer the manual equivalent, it is:

```bash
npm run check
npm version patch --workspace @yadimon/ng-smart-images
git push origin HEAD --follow-tags
```

## Manual Publish Fallback

If you need to publish without Trusted Publishing, authenticate with npm first:

```bash
npm login
npm run check
npm publish --workspace @yadimon/ng-smart-images --access public
```

## Notes

- `repository`, `homepage`, and `bugs` in `packages/ng-smart-images/package.json` must match the real GitHub repository exactly.
- For public packages published through Trusted Publishing from a public GitHub repository, npm generates provenance automatically.
- The publish workflow verifies that the pushed Git tag matches `packages/ng-smart-images/package.json`.
- `npm run check` covers formatting, linting, typechecking, tests, example build, tarball packing, and `npm publish --dry-run`.
