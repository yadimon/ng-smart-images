# Releasing

`@yadimon/ng-smart-images` uses Changesets for versioning and GitHub Actions for publishing.

## Before The First Publish

1. Choose the final npm package name and scope.
2. Add `repository`, `bugs`, and `homepage` fields to `packages/ng-smart-images/package.json`.
3. Push the repository to GitHub.
4. Configure npm trusted publishing for this package and GitHub repository.

## Recommended Release Flow

1. Make code changes.
2. Create a changeset:
   - `npm run changeset`
3. Commit the code change and the new `.changeset/*.md` file.
4. Push to `main`.
5. The `Release` workflow updates or opens a release PR with the version bump.
6. Merge that release PR.
7. After the merge, the same workflow publishes the package to npm.

Useful local commands:

- `npm run verify`
- `npm run publish:dry-run`
- `npm run version-packages`
- `npm run release`

`version-packages` and `release` are mainly used by CI. `changeset` is the main maintainer-facing command.

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

The CI workflow uploads:

- the packed npm tarball from `.artifacts/*.tgz`
- the built package output from `packages/ng-smart-images/dist`

These artifacts are useful for smoke checks, manual installation tests, and release verification before publishing.
