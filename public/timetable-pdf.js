// PDF files are read and rendered locally. Suggestions are always reviewed before saving.
import {suggestLessons,cleanTimetableCanvas,parseTime} from './timetable-import.js?v=20261114-18';
export function pdfTextWords(items,viewport,transform){
 const words=[];for(const item of items){if(typeof item.str!=='string'||!item.str.trim())continue;const m=transform(viewport.transform,item.transform),height=Math.max(1,Math.hypot(m[2],m[3])),width=Math.abs(item.width*viewport.scale),str=item.str;for(const match of str.matchAll(/\S+/g)){const start=match.index||0;words.push({text:match[0],x:m[4]+width*(start+match[0].length/2)/str.length,y:m[5]-height/2,h:height});}}return words;
}
// Some school portals print one independent stack of cards per weekday. Their
// periods do not share horizontal rows, so parsing a grid by y-position mixes
// adjacent lessons. Recognise explicit day:period labels and keep each card local.
export function suggestPeriodCards(items,viewport,transform){
 const fragments=items.filter(x=>typeof x.str==='string'&&x.str.trim()).map(item=>{const m=transform(viewport.transform,item.transform);return {text:item.str.trim(),x:m[4],y:m[5],h:Math.max(1,Math.hypot(m[2],m[3])),font:item.fontName||''};});
 const labels=['mon','tue','wed','thu','fri','sat','sun'];
 const markers=fragments.map(f=>{const m=f.text.match(/^(mon|tue|wed|thu|fri|sat|sun)(?:day)?\s*:\s*(\d{1,2})$/i);return m?{...f,day:labels.indexOf(m[1].toLowerCase())}:null;}).filter(Boolean);
 const grouped=new Map();for(const mark of markers){if(!grouped.has(mark.day))grouped.set(mark.day,[]);grouped.get(mark.day).push(mark);}
 // Do not apply the specialised parser to arbitrary prose or other grid formats.
 if(grouped.size<2||[...grouped.values()].filter(a=>a.length>=2).length<2)return null;
 const columns=[...grouped].map(([day,marks])=>({day,x:marks.reduce((sum,m)=>sum+m.x,0)/marks.length,marks:marks.sort((a,b)=>a.y-b.y)})).sort((a,b)=>a.x-b.x);
 if(columns.some(c=>c.marks.some(m=>Math.abs(m.x-c.x)>Math.max(6,m.h*1.5)))||columns.some((c,i)=>i&&c.x-columns[i-1].x<20))return null;
 const typicalSpacing=(columns.at(-1).x-columns[0].x)/(columns.length-1);
 const rows=[];
 for(let ci=0;ci<columns.length;ci++){const col=columns[ci],left=col.x-Math.max(3,col.marks[0].h),right=ci+1<columns.length?columns[ci+1].x-Math.max(3,col.marks[0].h):col.x+typicalSpacing;
  for(let j=0;j<col.marks.length;j++){const mark=col.marks[j],end=col.marks[j+1]?.y??viewport.height,inside=fragments.filter(f=>f.x>=left&&f.x<right&&f.y>mark.y+1&&f.y<end-1).sort((a,b)=>a.y-b.y||a.x-b.x);
   const timeFrag=inside.find(f=>parseTime(f.text));if(!timeFrag){rows.push({title:'',day:col.day,time:'',room:''});continue;}const time=parseTime(timeFrag.text),after=inside.filter(f=>f.y>timeFrag.y+Math.max(1,timeFrag.h*.3)),first=after.find(f=>!/[\u0000-\u001f\ue000-\uf8ff]/.test(f.text)&&!/^[-–—]+$/.test(f.text));if(!first){rows.push({title:'',day:col.day,time,room:''});continue;}
   const titleParts=[],meta=[];let inMeta=false;for(const f of after){if(!inMeta&&(f===first||f.font===first.font)&&!/[\u0000-\u001f\ue000-\uf8ff]/.test(f.text))titleParts.push(f.text);else {inMeta=true;meta.push(f);}}
   const joinParts=parts=>parts.reduce((a,part)=>{part=part.trim();if(!a)return part;return a+(/^[a-z]{1,3}(?:\s|$)/.test(part)?'':' ')+part;},'').replace(/\s+/g,' ').trim();
   const title=joinParts(titleParts).slice(0,80);let teacher='',room='';const chunks=[];let chunk=[];for(const f of meta){if(/[\u0000-\u001f\ue000-\uf8ff]/.test(f.text)){if(chunk.length)chunks.push(chunk);chunk=[];}else chunk.push(f.text);}if(chunk.length)chunks.push(chunk);
   if(chunks.length){const firstText=joinParts(chunks[0]);if(/^(?:mr|mrs|miss|ms|dr|prof)\b/i.test(firstText)){teacher=firstText.slice(0,80);room=joinParts(chunks.slice(1).flat()).slice(0,50);}else if(chunks.length===1)room=firstText.slice(0,50);}
   const row={title,day:col.day,time,room};if(teacher)row.teacher=teacher;rows.push(row);
  }
 }
 return rows;
}
export async function readTimetablePdf(file,{win=window,recognize,say=()=>{},cancelled=()=>false,loadPdf}={}){
 const pdfjs=loadPdf?await loadPdf():await import('./pdf/pdf.min.mjs');pdfjs.GlobalWorkerOptions.workerSrc=new URL('./pdf/pdf.worker.min.mjs',import.meta.url).href;
 const data=new Uint8Array(await file.arrayBuffer());const task=pdfjs.getDocument({data,isEvalSupported:false,useWorkerFetch:false,disableFontFace:true,maxImageSize:16000000});let doc;
 try{doc=await task.promise;if(doc.numPages>5)throw new Error('page-limit');if(doc.numPages<1)throw new Error('empty-pdf');const rows=[],texts=[];
  for(let n=1;n<=doc.numPages;n++){if(cancelled())throw new Error('cancelled');say(`Reading PDF page ${n} of ${doc.numPages}…`);const page=await doc.getPage(n);try{const viewport=page.getViewport({scale:1});if(!Number.isFinite(viewport.width)||!Number.isFinite(viewport.height)||viewport.width<=0||viewport.height<=0||viewport.width*viewport.height>40000000)throw new Error('page-size');const content=await page.getTextContent();if(cancelled())throw new Error('cancelled');const words=pdfTextWords(content.items,viewport,pdfjs.Util.transform);let text=content.items.map(x=>x.str||'').join(' '),canvas=null;
   async function renderPage(){if(canvas)return canvas;const scale=Math.min(2,2200/Math.max(viewport.width,viewport.height)),vp=page.getViewport({scale});canvas=win.document.createElement('canvas');canvas.width=Math.max(1,Math.ceil(vp.width));canvas.height=Math.max(1,Math.ceil(vp.height));const context=canvas.getContext('2d',{willReadFrequently:true});context.fillStyle='#fff';context.fillRect(0,0,canvas.width,canvas.height);await page.render({canvasContext:context,viewport:vp,background:'#fff'}).promise;if(cancelled())throw new Error('cancelled');return canvas;}
   // Printed PDFs can have an otherwise blank final page containing only a
   // date and URL. Verify the middle is actually blank, including images,
   // before treating it as page furniture rather than a lesson.
   let blank=false;if(rows.length&&words.length&&words.every(w=>w.y<viewport.height*.06||w.y>viewport.height*.94)){const c=await renderPage(),pixels=c.getContext('2d',{willReadFrequently:true}).getImageData(0,0,c.width,c.height).data;let ink=0;for(let y=Math.floor(c.height*.06);y<c.height*.94&&ink<8;y+=4)for(let x=0;x<c.width&&ink<8;x+=4){const k=(y*c.width+x)*4;if(pixels[k]<220&&pixels[k+1]<220&&pixels[k+2]<220)ink++;}blank=ink<8;}
   let suggestions=blank?[]:(suggestPeriodCards(content.items,viewport,pdfjs.Util.transform)??suggestLessons(words));
   if(!blank&&!suggestions.length){say(`Reading PDF page ${n} of ${doc.numPages} as an image…`);const c=await renderPage();cleanTimetableCanvas(c);const result=await recognize(c);suggestions=result.suggestions;text=result.text||text;}
   if(canvas)canvas.width=canvas.height=1;
   rows.push(...suggestions);texts.push(`Page ${n}: ${text||'No text detected.'}`);
  }finally{page.cleanup();}}
  return {suggestions:rows,text:texts.join('\n\n')};
 }finally{if(doc)await doc.destroy();else await task.destroy();}
}
