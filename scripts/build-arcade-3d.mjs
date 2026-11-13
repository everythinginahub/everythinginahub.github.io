import { copyFile, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = resolve(root, 'scripts/arcade-3d-renderer-source.js');
const output = resolve(root, 'public/arcade-3d-renderer.bundle.js');
await build({
  entryPoints: [source],
  bundle: true,
  format: 'esm',
  target: 'es2022',
  minify: true,
  legalComments: 'inline',
  outfile: output
});
const rendererBundle = await readFile(output, 'utf8');
await writeFile(output, rendererBundle.replace(/^ +(?=\t)/gm, '').replace(/[ \t]+$/gm, ''));
await copyFile(resolve(root, 'node_modules/three/LICENSE'), resolve(root, 'public/THREE-LICENSE.txt'));
console.log('Built the local Three.js renderer bundle and copied its MIT license.');
