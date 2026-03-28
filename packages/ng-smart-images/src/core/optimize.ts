import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

import sharp from 'sharp';

import type {
  SmartImageFormat,
  SmartImageSource,
  SmartImagesManifest,
} from '../runtime/manifest.js';
import type { SmartImageResolvedEntry } from './types.js';
import { toPosixPath } from '../utils/fs.js';

export interface GeneratedImageArtifact {
  entry: SmartImagesManifest[string];
}

export async function generateImageArtifact(input: {
  sourceKey: string;
  sourcePath: string;
  sourceRootPath: string;
  publicPath: string;
  outputRoot: string;
  entryConfig: SmartImageResolvedEntry;
}): Promise<GeneratedImageArtifact> {
  const metadata = await sharp(input.sourcePath, { failOn: 'error' }).metadata();
  if (!metadata.width || !metadata.height || !metadata.format) {
    throw new Error(`Cannot determine image metadata for ${input.sourcePath}`);
  }

  const outputWidths = normalizeOutputWidths(input.entryConfig.sizes, metadata.width);
  const relativeSourcePath = toPosixPath(path.relative(input.sourceRootPath, input.sourcePath));
  const relativeDir =
    path.dirname(relativeSourcePath) === '.' ? '' : path.dirname(relativeSourcePath);
  const baseName = path.parse(relativeSourcePath).name;
  const originalExtension = metadata.format === 'jpeg' ? 'jpg' : metadata.format;

  const sources: SmartImageSource[] = [];
  const generatedOutputExtensions = new Set<string>();
  for (const extension of input.entryConfig.extensions) {
    const effectiveExtension = extension === 'original' ? (originalExtension ?? 'png') : extension;
    if (generatedOutputExtensions.has(effectiveExtension)) {
      continue;
    }

    const generatedSources = await buildSourcesForExtension({
      extension,
      widths: outputWidths,
      quality: input.entryConfig.quality,
      sourcePath: input.sourcePath,
      relativeDir,
      baseName,
      outputRoot: input.outputRoot,
      publicPath: input.publicPath,
    });
    sources.push(...generatedSources);
    generatedOutputExtensions.add(effectiveExtension);
  }

  const fallbackSrc =
    pickFirstSourceByFormat(sources, 'original')?.src ??
    pickFirstSourceByFormat(sources, 'webp')?.src ??
    sources[0]?.src ??
    '';

  return {
    entry: {
      key: input.sourceKey,
      originalPath: input.sourceKey,
      width: metadata.width,
      height: metadata.height,
      fallbackSrc,
      placeholderDataUrl: '',
      sources,
    },
  };
}

async function buildSourcesForExtension(input: {
  extension: SmartImageFormat;
  widths: number[];
  quality: number;
  sourcePath: string;
  relativeDir: string;
  baseName: string;
  outputRoot: string;
  publicPath: string;
}): Promise<SmartImageSource[]> {
  const metadata = await sharp(input.sourcePath, { failOn: 'error' }).metadata();
  const originalExtension = metadata.format === 'jpeg' ? 'jpg' : (metadata.format ?? 'png');
  const outputs: SmartImageSource[] = [];

  for (const width of input.widths) {
    const transformer = sharp(input.sourcePath, { failOn: 'error' }).resize({
      width,
      withoutEnlargement: true,
    });

    let fileExtension = originalExtension;
    let buffer: Buffer;

    if (input.extension === 'avif') {
      fileExtension = 'avif';
      buffer = await transformer.avif({ quality: input.quality }).toBuffer();
    } else if (input.extension === 'webp') {
      fileExtension = 'webp';
      buffer = await transformer.webp({ quality: input.quality }).toBuffer();
    } else {
      buffer = await toOriginalFormatBuffer(transformer, fileExtension, input.quality);
    }

    const hash = createHash('sha256').update(buffer).digest('hex').slice(0, 10);
    const widthSuffix = width > 0 ? `-${width}` : '';
    const fileName = `${input.baseName}${widthSuffix}-${hash}.${fileExtension}`;
    const targetPath = path.join(input.outputRoot, input.relativeDir, fileName);
    await mkdir(path.dirname(targetPath), { recursive: true });
    await writeFile(targetPath, buffer);

    outputs.push({
      format: input.extension,
      width,
      src: `${input.publicPath}/${toPosixPath(path.posix.join(input.relativeDir, fileName)).replace(/^\/+/, '')}`,
    });
  }

  return outputs;
}

async function toOriginalFormatBuffer(
  transformer: sharp.Sharp,
  extension: string,
  quality: number,
): Promise<Buffer> {
  switch (extension) {
    case 'jpg':
    case 'jpeg':
      return transformer.jpeg({ quality }).toBuffer();
    case 'png':
      return transformer.png({ quality }).toBuffer();
    case 'webp':
      return transformer.webp({ quality }).toBuffer();
    case 'avif':
      return transformer.avif({ quality }).toBuffer();
    default:
      return transformer.toFormat(extension as keyof sharp.FormatEnum).toBuffer();
  }
}

function normalizeOutputWidths(configuredSizes: number[], sourceWidth: number): number[] {
  const filtered = configuredSizes.filter((value) => value > 0 && value <= sourceWidth);
  if (filtered.length === 0) {
    return [sourceWidth];
  }

  return Array.from(new Set(filtered)).sort((left, right) => left - right);
}

function pickFirstSourceByFormat(
  sources: SmartImageSource[],
  format: SmartImageFormat,
): SmartImageSource | null {
  return (
    [...sources]
      .filter((entry) => entry.format === format)
      .sort((left, right) => right.width - left.width)[0] ?? null
  );
}
