// Rebuild the self-hosted PDF.js browser assets from the pinned npm package.
import {mkdir,copyFile} from 'node:fs/promises';
await mkdir('public/pdf',{recursive:true});
for(const [source,name] of [['build/pdf.min.mjs','pdf.min.mjs'],['build/pdf.worker.min.mjs','pdf.worker.min.mjs'],['LICENSE','LICENSE']])await copyFile(`node_modules/pdfjs-dist/${source}`,`public/pdf/${name}`);
