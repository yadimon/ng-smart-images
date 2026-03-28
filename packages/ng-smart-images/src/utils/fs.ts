import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

export async function listFilesRecursive(rootDir: string): Promise<string[]> {
  const entries = await readdir(rootDir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(rootDir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listFilesRecursive(fullPath)));
      continue;
    }
    files.push(fullPath);
  }

  return files;
}

export async function writeTextFile(targetPath: string, content: string): Promise<void> {
  await mkdir(path.dirname(targetPath), { recursive: true });
  await writeFile(targetPath, content, 'utf8');
}

export async function copyFileBytes(sourcePath: string, targetPath: string): Promise<void> {
  const bytes = await readFile(sourcePath);
  await mkdir(path.dirname(targetPath), { recursive: true });
  await writeFile(targetPath, bytes);
}

export function toPosixPath(value: string): string {
  return value.replace(/\\/g, '/');
}
