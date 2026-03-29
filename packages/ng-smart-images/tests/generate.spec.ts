import { mkdtemp, mkdir, stat, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import sharp from 'sharp';
import { afterEach, describe, expect, it } from 'vitest';

import { generateHashedImages } from '../src/core/generate.js';

describe('generateHashedImages', () => {
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

  it('reuses unchanged generated assets instead of rewriting them', async () => {
    const cwd = await mkdtemp(path.join(os.tmpdir(), 'ng-smart-images-generate-'));
    tempDirs.push(cwd);

    await mkdir(path.join(cwd, 'src/assets/hero'), { recursive: true });

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
          images: {
            'src/assets/hero/banner.png': {},
          },
        },
        null,
        2,
      ),
      'utf8',
    );

    const firstResult = await generateHashedImages({ cwd });
    const generatedSrc = firstResult.runtimeManifest['src/assets/hero/banner.png']?.fallbackSrc;

    expect(generatedSrc).toMatch(/\/assets\/ng-smart-images\/hero\/banner-32-[a-f0-9]{10}\.webp/);

    const generatedFilePath = path.join(
      cwd,
      'src/assets/ng-smart-images',
      generatedSrc.replace('/assets/ng-smart-images/', '').replace(/\//g, path.sep),
    );
    const firstStat = await stat(generatedFilePath);

    await new Promise((resolve) => setTimeout(resolve, 1200));

    const secondResult = await generateHashedImages({ cwd });
    const secondSrc = secondResult.runtimeManifest['src/assets/hero/banner.png']?.fallbackSrc;
    const secondStat = await stat(generatedFilePath);

    expect(secondSrc).toBe(generatedSrc);
    expect(secondStat.mtimeMs).toBe(firstStat.mtimeMs);
  });
});
