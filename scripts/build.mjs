// Builds the HaxePress package: bundles the frontend module with esbuild into
// `build/package/public`, copies the manifest, stylesheet and catalogues, and
// writes `dist/<slug>-<version>.zip` within HaxePress's package limits.

import { build } from 'esbuild';
import { zipSync } from 'fflate';
import {
  cpSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const output = join(root, 'build/package');
const manifest = JSON.parse(readFileSync(join(root, 'cms-package.json'), 'utf8'));

// HaxePress rejects packages over these limits (docs/PLUGIN-PACKAGES.md).
const MAX_ENTRIES = 256;
const MAX_FILE_BYTES = 16 * 1024 * 1024;
const MAX_ARCHIVE_BYTES = 64 * 1024 * 1024;
const MAX_EXPANDED_BYTES = 128 * 1024 * 1024;
// Package paths: letters, digits, `_`, `.`, `-` and `/`, no segment starting with a dot.
const SAFE_PATH = /^(?!.*(?:^|\/)\.)[A-Za-z0-9_./-]+$/;

/** Every select option of the theme settings needs a theme in src/themes.ts, and back. */
function checkThemes() {
  const source = readFileSync(join(root, 'src/themes.ts'), 'utf8');
  const declared = new Set(
    Array.from(
      source.matchAll(/'?([a-z0-9-]+)'?: \(\) => import\('shiki\/themes\/\1\.mjs'\)/g),
      (match) => match[1],
    ),
  );
  const offered = new Set();
  for (const key of ['light_theme', 'dark_theme']) {
    const field = manifest.fields.find((candidate) => candidate.key === key);
    for (const option of field.options) offered.add(option.value);
    if (!field.options.some((option) => option.value === field.defaultValue)) {
      throw new Error(`The default of ${key} is not one of its options.`);
    }
  }
  const missing = [...offered].filter((name) => !declared.has(name));
  const unused = [...declared].filter((name) => !offered.has(name));
  if (missing.length > 0 || unused.length > 0) {
    throw new Error(
      `Theme settings and src/themes.ts differ: missing ${missing}, not offered ${unused}`,
    );
  }
}

function files(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? files(path) : [path];
  });
}

checkThemes();
rmSync(join(root, 'build'), { recursive: true, force: true });
mkdirSync(join(output, 'public'), { recursive: true });

const result = await build({
  absWorkingDir: root,
  entryPoints: { [manifest.assets.module.replace(/\.m?js$/, '')]: 'src/index.ts' },
  outdir: join(output, 'public'),
  entryNames: '[name]',
  chunkNames: 'chunks/[name]-[hash]',
  bundle: true,
  splitting: true,
  format: 'esm',
  platform: 'browser',
  target: ['es2022'],
  minify: true,
  legalComments: 'none',
  metafile: true,
  logLevel: 'warning',
});

cpSync(join(root, 'cms-package.json'), join(output, 'cms-package.json'));
cpSync(join(root, 'src/shiki.css'), join(output, 'public', manifest.assets.stylesheet));
cpSync(join(root, 'lang'), join(output, 'lang'), { recursive: true });

// Bundled packages keep their license notices in the package.
const packages = new Map();
for (const file of Object.values(result.metafile.outputs)) {
  for (const [input, usage] of Object.entries(file.inputs)) {
    const match = input.match(/^node_modules\/((?:@[^/]+\/)?[^/]+)\//);
    if (match && usage.bytesInOutput > 0 && !packages.has(match[1])) {
      packages.set(match[1], join(root, 'node_modules', match[1]));
    }
  }
}
const notices = [
  'This package bundles the following open source software.',
  'The grammars of @shikijs/langs and the themes of @shikijs/themes come from',
  'https://github.com/shikijs/textmate-grammars-themes, where each keeps the license of its source project.',
];
for (const [name, directory] of [...packages].sort(([a], [b]) => a.localeCompare(b))) {
  const info = JSON.parse(readFileSync(join(directory, 'package.json'), 'utf8'));
  const license = readdirSync(directory).find((file) => /^licen[cs]e/i.test(file));
  const text = license
    ? readFileSync(join(directory, license), 'utf8').trim()
    : `License: ${info.license}`;
  notices.push('', '-'.repeat(72), `${name} ${info.version}`, '', text);
}
writeFileSync(join(output, 'THIRD-PARTY-NOTICES.txt'), `${notices.join('\n')}\n`);

const entries = {};
let expanded = 0;
for (const path of files(output).sort()) {
  const name = relative(output, path).split('\\').join('/');
  const size = statSync(path).size;
  if (!SAFE_PATH.test(name) || name.split('/').length > 8)
    throw new Error(`Unsafe package path: ${name}`);
  if (size > MAX_FILE_BYTES) throw new Error(`${name} is larger than 16 MB.`);
  expanded += size;
  // A fixed date keeps the archive the same for the same sources.
  entries[name] = [readFileSync(path), { mtime: new Date('2026-01-01T00:00:00Z') }];
}
const count = Object.keys(entries).length;
if (count > MAX_ENTRIES)
  throw new Error(`The package has ${count} files; HaxePress accepts ${MAX_ENTRIES}.`);
if (expanded > MAX_EXPANDED_BYTES) throw new Error('The package expands to more than 128 MB.');
const archive = zipSync(entries, { level: 9 });
if (archive.length > MAX_ARCHIVE_BYTES) throw new Error('The package is larger than 64 MB.');

mkdirSync(join(root, 'dist'), { recursive: true });
const target = join(root, 'dist', `${manifest.slug}-${manifest.version}.zip`);
writeFileSync(target, archive);
const entry = statSync(join(output, 'public', manifest.assets.module)).size;
const kilobytes = (bytes) => `${(bytes / 1024).toFixed(1)} KB`;
console.log(
  `${relative(root, target)}: ${count} files, ${kilobytes(archive.length)} compressed, ${kilobytes(expanded)} expanded; entry module ${kilobytes(entry)}`,
);
