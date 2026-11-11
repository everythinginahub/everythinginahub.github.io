import {build} from 'esbuild';

await build({
 entryPoints:['scripts/dice-renderer.js'],
 bundle:true,
 format:'esm',
 platform:'browser',
 target:'es2022',
 minify:true,
 treeShaking:true,
 legalComments:'inline',
 outfile:'public/dice-renderer.js'
});
