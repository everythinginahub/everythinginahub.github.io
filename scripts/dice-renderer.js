import {
 AmbientLight, BufferGeometry, CanvasTexture, CircleGeometry, DirectionalLight,
 DoubleSide, Euler, Float32BufferAttribute, Group, HemisphereLight,
 LineBasicMaterial, LineSegments, Mesh, MeshBasicMaterial, MeshStandardMaterial,
 PerspectiveCamera, PointLight, Quaternion, Scene, SRGBColorSpace,
 Vector3, WebGLRenderer
} from 'three';

const facePalette=[0xb8b6ff,0x8be0f4,0x83e5c3,0xffd17d,0xffa0b2,0xa8baff];
const d6Pips={1:[4],2:[0,8],3:[0,4,8],4:[0,2,6,8],5:[0,2,4,6,8],6:[0,2,3,5,6,8]};
const vec=values=>new Vector3(...values);
const pointKey=point=>point.map(n=>n.toFixed(5)).join(',');

function polygonCenter(points){return points.reduce((sum,p)=>sum.add(p),new Vector3()).multiplyScalar(1/points.length);}
function polygonNormal(points){return points[1].clone().sub(points[0]).cross(points[2].clone().sub(points[0])).normalize();}
function orderPolygon(indices,vertices,preferredNormal=null){
 const center=polygonCenter(indices.map(i=>vertices[i]));
 const normal=(preferredNormal||polygonNormal(indices.slice(0,3).map(i=>vertices[i]))).clone().normalize();
 if(normal.dot(center)<0)normal.negate();
 const u=vertices[indices[0]].clone().sub(center).normalize(),v=normal.clone().cross(u).normalize();
 const ordered=[...indices].sort((a,b)=>{
  const pa=vertices[a].clone().sub(center),pb=vertices[b].clone().sub(center);
  return Math.atan2(pa.dot(v),pa.dot(u))-Math.atan2(pb.dot(v),pb.dot(u));
 });
 if(polygonNormal(ordered.map(i=>vertices[i])).dot(normal)<0)ordered.reverse();
 return ordered;
}
function convexHullFaces(vertices){
 const planes=new Map(),epsilon=1e-5;
 for(let i=0;i<vertices.length-2;i++)for(let j=i+1;j<vertices.length-1;j++)for(let k=j+1;k<vertices.length;k++){
  const normal=vertices[j].clone().sub(vertices[i]).cross(vertices[k].clone().sub(vertices[i]));
  if(normal.lengthSq()<1e-12)continue;normal.normalize();
  const distance=normal.dot(vertices[i]);let positive=false,negative=false;
  for(const point of vertices){const side=normal.dot(point)-distance;if(side>epsilon)positive=true;else if(side<-epsilon)negative=true;}
  if(positive&&negative)continue;
  const coplanar=[];for(let n=0;n<vertices.length;n++)if(Math.abs(normal.dot(vertices[n])-distance)<epsilon)coplanar.push(n);
  if(coplanar.length>=3)planes.set(coplanar.slice().sort((a,b)=>a-b).join(','),coplanar);
 }
 return [...planes.values()].map(indices=>orderPolygon(indices,vertices));
}
function normalized(vertices,radius=1.27){
 const max=Math.max(...vertices.map(v=>v.length()));return vertices.map(v=>v.clone().multiplyScalar(radius/max));
}
function platonicData(sides){
 const phi=(1+Math.sqrt(5))/2,vertices=[];
 if(sides===4)return {vertices:[[1,1,1],[1,-1,-1],[-1,1,-1],[-1,-1,1]].map(vec),faces:null};
 if(sides===6){for(const x of [-1,1])for(const y of [-1,1])for(const z of [-1,1])vertices.push(vec([x,y,z]));return {vertices,faces:null};}
 if(sides===8)return {vertices:[[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]].map(vec),faces:null};
 if(sides===12){
  for(const a of [-1,1])for(const b of [-1,1])for(const c of [-1,1])vertices.push(vec([a,b,c]));
  for(const a of [-1,1])for(const b of [-1,1])vertices.push(vec([0,a/phi,b*phi]));
  for(const a of [-1,1])for(const b of [-1,1])vertices.push(vec([a/phi,b*phi,0]));
  for(const a of [-1,1])for(const b of [-1,1])vertices.push(vec([a*phi,0,b/phi]));
  return {vertices,faces:null};
 }
 if(sides===20){
  for(const a of [-1,1])for(const b of [-1,1])vertices.push(vec([0,a,b*phi]));
  for(const a of [-1,1])for(const b of [-1,1])vertices.push(vec([a,b*phi,0]));
  for(const a of [-1,1])for(const b of [-1,1])vertices.push(vec([a*phi,0,b]));
  return {vertices,faces:null};
 }
 return null;
}
function d10Data(){
 const vertices=[],faces=[],count=5,radius=1,height=.55;
 for(let i=0;i<count;i++){const a=2*Math.PI*i/count;vertices.push(vec([radius*Math.cos(a),height,radius*Math.sin(a)]));}
 for(let i=0;i<count;i++){const a=2*Math.PI*(i+.5)/count;vertices.push(vec([radius*Math.cos(a),-height,radius*Math.sin(a)]));}
 faces.push([0,1,2,3,4],[9,8,7,6,5]);
 for(let i=0;i<count;i++){const next=(i+1)%count;faces.push([i,next,5+i],[next,5+next,5+i]);}
 const antiprismFaces=faces.map(face=>orderPolygon(face,vertices));
 const dualVertices=antiprismFaces.map(face=>{
  const points=face.map(i=>vertices[i]),center=polygonCenter(points),normal=polygonNormal(points);
  if(normal.dot(center)<0)normal.negate();return normal.divideScalar(normal.dot(center));
 });
 const dualFaces=vertices.map((vertex,index)=>{
  const adjacent=[];for(let i=0;i<antiprismFaces.length;i++)if(antiprismFaces[i].includes(index))adjacent.push(i);
  return orderPolygon(adjacent,dualVertices,vertex);
 });
 return {vertices:dualVertices,faces:dualFaces};
}
function d100Data(){
 // A low-poly, 100-panel spherical die: 10 polar triangles, 80 quads, 10 polar triangles.
 const segments=10,vertices=[vec([0,1,0])],rings=[];
 for(let row=1;row<segments;row++){
  const ring=[],latitude=Math.PI*row/segments,offset=(row%2)*.5;
  for(let column=0;column<segments;column++){
   const longitude=2*Math.PI*(column+offset)/segments;
   ring.push(vertices.length);vertices.push(vec([Math.sin(latitude)*Math.cos(longitude),Math.cos(latitude),Math.sin(latitude)*Math.sin(longitude)]));
  }
  rings.push(ring);
 }
 const south=vertices.length;vertices.push(vec([0,-1,0]));const faces=[];
 for(let i=0;i<segments;i++){const next=(i+1)%segments;faces.push([0,rings[0][i],rings[0][next]]);}
 for(let row=0;row<rings.length-1;row++)for(let i=0;i<segments;i++){
  const next=(i+1)%segments;faces.push([rings[row][i],rings[row][next],rings[row+1][next],rings[row+1][i]]);
 }
 for(let i=0;i<segments;i++){const next=(i+1)%segments;faces.push([south,rings.at(-1)[next],rings.at(-1)[i]]);}
 return {vertices,faces};
}
function dataForSides(sides){
 const platonic=platonicData(sides);if(platonic)return {...platonic,faces:platonic.faces||convexHullFaces(platonic.vertices)};
 if(sides===10)return d10Data();if(sides===100)return d100Data();throw new RangeError('Unsupported die.');
}
function d6Value(normal){if(normal.z>.9)return 1;if(normal.z<-.9)return 6;if(normal.x>.9)return 5;if(normal.x<-.9)return 2;if(normal.y>.9)return 3;return 4;}

/** Create convex, numbered geometry for d4, d6, d8, d10, d12, d20 and d100. */
export function createDieGeometry(sides){
 const data=dataForSides(sides),vertices=normalized(data.vertices),polygons=data.faces.map(face=>orderPolygon(face,vertices));
 const faces=polygons.map(indices=>{
  const points=indices.map(i=>vertices[i]),center=polygonCenter(points),normal=polygonNormal(points);if(normal.dot(center)<0)normal.negate();
  const edge=Math.min(...points.map((point,i)=>point.distanceTo(points[(i+1)%points.length])));
  return {points,center,normal,edge,value:0,materialIndex:0};
 });
 if(sides===6){for(const face of faces)face.value=d6Value(face.normal);}
 else{faces.sort((a,b)=>b.normal.y-a.normal.y||Math.atan2(a.normal.z,a.normal.x)-Math.atan2(b.normal.z,b.normal.x));faces.forEach((face,index)=>{face.value=index+1;});}
 const positions=[],geometry=new BufferGeometry();
 for(const face of faces){const start=positions.length/3,p=face.points;face.materialIndex=sides===6?0:(face.value-1)%facePalette.length;
  for(let i=1;i<p.length-1;i++)positions.push(p[0].x,p[0].y,p[0].z,p[i].x,p[i].y,p[i].z,p[i+1].x,p[i+1].y,p[i+1].z);
  geometry.addGroup(start,positions.length/3-start,face.materialIndex);
 }
 geometry.setAttribute('position',new Float32BufferAttribute(positions,3));geometry.computeVertexNormals();geometry.computeBoundingSphere();return {geometry,faces};
}
function edgeGeometry(faces){
 const positions=[],seen=new Set();
 for(const face of faces)for(let i=0;i<face.points.length;i++){
  const a=face.points[i],b=face.points[(i+1)%face.points.length],ka=pointKey(a.toArray()),kb=pointKey(b.toArray()),key=ka<kb?`${ka}|${kb}`:`${kb}|${ka}`;
  if(seen.has(key))continue;seen.add(key);positions.push(a.x,a.y,a.z,b.x,b.y,b.z);
 }
 const geometry=new BufferGeometry();geometry.setAttribute('position',new Float32BufferAttribute(positions,3));return geometry;
}
function makeAtlas(sides,win){
 const columns=Math.ceil(Math.sqrt(sides)),rows=Math.ceil(sides/columns),cell=128,canvas=win.document.createElement('canvas');canvas.width=columns*cell;canvas.height=rows*cell;
 const context=canvas.getContext('2d');if(!context)throw new Error('Canvas text is unavailable.');
 for(let value=1;value<=sides;value++){
  const column=(value-1)%columns,row=Math.floor((value-1)/columns),cx=column*cell+cell/2,cy=row*cell+cell/2;context.fillStyle='#18213c';
  if(sides===6){for(const position of d6Pips[value]){const x=column*cell+24+(position%3)*40,y=row*cell+24+Math.floor(position/3)*40;context.beginPath();context.arc(x,y,9,0,Math.PI*2);context.fill();}}
  else{const length=String(value).length;context.font=`850 ${length>=3?52:length===2?68:84}px system-ui,-apple-system,"Segoe UI",sans-serif`;context.textAlign='center';context.textBaseline='middle';context.fillText(String(value),cx,cy+2,cell-14);}
 }
 const texture=new CanvasTexture(canvas);texture.colorSpace=SRGBColorSpace;return {texture,columns,rows};
}
function faceTowardCamera(normal){
 const forward=new Vector3(0,0,1),alignment=new Quaternion().setFromUnitVectors(normal,forward);
 const up=new Vector3(0,1,0).applyQuaternion(alignment).normalize(),twist=new Quaternion().setFromAxisAngle(forward,Math.atan2(up.x,up.y));
 return twist.multiply(alignment);
}
function labelGeometry(faces,atlas){
 const positions=[],uvs=[],localUpAxis=new Vector3(0,1,0);
 for(const face of faces){
  const alignment=faceTowardCamera(face.normal),up=localUpAxis.clone().applyQuaternion(alignment.clone().invert()).normalize(),right=up.clone().cross(face.normal).normalize();
  const size=face.edge*(face.points.length===3?.42:face.points.length===4?.5:.52),center=face.center.clone().addScaledVector(face.normal,.015),half=size/2;
  const corners=[center.clone().addScaledVector(right,-half).addScaledVector(up,-half),center.clone().addScaledVector(right,half).addScaledVector(up,-half),center.clone().addScaledVector(right,half).addScaledVector(up,half),center.clone().addScaledVector(right,-half).addScaledVector(up,half)];
  const col=(face.value-1)%atlas.columns,row=Math.floor((face.value-1)/atlas.columns),pad=.08;
  const u0=(col+pad)/atlas.columns,u1=(col+1-pad)/atlas.columns,v1=1-(row+pad)/atlas.rows,v0=1-(row+1-pad)/atlas.rows;
  for(const index of [0,1,2,0,2,3]){const point=corners[index];positions.push(point.x,point.y,point.z);const coord=[[u0,v0],[u1,v0],[u1,v1],[u0,v1]][index];uvs.push(coord[0],coord[1]);}
 }
 const geometry=new BufferGeometry();geometry.setAttribute('position',new Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new Float32BufferAttribute(uvs,2));geometry.computeVertexNormals();return geometry;
}

export function mountDiceRenderer({root,win=window}){
 if(!root||(!win.WebGLRenderingContext&&!win.WebGL2RenderingContext))return null;
 const canvas=win.document.createElement('canvas');canvas.className='dice-3d-canvas';canvas.setAttribute('aria-hidden','true');canvas.tabIndex=-1;
 let renderer;try{renderer=new WebGLRenderer({canvas,alpha:true,antialias:true,powerPreference:'low-power'});}catch{return null;}
 renderer.setPixelRatio(Math.min(win.devicePixelRatio||1,1.5));renderer.setClearColor(0x000000,0);renderer.outputColorSpace=SRGBColorSpace;
 const scene=new Scene(),camera=new PerspectiveCamera(34,1,.1,100),diceLayer=new Group();scene.add(diceLayer);
 scene.add(new HemisphereLight(0xe7f2ff,0x262348,2.1));const key=new DirectionalLight(0xffffff,3.1);key.position.set(-4,6,7);scene.add(key);
 const rim=new PointLight(0x6c74ff,24,30);rim.position.set(4,2,-4);scene.add(rim);const cyan=new PointLight(0x36d7d0,18,24);cyan.position.set(-5,-1,3);scene.add(cyan);
 const entries=[],shadows=[],atlasCache=new Map(),atlasMaterials=new Map(),ownedMaterials=[];let activeFrame=0,alive=true,fit={totalWidth:0,diameter:2.5,scale:1};
 const faceMaterials=facePalette.map(color=>{const material=new MeshStandardMaterial({color,roughness:.27,metalness:.14,flatShading:true});ownedMaterials.push(material);return material;});
 const d6Material=new MeshStandardMaterial({color:0xf8f9ff,roughness:.22,metalness:.08,flatShading:true});ownedMaterials.push(d6Material);
 const edgeMaterial=new LineBasicMaterial({color:0x293252,transparent:true,opacity:.4});ownedMaterials.push(edgeMaterial);
 const textureFor=sides=>{if(!atlasCache.has(sides))atlasCache.set(sides,makeAtlas(sides,win));return atlasCache.get(sides);};
 const labelMaterialFor=sides=>{if(!atlasMaterials.has(sides)){const material=new MeshBasicMaterial({map:textureFor(sides).texture,transparent:true,side:DoubleSide,depthWrite:false,toneMapped:false});atlasMaterials.set(sides,material);ownedMaterials.push(material);}return atlasMaterials.get(sides);};
 root.replaceChildren(canvas);root.classList.add('is-webgl-ready');
 const resize=()=>{
  if(!alive)return;const width=Math.max(1,root.clientWidth||640),height=Math.max(1,root.clientHeight||280);renderer.setSize(width,height,false);camera.aspect=width/height;
  const verticalFov=34*Math.PI/180,horizontalFov=2*Math.atan(Math.tan(verticalFov/2)*(width/height));
  const fitWidth=(fit.totalWidth/2)/Math.tan(horizontalFov/2),fitHeight=(fit.diameter/2+fit.scale*.55)/Math.tan(verticalFov/2);
  camera.position.set(0,0,Math.max(4.4,fitWidth*1.2,fitHeight*1.16));camera.lookAt(0,0,0);camera.updateProjectionMatrix();renderer.render(scene,camera);
 };
 const resizeObserver=win.ResizeObserver?new win.ResizeObserver(resize):null;if(resizeObserver)resizeObserver.observe(root);else win.addEventListener('resize',resize);
 function clearDice(){
  for(const child of [...diceLayer.children]){scene.remove(child);disposeGeometry(child);}
  diceLayer.clear();for(const shadow of shadows){scene.remove(shadow);shadow.geometry.dispose();shadow.material.dispose();}shadows.length=0;entries.length=0;
 }
 function roll(values,sides){
  if(!alive||!values.length)return;if(activeFrame)win.cancelAnimationFrame(activeFrame);clearDice();
  const count=values.length,scale=count===1?1.02:count<=2?.86:count<=4?.72:count<=7?.58:.48,diameter=2.65*scale,slot=diameter+scale*.2,totalWidth=slot*(count-1)+diameter;fit={totalWidth,diameter,scale};
  const atlas=textureFor(sides),labelMaterial=labelMaterialFor(sides);
  values.forEach((value,index)=>{
   const {geometry,faces}=createDieGeometry(sides),materials=sides===6?[d6Material]:faceMaterials,group=new Group(),mesh=new Mesh(geometry,materials);mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);
   const edges=new LineSegments(edgeGeometry(faces),edgeMaterial);group.add(edges);
   const labels=new Mesh(labelGeometry(faces,atlas),labelMaterial);labels.renderOrder=1;group.add(labels);
   const x=(index-(count-1)/2)*slot;group.position.set(x,0,0);group.scale.setScalar(scale);const face=faces.find(item=>item.value===value)||faces[0];
   const final=faceTowardCamera(face.normal),start=new Quaternion().setFromEuler(new Euler((Math.random()*2-1)*Math.PI,(Math.random()*2-1)*Math.PI,(Math.random()*2-1)*Math.PI,'XYZ'));
   diceLayer.add(group);entries.push({group,x,scale,final,start,delay:index*65});
   const shadow=new Mesh(new CircleGeometry(.78,32),new MeshBasicMaterial({color:0x060916,transparent:true,opacity:.4,depthWrite:false}));shadow.rotation.x=-Math.PI/2;shadow.position.set(x,-1.34*scale,0);shadow.scale.setScalar(scale);scene.add(shadow);shadows.push(shadow);
  });
  resize();const startTime=win.performance.now(),duration=1120;
  const tick=now=>{
   if(!alive)return;let running=false;
   for(let index=0;index<entries.length;index++){
    const entry=entries[index],elapsed=now-startTime-entry.delay;
    if(elapsed<0){running=true;entry.group.position.y=.35;continue;}
    const raw=Math.min(1,elapsed/duration),ease=1-Math.pow(1-raw,3);if(raw<1)running=true;
    const remaining=1-ease,offset=entry.final.clone().invert().multiply(entry.start).slerp(new Quaternion(),ease);
    const spin=new Quaternion().setFromEuler(new Euler(Math.PI*4*remaining,Math.PI*5*remaining,Math.PI*3*remaining,'XYZ'));
    entry.group.quaternion.copy(entry.final).multiply(offset).multiply(spin);
    entry.group.position.x=entry.x+Math.sin(raw*Math.PI*2+entry.delay*.01)*.08*remaining;
    entry.group.position.y=.58*remaining+Math.abs(Math.sin(raw*Math.PI*3))*remaining*.38;
    const shadow=shadows[index];shadow.material.opacity=.42-.19*Math.min(1,entry.group.position.y);shadow.scale.setScalar(entry.scale*(1+entry.group.position.y*.24));
   }
   renderer.render(scene,camera);if(running)activeFrame=win.requestAnimationFrame(tick);else activeFrame=0;
  };
  activeFrame=win.requestAnimationFrame(tick);
 }
 function disposeGeometry(object){object.traverse(item=>item.geometry?.dispose());}
 resize();
 return {roll,destroy(){if(!alive)return;alive=false;if(activeFrame)win.cancelAnimationFrame(activeFrame);resizeObserver?.disconnect();win.removeEventListener('resize',resize);clearDice();for(const material of ownedMaterials)material.dispose();for(const atlas of atlasCache.values())atlas.texture.dispose();renderer.dispose();canvas.remove();}};
}
