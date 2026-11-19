import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {CITY_BUILDINGS,CITY_STOPS,CITY_SERVICES,cityObjective} from '../public/neon-city-engine.js';
import {cityGraphicsSettings} from '../public/neon-city-graphics.js';

export function roundedCityGeometry(w,h,d,r=.15){return new RoundedBoxGeometry(w,h,d,3,Math.min(r,w/3,h/3,d/3));}
export function palmCanopyGeometry(){
 const points=[],uvs=[];
 // Eight curved, tapered fronds in a single draw call, rather than box leaves.
 const vertex=(angle,t,side)=>{const radius=t*4.4,width=Math.sin(t*Math.PI)*.55;return [Math.sin(angle)*radius+Math.cos(angle)*width*side,Math.sin(t*Math.PI)*.6-t*t*1.5,Math.cos(angle)*radius-Math.sin(angle)*width*side];};
 for(let leaf=0;leaf<8;leaf++)for(let segment=0;segment<12;segment++){
  const a=leaf*Math.PI/4,t=segment/12,next=(segment+1)/12;
  for(const [fraction,side] of [[t,-1],[next,-1],[next,1],[t,-1],[next,1],[t,1]]){points.push(...vertex(a,fraction,side));uvs.push((side+1)/2,fraction);}
 }
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(points,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));g.computeVertexNormals();return g;
}

export function createCityRenderer(canvas,win=window){
 if(!win.WebGL2RenderingContext)return null;
 let renderer;try{renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'low-power'});}catch{return null;}
 renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.08;
 renderer.shadowMap.type=THREE.PCFShadowMap;
 const scene=new THREE.Scene();scene.background=new THREE.Color('#a9cbd7');scene.fog=new THREE.Fog('#a9cbd7',85,245);
 const ambient=new THREE.HemisphereLight(0xd9efff,0x837862,2);scene.add(ambient);
 const sun=new THREE.DirectionalLight(0xffe1ac,3.2);sun.position.set(-35,65,25);sun.castShadow=true;
 sun.shadow.camera.left=-42;sun.shadow.camera.right=42;sun.shadow.camera.top=42;sun.shadow.camera.bottom=-42;sun.shadow.camera.near=1;sun.shadow.camera.far=170;sun.shadow.bias=-.0003;sun.shadow.normalBias=.12;scene.add(sun,sun.target);
 const camera=new THREE.PerspectiveCamera(68,960/540,.08,650),geometries=new Set(),materials=new Set(),textures=new Set(),geometryCache=new Map();
 const geo=g=>(geometries.add(g),g);
 const mat=(color,options={})=>{const m=new THREE.MeshStandardMaterial({color,roughness:.72,...options});materials.add(m);return m;};
 const road=mat(0xb9c2cc),pavement=mat(0x9aa6a6),sand=mat(0xe8d2a7),rubber=mat(0x171d25),chrome=mat(0xbcced4,{metalness:.8,roughness:.24});
 const cyan=mat(0x70e5d8,{emissive:0x18685e}),pink=mat(0xea7289,{emissive:0x702336}),gold=mat(0xffd995,{emissive:0x614018});
 const blue=mat(0x257ac0,{metalness:.55,roughness:.28}),dark=mat(0x243445),glass=mat(0x7197ad,{metalness:.55,roughness:.16});
 const purple=mat(0x9383c2),green=mat(0x71c29d),leafMaterial=mat(0x397f54,{side:THREE.DoubleSide,roughness:.9}),trunkMaterial=mat(0x8b7860);
 function mesh(g,m,x,y,z,parent=scene,cast=true){const o=new THREE.Mesh(g,m);o.position.set(x,y,z);o.castShadow=cast;o.receiveShadow=true;parent.add(o);return o;}
 function box(w,h,d,m,x=0,y=0,z=0,parent=scene,round=0){
  const key=`${w}:${h}:${d}:${round}`;if(!geometryCache.has(key))geometryCache.set(key,geo(round?roundedCityGeometry(w,h,d,round):new THREE.BoxGeometry(w,h,d)));
  return mesh(geometryCache.get(key),m,x,y,z,parent);
 }
 function cylinder(rt,rb,h,m,x,y,z,parent=scene){const key=`c:${rt}:${rb}:${h}`;if(!geometryCache.has(key))geometryCache.set(key,geo(new THREE.CylinderGeometry(rt,rb,h,20)));return mesh(geometryCache.get(key),m,x,y,z,parent);}
 function sphere(radius,m,x,y,z,parent=scene,scale=[1,1,1]){const key=`s:${radius}`;if(!geometryCache.has(key))geometryCache.set(key,geo(new THREE.SphereGeometry(radius,20,12)));const o=mesh(geometryCache.get(key),m,x,y,z,parent);o.scale.set(...scale);return o;}
 function texture(draw){const c=win.document.createElement('canvas');c.width=256;c.height=256;const context=c.getContext('2d');draw(context);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;textures.add(t);return t;}
 let noiseSeed=41;const random=()=>{noiseSeed=(noiseSeed*1664525+1013904223)>>>0;return noiseSeed/4294967296;};
 function grain(base,amount){return texture(c=>{c.fillStyle=base;c.fillRect(0,0,256,256);for(let i=0;i<14000;i++){const n=Math.floor(random()*amount);c.fillStyle=`rgba(${n},${n},${n},.13)`;c.fillRect(random()*256,random()*256,1.5,1.5);}});}
 const asphalt=grain('#565d65',255);asphalt.wrapS=asphalt.wrapT=THREE.RepeatWrapping;asphalt.repeat.set(32,24);road.map=asphalt;road.bumpMap=asphalt;road.bumpScale=.055;
 const sandMap=grain('#e5cf9f',255);sandMap.wrapS=sandMap.wrapT=THREE.RepeatWrapping;sandMap.repeat.set(5,24);sand.map=sandMap;sand.bumpMap=sandMap;sand.bumpScale=.08;
 box(250,.25,200,road,20,-.2,0);box(34,.16,200,sand,120,-.02,0);box(2,.22,200,pavement,104,.06,0);

 // Local procedural facades: glass panes, frames and lit/unlit rooms.
 const facadeMaps=['#52646e','#657c80','#756e79','#5f7186'].map(base=>texture(c=>{
  c.fillStyle=base;c.fillRect(0,0,256,256);
  for(let row=0;row<4;row++)for(let col=0;col<4;col++){
   const x=col*64+8,y=row*64+7,lit=random()>.62;c.fillStyle='#253542';c.fillRect(x-2,y-2,49,49);
   const gradient=c.createLinearGradient(x,y,x+45,y+45);gradient.addColorStop(0,lit?'#f6dfab':'#aac2cd');gradient.addColorStop(1,lit?'#af9878':'#40546b');c.fillStyle=gradient;c.fillRect(x,y,45,45);
   c.fillStyle='rgba(225,240,241,.25)';c.fillRect(x,y,45,3);c.fillStyle=base;c.fillRect(x+22,y,2,45);c.fillRect(x,y+23,45,2);
  }
 }));
 const roof=mat(0x56636e),trim=mat(0xc2c5b9);
 for(let i=0;i<CITY_BUILDINGS.length;i++){
  const b=CITY_BUILDINGS[i],map=facadeMaps[i%4].clone();textures.add(map);map.wrapS=map.wrapT=THREE.RepeatWrapping;map.repeat.set(b.w/12,b.h/12);
  const wall=mat(0xffffff,{map,roughness:.45,metalness:.2});
  box(b.w+1.6,.18,b.d+1.6,pavement,b.x,-.01,b.z);
  box(b.w,b.h,b.d,[wall,wall,roof,roof,wall,wall],b.x,b.h/2,b.z,scene,.45);
  if(i%3!==0)box(b.w*.75,2.8,b.d*.72,trim,b.x,b.h+1.4,b.z,scene,.45);
  box(3,1.2,3,roof,b.x+4,b.h+3.3,b.z,scene,.18);
  box(3.2,3,.18,glass,b.x,.95,b.z+b.d/2+.1,scene,.08);
  box(5,.16,2.2,i%2?cyan:trim,b.x,3,b.z+b.d/2+1,scene,.06);
 }
 // Road paint uses a single instanced mesh, avoiding hundreds of draw calls.
 const markerGeometry=geo(new THREE.BoxGeometry(.16,.025,3.8)),markerMaterial=mat(0xe7d9ac),markerPositions=[];
 for(const lane of [-48,0,48,96])for(let p=-90;p<=90;p+=12)markerPositions.push({x:lane,z:p,angle:0});
 for(const lane of [-48,0,48])for(let p=-90;p<=99;p+=12)markerPositions.push({x:p,z:lane,angle:Math.PI/2});
 const markers=new THREE.InstancedMesh(markerGeometry,markerMaterial,markerPositions.length);const matrix=new THREE.Matrix4();markerPositions.forEach((p,i)=>{matrix.makeRotationY(p.angle);matrix.setPosition(p.x,.015,p.z);markers.setMatrixAt(i,matrix);});scene.add(markers);

 // Curved trunks and tapered, arching palm fronds.
 const trunkGeo=geo(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(0,0,0),new THREE.Vector3(.1,2,0),new THREE.Vector3(.45,4,0),new THREE.Vector3(.8,6,0)]),10,.24,9,false));
 const canopyGeo=geo(palmCanopyGeometry()),palms=[];
 for(let z=-84;z<=84;z+=24){mesh(trunkGeo,trunkMaterial,125,0,z);const canopy=mesh(canopyGeo,leafMaterial,125.8,6,z);canopy.rotation.y=z*.2;palms.push(canopy);sphere(.4,green,125.8,5.9,z);}
 for(const x of [-48,48,96])for(const z of [-42,42]){
  cylinder(.09,.13,5,chrome,x+7,2.5,z);const arm=cylinder(.08,.08,1.7,chrome,x+6.2,4.9,z);arm.rotation.z=Math.PI/2;
  sphere(.4,gold,x+5.4,4.85,z,scene,[1,.25,.65]);
 }
 // Curved, locally shaded ocean. No video, textures or services are fetched.
 const waterUniforms={time:{value:0},horizon:{value:new THREE.Color('#a9cbd7')}};
 const waterMaterial=new THREE.ShaderMaterial({uniforms:waterUniforms,vertexShader:`uniform float time;varying vec3 world;void main(){vec3 p=position;p.y+=sin(p.x*.38+time)*.07+sin(p.z*.3+time*1.2)*.06;vec4 w=modelMatrix*vec4(p,1.);world=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}`,fragmentShader:`uniform float time;uniform vec3 horizon;varying vec3 world;void main(){float ripple=sin(world.z*1.1+world.x*.8+time*1.4)*sin(world.x*.35-time*.6);float shallow=exp(-max(0.,world.x-137.)*.08);vec3 color=mix(vec3(.035,.20,.32),vec3(.12,.56,.59),shallow);color+=ripple*.018;float foam=1.-smoothstep(.15,.85,abs(world.x-(137.+sin(world.z*.25+time)*.5)));color=mix(color,vec3(.78,.91,.85),foam*.65);vec3 view=normalize(cameraPosition-world);float sheen=pow(1.-abs(view.y),5.);color=mix(color,horizon,sheen*.5);float fog=smoothstep(100.,260.,distance(cameraPosition,world));gl_FragColor=vec4(mix(color,horizon,fog),1.);#include <tonemapping_fragment>\n#include <colorspace_fragment>}`.replace(';#include',';\n#include'),side:THREE.DoubleSide});materials.add(waterMaterial);
 const oceanGeo=geo(new THREE.PlaneGeometry(170,300,64,64));oceanGeo.rotateX(-Math.PI/2);mesh(oceanGeo,waterMaterial,220,-.09,0,scene,false);

 function label(text,color,x,y,z){const t=texture(c=>{c.fillStyle='#172c3c';c.beginPath();c.roundRect(8,8,240,240,45);c.fill();c.fillStyle=color;c.font='bold 155px sans-serif';c.textAlign='center';c.textBaseline='middle';c.fillText(text,128,142);});const m=new THREE.SpriteMaterial({map:t,depthWrite:false});materials.add(m);const sprite=new THREE.Sprite(m);sprite.position.set(x,y,z);sprite.scale.set(2.3,2.3,1);scene.add(sprite);}
 for(const s of CITY_SERVICES){const m=s.id==='home'?purple:s.id==='bank'?green:gold;box(1.4,2.3,.8,m,s.x+3,1.15,s.z+3,scene,.2);box(.9,.8,.06,glass,s.x+3,1.65,s.z+3.43,scene,.05);label(s.id==='home'?'H':s.id==='bank'?'$':'F',s.color,s.x,4.4,s.z);}
 box(7,3,7,purple,-55,1.5,1,scene,.35);box(7.6,.3,7.6,trim,-55,3.1,1,scene,.1);box(1.3,2,.1,dark,-55,1,4.55,scene,.05);

 // A proportioned, smooth silhouette rather than a stack of cubes.
 function makeCar(bodyMaterial,police=false){
  const group=new THREE.Group();
  box(2.25,.62,4.25,bodyMaterial,0,.72,0,group,.26);box(2.05,.35,1.25,bodyMaterial,0,1.02,-1.25,group,.17);
  const cabin=box(1.8,.78,2.05,glass,0,1.27,.25,group,.27);cabin.scale.z=1.02;
  box(1.86,.09,1.65,bodyMaterial,0,1.68,.3,group,.04);
  box(2.05,.13,.18,chrome,0,.55,-2.1,group,.04);box(2.05,.13,.18,dark,0,.55,2.1,group,.04);
  for(const x of [-.7,.7]){sphere(.22,gold,x,.85,-2.07,group,[1,.46,.25]);sphere(.22,pink,x,.84,2.08,group,[1,.4,.25]);}
  const wheels=[];
  for(const x of [-1.08,1.08])for(const z of [-1.3,1.3]){const tire=cylinder(.43,.43,.3,rubber,x,.46,z,group);tire.rotation.z=Math.PI/2;const rim=cylinder(.25,.25,.32,chrome,x,.46,z,group);rim.rotation.z=Math.PI/2;wheels.push(tire,rim);}
  if(police){box(1.05,.12,.38,dark,0,1.82,.2,group,.05);sphere(.23,pink,-.31,1.96,.2,group,[1,.5,.7]);sphere(.23,cyan,.31,1.96,.2,group,[1,.5,.7]);}
  group.userData.wheels=wheels;return group;
 }
 const car=makeCar(blue);scene.add(car);const patrolMeshes=[makeCar(trim,true),makeCar(trim,true)];patrolMeshes.forEach(o=>scene.add(o));
 const partner=new THREE.Group();scene.add(partner);
 mesh(geo(new THREE.CapsuleGeometry(.28,.5,5,12)),purple,0,1.05,0,partner);
 sphere(.22,mat(0xcda58b),0,1.67,0,partner);
 for(const side of [-1,1]){const arm=cylinder(.09,.11,.65,purple,side*.35,1.03,0,partner);arm.rotation.z=side*.13;cylinder(.11,.13,.65,dark,side*.15,.38,0,partner);box(.24,.14,.4,rubber,side*.15,.08,-.08,partner,.06);}
 const drones=new Map(),rotors=[];
 for(let i=0;i<6;i++){const group=new THREE.Group();scene.add(group);sphere(.65,dark,0,0,0,group,[1,.45,1]);sphere(.17,pink,0,-.08,-.62,group);
  for(const x of [-1,1])for(const z of [-1,1]){const arm=cylinder(.055,.055,1.4,chrome,x*.45,0,z*.45,group);arm.rotation.z=Math.PI/2;arm.rotation.y=-Math.sign(x*z)*Math.PI/4;const rotor=cylinder(.44,.44,.04,dark,x*.9,.08,z*.9,group);const blade=box(.8,.025,.08,chrome,x*.9,.14,z*.9,group,.01);rotors.push(blade);}
  drones.set(i,group);
 }
 const ringGeo=geo(new THREE.TorusGeometry(2.1,.1,8,40)),target=mesh(ringGeo,cyan,0,.3,0,scene,false);target.rotation.x=Math.PI/2;
 const core=mesh(geo(new THREE.IcosahedronGeometry(.6,1)),cyan,0,1,0,scene,false);
 // Subtle energy beacon stays translucent rather than an opaque giant pole.
 const beaconMat=new THREE.MeshBasicMaterial({color:0x6ee8d2,transparent:true,opacity:.12,depthWrite:false});materials.add(beaconMat);const beacon=mesh(geo(new THREE.CylinderGeometry(.3,1.2,9,24,1,true)),beaconMat,0,4.5,0,scene,false);
 for(const s of CITY_STOPS){cylinder(.08,.1,3,chrome,s.x+6,1.5,s.z);sphere(.25,cyan,s.x+6,3,s.z);}
 const gun=new THREE.Group();camera.add(gun);scene.add(camera);gun.position.set(.26,-.24,-.5);
 box(.11,.14,.4,dark,0,0,0,gun,.045);const barrel=cylinder(.035,.045,.35,chrome,0,.01,-.22,gun);barrel.rotation.x=Math.PI/2;box(.075,.16,.1,blue,0,-.1,.08,gun,.025);sphere(.04,cyan,0,.01,-.4,gun);
 const beamGeo=geo(new THREE.BufferGeometry()),beamMat=new THREE.LineBasicMaterial({color:0xaaffec});materials.add(beamMat);const beams=new THREE.LineSegments(beamGeo,beamMat);beams.frustumCulled=false;scene.add(beams);
 const positions=new Float32Array(64*6);beamGeo.setAttribute('position',new THREE.BufferAttribute(positions,3));beamGeo.setDrawRange(0,0);
 const skyUniforms={zenith:{value:new THREE.Color('#5a96b5')},horizon:{value:new THREE.Color('#ced7cf')},daylight:{value:1}};
 const skyMaterial=new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,uniforms:skyUniforms,vertexShader:'varying vec3 direction;void main(){direction=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:`uniform vec3 zenith;uniform vec3 horizon;uniform float daylight;varying vec3 direction;void main(){vec3 d=normalize(direction);float h=smoothstep(-.08,.8,d.y);vec3 color=mix(horizon,zenith,h);float sun=pow(max(0.,dot(d,normalize(vec3(-.5,.7,.3)))),160.);color+=vec3(1.,.72,.4)*sun*daylight;gl_FragColor=vec4(color,1.);
#include <tonemapping_fragment>
#include <colorspace_fragment>
}`});materials.add(skyMaterial);
 const sky=mesh(geo(new THREE.SphereGeometry(350,32,16)),skyMaterial,0,0,0,scene,false);sky.receiveShadow=false;sky.renderOrder=-100;
 let settings=cityGraphicsSettings('balanced',win.devicePixelRatio),width=0,height=0,disposed=false;
 function setQuality(quality){
  settings=cityGraphicsSettings(quality,win.devicePixelRatio);renderer.setPixelRatio(settings.pixelRatio);renderer.shadowMap.enabled=settings.shadows;sun.shadow.mapSize.set(settings.shadowSize,settings.shadowSize);
  if(sun.shadow.map){sun.shadow.map.dispose();sun.shadow.map=null;}renderer.shadowMap.needsUpdate=true;width=0;
 }
 setQuality('balanced');
 const daySky=new THREE.Color(0xa9cbd7),nightSky=new THREE.Color(0x172b48);
 function draw(g){if(disposed)return;const p=g.player,goal=cityObjective(g);car.position.set(g.car.x,0,g.car.z);car.rotation.y=g.car.yaw;
  for(const wheel of car.userData.wheels)wheel.rotation.x=g.time*g.car.speed*.6;
  const other=g.characters[g.activeCharacter==='mina'?'theo':'mina'];partner.position.set(other.x,0,other.z);partner.rotation.y=other.yaw;
  for(let i=0;i<patrolMeshes.length;i++){const o=patrolMeshes[i],patrol=g.patrols[i];o.visible=!!patrol;if(patrol){o.position.set(patrol.x,0,patrol.z);o.rotation.y=Math.atan2(p.x-patrol.x,p.z-patrol.z);}}
  const daylight=(Math.sin(g.time/90)+1)/2;sun.intensity=.9+daylight*2.2;ambient.intensity=1.8+daylight*.9;scene.background.copy(nightSky).lerp(daySky,daylight);scene.fog.color.copy(scene.background);waterUniforms.horizon.value.copy(scene.background);skyUniforms.horizon.value.copy(scene.background).lerp(new THREE.Color('#e5c9a8'),daylight*.2);skyUniforms.zenith.value.copy(nightSky).lerp(new THREE.Color('#5a96b5'),daylight);skyUniforms.daylight.value=daylight;
  sun.position.set(p.x-35,65,p.z+25);sun.target.position.set(p.x,0,p.z);waterUniforms.time.value=settings.waterMotion?g.time:0;
  for(let i=0;i<palms.length;i++)palms[i].rotation.z=settings.foliageMotion?Math.sin(g.time*.7+i)*.035:0;
  if(g.driving){const yaw=g.car.yaw;camera.position.set(p.x+Math.sin(yaw)*8.5,4.4,p.z+Math.cos(yaw)*8.5);camera.lookAt(p.x,1.35,p.z);gun.visible=false;}
  else{camera.position.set(p.x,1.8,p.z);camera.rotation.order='YXZ';camera.rotation.set(p.pitch,p.yaw,0);gun.visible=true;gun.position.z=g.cooldown>.1?-.44:-.5;}
  sky.position.copy(camera.position);target.position.set(goal.x,.22,goal.z);target.material=g.carrying?gold:cyan;core.material=target.material;core.position.set(goal.x,1.15+Math.sin(g.time*2)*.2,goal.z);core.rotation.y=g.time*.7;beacon.position.set(goal.x,4.5,goal.z);beaconMat.color.copy(target.material.color);
  for(const [id,o]of drones){const e=g.enemies.find(item=>item.id===id);o.visible=!!e;if(e){o.position.set(e.x,1.8+Math.sin(g.time*4+id)*.15,e.z);o.rotation.y=Math.atan2(p.x-e.x,p.z-e.z);}}
  for(const rotor of rotors)rotor.rotation.y=g.time*25;
  let count=0;for(const effect of g.effects.slice(0,64)){positions.set([effect.x,1.7,effect.z,effect.tx,1.7,effect.tz],count*6);count++;}beamGeo.attributes.position.needsUpdate=true;beamGeo.setDrawRange(0,count*2);
  const rect=canvas.getBoundingClientRect(),w=Math.max(1,Math.floor(rect.width||960)),h=Math.max(1,Math.floor(rect.height||540));if(width!==w||height!==h){width=w;height=h;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}
  renderer.render(scene,camera);
 }
 return {draw,setQuality,destroy(){if(disposed)return;disposed=true;for(const t of textures)t.dispose();for(const g of geometries)g.dispose();for(const m of materials)m.dispose();sun.shadow.dispose();renderer.dispose();renderer.forceContextLoss();}};
}
