# AGENTS

## Purpose

This repository contains the standalone `@yadimon/ng-smart-images` CLI-first package and its example app. Keep changes focused on build-time image optimization, generated asset stability, and predictable developer workflows.

## Default Commands

- `npm install`
- `npm run verify`
- `npm run build`
- `npm run test`
- `npm run build:example`
- `npm run lint`
- `npm run format:check`

## Repository Layout

- `packages/ng-smart-images`: publishable package source, tests, schemas, and build scripts.
- `examples/basic-app`: Angular fixture app used to verify the builder end to end.
- `.github`: CI, release automation, issue forms, PR template, and dependency maintenance.

## Working Rules

- Do not edit generated `dist/` output by hand.
- Keep source changes small and coherent; update docs and tests with behavior changes.
- Preserve Angular 21 compatibility unless a version policy change is explicit.
- Prefer content-hashed outputs and deterministic behavior over implicit magic.
- Run `npm run verify` before finalizing substantial changes.
