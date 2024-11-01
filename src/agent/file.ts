// agent/file.ts

import { strict as assert } from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

export function isApiIndexFile(filename: string): boolean {
  return /.*\/src\/api\/v\d+\/index.ts/u.test(filename);
}

export function getProjectRootFolder(indexFilename: string): string {
  return indexFilename.substring(0, indexFilename.lastIndexOf('/src/'));
}

export function getSwaggerPathByIndexFile(indexFilename: string): string {
  return indexFilename.replace(/index\.ts$/u, 'swagger.yml');
}

export function loadSwagger(filename: string): string {
  return fs.readFileSync(filename, 'utf8');
}

export function loadPackageJson(projectRoot: string): string {
  return fs.readFileSync(`${projectRoot}/package.json`, 'utf8');
}

export function getApiFolder(folder: string): string | undefined {
  if (/^(?<absolutePath>.*\/)*src\/api\/v\d+$/u.test(folder)) {
    return folder;
  }
  const upperFolder = folder.substring(0, folder.lastIndexOf('/'));
  return upperFolder.trim() === '' ? undefined : getApiFolder(upperFolder);
}

export function getApiIndexPathByFilename(filename: string): string {
  const apiFolder = getApiFolder(filename);
  assert(apiFolder !== undefined, `Cannot find api folder for ${filename}`);
  const relativePath = path.relative(path.dirname(filename), `${apiFolder}/index`);
  return relativePath.startsWith('../') ? relativePath : `./${relativePath}`;
}
