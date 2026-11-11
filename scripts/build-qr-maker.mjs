import {build} from 'esbuild';

await build({
  entryPoints:['scripts/qr-maker.js'],
  bundle:true,
  format:'esm',
  platform:'browser',
  target:'es2022',
  minify:true,
  treeShaking:true,
  legalComments:'inline',
  outfile:'public/qr-maker.js'
});
