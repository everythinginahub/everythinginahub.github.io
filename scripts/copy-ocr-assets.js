// Rebuild the self-hosted browser OCR assets from pinned npm packages.
import {mkdir,copyFile} from 'node:fs/promises';
const dest='public/ocr/';await mkdir(dest,{recursive:true});
for(const [from,to] of [
 ['node_modules/tesseract.js/dist/tesseract.esm.min.js','tesseract.esm.min.js'],
 ['node_modules/tesseract.js/dist/worker.min.js','worker.min.js'],
 ['node_modules/tesseract.js/dist/tesseract.min.js.LICENSE.txt','tesseract.min.js.LICENSE.txt'],
 ['node_modules/tesseract.js/dist/worker.min.js.LICENSE.txt','worker.min.js.LICENSE.txt'],
 ['node_modules/tesseract.js/LICENSE.md','TESSERACT-JS-LICENSE'],
 ['node_modules/tesseract.js-core/LICENSE','TESSERACT-CORE-LICENSE'],
 ['node_modules/tesseract.js-core/tesseract-core-lstm.wasm.js','tesseract-core-lstm.wasm.js'],
 ['node_modules/tesseract.js-core/tesseract-core-simd-lstm.wasm.js','tesseract-core-simd-lstm.wasm.js'],
 ['node_modules/@tesseract.js-data/eng/4.0.0_best_int/eng.traineddata.gz','eng.traineddata.gz'],
])await copyFile(from,dest+to);
