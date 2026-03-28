import { mkdtemp, mkdir, readFile, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import sharp from 'sharp';
import { afterEach, describe, expect, it } from 'vitest';

import { updateBundle } from '../src/core/update-bundle.js';

describe('updateBundle', () => {
  const tempDirs: string[] = [];

  afterEach(async () => {
    await Promise.all(
      tempDirs.map(async (dir) => {
        await import('node:fs/promises').then(({ rm }) =>
          rm(dir, { recursive: true, force: true }),
        );
      }),
    );
    tempDirs.length = 0;
  });

  it('rewrites static html and css asset references to hashed outputs in dist', async () => {
    const cwd = await mkdtemp(path.join(os.tmpdir(), 'ng-smart-images-update-'));
    tempDirs.push(cwd);

    await mkdir(path.join(cwd, 'src/assets/hero'), { recursive: true });
    await mkdir(path.join(cwd, 'dist/app/browser'), { recursive: true });

    await sharp({
      create: {
        width: 32,
        height: 20,
        channels: 4,
        background: '#228833',
      },
    })
      .png()
      .toFile(path.join(cwd, 'src/assets/hero/banner.png'));

    await writeFile(
      path.join(cwd, 'smart-images.manifest.json'),
      JSON.stringify(
        {
          defaults: {
            extensions: ['webp'],
          },
        },
        null,
        2,
      ),
      'utf8',
    );

    await writeFile(
      path.join(cwd, 'dist/app/browser/index.html'),
      '<img src="/assets/hero/banner.png" alt="Hero">',
      'utf8',
    );
    await writeFile(
      path.join(cwd, 'dist/app/browser/styles.css'),
      '.hero{background:url("/assets/hero/banner.png");}',
      'utf8',
    );

    const result = await updateBundle({
      cwd,
      distPath: 'dist/app/browser',
    });

    const html = await readFile(path.join(cwd, 'dist/app/browser/index.html'), 'utf8');
    const css = await readFile(path.join(cwd, 'dist/app/browser/styles.css'), 'utf8');

    expect(result.updatedFiles).toHaveLength(2);
    expect(html).toMatch(/\/assets\/ng-smart-images\/hero\/banner-32-[a-f0-9]{10}\.webp/);
    expect(css).toMatch(/\/assets\/ng-smart-images\/hero\/banner-32-[a-f0-9]{10}\.webp/);
  });
});
