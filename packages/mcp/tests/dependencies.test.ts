import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const packageDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const srcDir = join(packageDir, 'src');

const IMPORT_STATEMENT =
  /^(?:import|export)\b[^;'"]*?\bfrom\s*['"]([^'"]+)['"]|^import\s*['"]([^'"]+)['"]/gm;

const listSourceFiles = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return listSourceFiles(path);
    return entry.name.endsWith('.ts') ? [path] : [];
  });

const toPackageName = (specifier: string): string => {
  const [first, second] = specifier.split('/');
  return first.startsWith('@') ? `${first}/${second}` : first;
};

const isBareImport = (specifier: string): boolean =>
  !specifier.startsWith('.') && !specifier.startsWith('/') && !specifier.startsWith('node:');

const importedPackages = (): string[] => {
  const names = new Set<string>();
  for (const file of listSourceFiles(srcDir)) {
    for (const match of readFileSync(file, 'utf8').matchAll(IMPORT_STATEMENT)) {
      const specifier = match[1] ?? match[2];
      if (isBareImport(specifier)) names.add(toPackageName(specifier));
    }
  }
  return [...names].sort();
};

describe('package dependencies', () => {
  it('declares every bare import in src as a dependency or peerDependency', () => {
    const manifest = JSON.parse(readFileSync(join(packageDir, 'package.json'), 'utf8'));
    const declared = new Set([
      ...Object.keys(manifest.dependencies ?? {}),
      ...Object.keys(manifest.peerDependencies ?? {}),
    ]);

    const undeclared = importedPackages().filter((name) => !declared.has(name));

    expect(undeclared).toEqual([]);
  });
});
