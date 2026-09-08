import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const cli = fileURLToPath(new URL('../dist/cli.js', import.meta.url));

describe('built CLI help', () => {
  it.each([
    { args: [] },
    { args: ['--help'] },
    { args: ['-h'] },
    { args: ['update-bundle', '--help'] },
  ])('prints help without performing work for %j', ({ args }) => {
    const result = spawnSync(process.execPath, [cli, ...args], { encoding: 'utf8' });
    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toContain('Usage:');
  });

  it('rejects an unknown command', () => {
    const result = spawnSync(process.execPath, [cli, 'unknown-command'], { encoding: 'utf8' });
    expect(result.status).toBe(1);
  });
});
