# Changelog

All notable changes to this package will be documented in this file.

## 0.2.0 - 2026-03-31

- switched generated asset reuse from `mtime` checks to a fingerprint cache based on source content, normalized config, and package version
- added a separate `.ng-smart-images.cache.json` file alongside the generated runtime manifest so cache metadata stays out of the client bundle
- added regression tests for reuse across timestamp drift and invalidation when image config changes
