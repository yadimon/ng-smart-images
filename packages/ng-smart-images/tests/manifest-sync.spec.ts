import { mkdtemp, mkdir, writeFile, readFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import sharp from 'sharp';
import { afterEach, describe, expect, it } from 'vitest';

import { syncProjectManifest } from '../src/core/manifest-sync.js';

describe('syncProjectManifest', () => {
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

  it('adds missing image entries without overwriting existing config', async () => {
    const cwd = await mkdtemp(path.join(os.tmpdir(), 'ng-smart-images-sync-'));
    tempDirs.push(cwd);
    await mkdir(path.join(cwd, 'src/assets/hero'), { recursive: true });
    await mkdir(path.join(cwd, 'src/assets/archive'), { recursive: true });
    await sharp({
      create: {
        width: 16,
        height: 16,
        channels: 4,
        background: '#00aaee',
      },
    })
      .png()
      .toFile(path.join(cwd, 'src/assets/hero/banner.png'));
    await sharp({
      create: {
        width: 16,
        height: 16,
        channels: 4,
        background: '#ff6600',
      },
    })
      .png()
      .toFile(path.join(cwd, 'src/assets/hero/logo.png'));
    await sharp({
      create: {
        width: 16,
        height: 16,
        channels: 4,
        background: '#111111',
      },
    })
      .png()
      .toFile(path.join(cwd, 'src/assets/archive/ignore-me.png'));

    await writeFile(
      path.join(cwd, 'smart-images.manifest.json'),
      JSON.stringify(
        {
          ignore: ['src/assets/archive/**'],
          images: {
            'src/assets/hero/banner.png': {
              quality: 91,
            },
          },
        },
        null,
        2,
      ),
      'utf8',
    );

    const result = await syncProjectManifest({ cwd });
    const written = JSON.parse(
      await readFile(path.join(cwd, 'smart-images.manifest.json'), 'utf8'),
    ) as {
      images: Record<string, { quality?: number }>;
    };

    expect(result.added).toContain('src/assets/hero/logo.png');
    expect(written.images['src/assets/hero/banner.png'].quality).toBe(91);
    expect(written.images['src/assets/hero/logo.png']).toEqual({});
    expect(written.images['src/assets/archive/ignore-me.png']).toBeUndefined();
  });
});
