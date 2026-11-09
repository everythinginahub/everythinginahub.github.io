// PDF files are read and rendered locally. Suggestions are always reviewed before saving.
import {suggestLessons,cleanTimetableCanvas} from './timetable-import.js?v=20261114-17';
export function pdfTextWords(items,viewport,transform){
 const words=[];for(const item of items){if(typeof item.str!=='string'||!item.str.trim())continue;const m=transform(viewport.transform,item.transform),height=Math.max(1,Math.hypot(m[2],m[3])),width=Math.abs(item.width*viewport.scale),str=item.str;for(const match of str.matchAll(/\S+/g)){const start=match.index||0;words.push({text:match[0],x:m[4]+width*(start+match[0].length/2)/str.length,y:m[5]-height/2,h:height});}}return words;
}
export async function readTimetablePdf(file,{win=window,recognize,say=()=>{},cancelled=()=>false,loadPdf}={}){
 const pdfjs=loadPdf?await loadPdf():await import('./pdf/pdf.min.mjs');pdfjs.GlobalWorkerOptions.workerSrc=new URL('./pdf/pdf.worker.min.mjs',import.meta.url).href;
 const data=new Uint8Array(await file.arrayBuffer());const task=pdfjs.getDocument({data,isEvalSupported:false,useWorkerFetch:false,disableFontFace:true,maxImageSize:16000000});let doc;
 try{doc=await task.promise;if(doc.numPages>5)throw new Error('page-limit');if(doc.numPages<1)throw new Error('empty-pdf');const rows=[],texts=[];
  for(let n=1;n<=doc.numPages;n++){if(cancelled())throw new Error('cancelled');say(`Reading PDF page ${n} of ${doc.numPages}…`);const page=await doc.getPage(n);try{const viewport=page.getViewport({scale:1});if(!Number.isFinite(viewport.width)||!Number.isFinite(viewport.height)||viewport.width<=0||viewport.height<=0||viewport.width*viewport.height>40000000)throw new Error('page-size');const content=await page.getTextContent();if(cancelled())throw new Error('cancelled');const words=pdfTextWords(content.items,viewport,pdfjs.Util.transform);let suggestions=suggestLessons(words),text=content.items.map(x=>x.str||'').join(' ');
   if(!suggestions.length){say(`Reading PDF page ${n} of ${doc.numPages} as an image…`);const scale=Math.min(2,2200/Math.max(viewport.width,viewport.height)),vp=page.getViewport({scale}),canvas=win.document.createElement('canvas');canvas.width=Math.max(1,Math.ceil(vp.width));canvas.height=Math.max(1,Math.ceil(vp.height));const context=canvas.getContext('2d');context.fillStyle='#fff';context.fillRect(0,0,canvas.width,canvas.height);await page.render({canvasContext:context,viewport:vp,background:'#fff'}).promise;if(cancelled())throw new Error('cancelled');cleanTimetableCanvas(canvas);const result=await recognize(canvas);suggestions=result.suggestions;text=result.text||text;canvas.width=canvas.height=1;}
   rows.push(...suggestions);texts.push(`Page ${n}: ${text||'No text detected.'}`);
  }finally{page.cleanup();}}
  return {suggestions:rows,text:texts.join('\n\n')};
 }finally{if(doc)await doc.destroy();else await task.destroy();}
}
