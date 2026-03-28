# Releasing

`@yadimon/ng-smart-images` is set up for a simple single-package semver release flow.

## Before The First Publish

1. Choose the final npm package name and scope.
2. Add `repository`, `bugs`, and `homepage` fields to `packages/ng-smart-images/package.json`.
3. Push the repository to GitHub.
4. Configure npm trusted publishing for this package and GitHub repository.

## Recommended Release Flow

1. Run `npm run verify`.
2. Run `npm run publish:dry-run`.
3. Bump the version:
   - patch: `npm run version:patch`
   - minor: `npm run version:minor`
   - major: `npm run version:major`
4. Push the version commit and tag to GitHub.
5. Create a GitHub Release or run the `Publish Package` workflow manually.

The release workflow verifies the repository, packs the npm tarball, uploads the tarball and package `dist` as workflow artifacts, and then publishes the package.

## Trusted Publishing vs npm Tokens

Preferred path:

- GitHub Actions trusted publishing
- no npm API token stored in GitHub secrets
- npm automatically issues a short-lived credential to the workflow
- npm provenance is generated automatically for the published package

Fallback path:

- local `npm publish`
- or GitHub Actions with an npm access token if trusted publishing is not available yet

If you publish locally or do not use trusted publishing, you still need npm authentication such as `npm login` or a granular access token with publish rights.

## Build Artifacts

The CI and release workflows upload:

- the packed npm tarball from `.artifacts/*.tgz`
- the built package output from `packages/ng-smart-images/dist`

These artifacts are useful for smoke checks, manual installation tests, and release verification before publishing.
