import * as THREE from 'three';
import {CITY_BUILDINGS,CITY_STOPS,CITY_SERVICES,cityObjective} from '../public/neon-city-engine.js';
export function createCityRenderer(canvas,win=window){
 if(!win.WebGL2RenderingContext)return null;
 let renderer;try{renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'low-power'});}catch{return null;}
 renderer.setPixelRatio(Math.min(win.devicePixelRatio||1,1.5));renderer.setSize(960,540,false);
 const scene=new THREE.Scene();scene.background=new THREE.Color('#111d35');scene.fog=new THREE.Fog('#111d35',45,160);
 scene.add(new THREE.HemisphereLight(0x9edbff,0x303047,2.8));const sun=new THREE.DirectionalLight(0xb2cfff,2);sun.position.set(-40,60,20);scene.add(sun);
 const camera=new THREE.PerspectiveCamera(72,960/540,.08,220),geometries=[],materials=[];
 const mat=(color,emissive=0)=>{const m=new THREE.MeshStandardMaterial({color,emissive,roughness:.8});materials.push(m);return m;};
 const road=mat(0x253349),buildingMats=[mat(0x233b59),mat(0x30415b),mat(0x244d58),mat(0x373653)],cyan=mat(0x58ffee,0x16796c),pink=mat(0xff668e,0x8c2146),gold=mat(0xffd46b,0x705719),blue=mat(0x3e9bff,0x153d6c),dark=mat(0x101a29),glass=mat(0x9cddff,0x245577);
 function box(w,h,d,m,x=0,y=0,z=0,parent=scene){const geo=new THREE.BoxGeometry(w,h,d);geometries.push(geo);const mesh=new THREE.Mesh(geo,m);mesh.position.set(x,y,z);parent.add(mesh);return mesh;}
 box(250,.25,200,road,20,-.2,0);
 const sand=mat(0xe5c899),water=mat(0x287d99),leaf=mat(0x31795c),trunk=mat(0x816747),purple=mat(0xa48cff,0x463474),green=mat(0x77edaf,0x1d6948);
 box(34,.16,200,sand,120,-.02,0);box(85,.12,230,water,179,-.12,0);
 box(2,.3,200,dark,104,.05,0);
 for(let z=-84;z<=84;z+=24){box(.7,6,.7,trunk,125,3,z);for(let i=0;i<4;i++){const frond=box(5,.18,1.2,leaf,125,6,z);frond.rotation.y=i*Math.PI/2;frond.rotation.z=.22;}}
 for(let z=-88;z<=88;z+=8)box(.2,.04,3,gold,96,.03,z);
 function label(text,color,x,y,z){const c=win.document.createElement('canvas');c.width=128;c.height=128;const context=c.getContext('2d');context.fillStyle='#122339';context.fillRect(0,0,128,128);context.strokeStyle=color;context.lineWidth=8;context.strokeRect(4,4,120,120);context.fillStyle=color;context.font='bold 82px sans-serif';context.textAlign='center';context.textBaseline='middle';context.fillText(text,64,68);const texture=new THREE.CanvasTexture(c);const m=new THREE.SpriteMaterial({map:texture});materials.push(m);const sprite=new THREE.Sprite(m);sprite.position.set(x,y,z);sprite.scale.set(3,3,1);scene.add(sprite);return texture;}
 const labels=[];for(const service of CITY_SERVICES){const m=service.id==='home'?purple:service.id==='bank'?green:gold;box(2,2.4,1,m,service.x+3,1.2,service.z+3);labels.push(label(service.id==='home'?'H':service.id==='bank'?'$':'F',service.color,service.x,5,service.z));}
 box(7,3,7,purple,-55,1.5,1);box(8,.4,8,dark,-55,3.2,1);
 const partner=new THREE.Group();scene.add(partner);box(.7,1.2,.5,purple,0,.9,0,partner);box(.5,.5,.5,gold,0,1.75,0,partner);
 const patrolMeshes=[];for(let i=0;i<2;i++){const group=new THREE.Group();scene.add(group);box(1.7,1,2.8,glass,0,1.3,0,group);box(.6,.2,.4,pink,-.4,2,0,group);box(.6,.2,.4,blue,.4,2,0,group);patrolMeshes.push(group);}

 for(let i=0;i<CITY_BUILDINGS.length;i++){const b=CITY_BUILDINGS[i];box(b.w,b.h,b.d,buildingMats[i%4],b.x,b.h/2,b.z);box(b.w+2,.3,b.d+2,dark,b.x,0,b.z);
  for(let y=3;y<b.h;y+=4){box(b.w+.1,.55,b.d+.1,i%2?cyan:glass,b.x,y,b.z);}
  box(b.w+1,.3,b.d+1,i%2?pink:cyan,b.x,b.h,b.z);
 }
 for(const lane of [-48,0,48])for(let pos=-90;pos<=90;pos+=12){box(.18,.02,4,gold,lane,.02,pos);box(4,.02,.18,gold,pos,.02,lane);}
 for(const s of CITY_STOPS){box(.4,5,.4,dark,s.x+6,2.5,s.z);box(2,.4,2,cyan,s.x+6,5,s.z);}
 const car=new THREE.Group();scene.add(car);box(2.2,.8,4,blue,0,.8,0,car);box(1.9,.8,1.8,glass,0,1.5,.1,car);box(1.8,.2,.2,gold,0,.9,-2.05,car);
 for(const x of [-1.15,1.15])for(const z of [-1.2,1.2])box(.4,.8,.8,dark,x,.45,z,car);
 const droneGeo=new THREE.OctahedronGeometry(1.15);geometries.push(droneGeo);const drones=new Map();
 for(let i=0;i<6;i++){const g=new THREE.Group();const body=new THREE.Mesh(droneGeo,pink);g.add(body);box(3.4,.14,.18,dark,0,0,0,g);box(.18,.14,3.4,dark,0,0,0,g);scene.add(g);drones.set(i,g);}
 const ringGeo=new THREE.TorusGeometry(2.2,.18,8,32);geometries.push(ringGeo);const target=new THREE.Mesh(ringGeo,cyan);scene.add(target);target.rotation.x=Math.PI/2;
 const pillar=box(.35,12,.35,cyan,0,6,0);const gun=box(.18,.25,.65,blue,.35,-.28,-.65,camera);scene.add(camera);
 const beamGeo=new THREE.BufferGeometry();geometries.push(beamGeo);const beamMat=new THREE.LineBasicMaterial({color:0xaffff0});materials.push(beamMat);const beams=new THREE.LineSegments(beamGeo,beamMat);scene.add(beams);
 function draw(g){const p=g.player,goal=cityObjective(g);car.position.set(g.car.x,0,g.car.z);car.rotation.y=g.car.yaw;
  const other=g.characters[g.activeCharacter==='mina'?'theo':'mina'];partner.position.set(other.x,0,other.z);partner.rotation.y=other.yaw;
  for(let i=0;i<patrolMeshes.length;i++){const mesh=patrolMeshes[i],patrol=g.patrols[i];mesh.visible=!!patrol;if(patrol){mesh.position.set(patrol.x,0,patrol.z);mesh.rotation.y=Math.atan2(p.x-patrol.x,p.z-patrol.z);}}
  const daylight=(Math.sin(g.time/90)+1)/2;sun.intensity=.8+daylight*1.8;scene.background.setRGB(.06+daylight*.16,.1+daylight*.19,.2+daylight*.2);scene.fog.color.copy(scene.background);
  if(g.driving){const yaw=g.car.yaw;camera.position.set(p.x+Math.sin(yaw)*10,6,p.z+Math.cos(yaw)*10);camera.lookAt(p.x,1.8,p.z);gun.visible=false;}else{camera.position.set(p.x,1.8,p.z);camera.rotation.order='YXZ';camera.rotation.set(p.pitch,p.yaw,0);gun.visible=true;gun.position.z=g.cooldown>.1?-.52:-.65;}
  target.position.set(goal.x,1+Math.sin(g.time*3)*.4,goal.z);target.rotation.z=g.time;target.material=g.carrying?gold:cyan;pillar.position.set(goal.x,6,goal.z);pillar.material=target.material;
  for(const [id,mesh]of drones){const e=g.enemies.find(item=>item.id===id);mesh.visible=!!e;if(e){mesh.position.set(e.x,1.8+Math.sin(g.time*4+id)*.2,e.z);mesh.rotation.y=g.time*2;}}
  const positions=[];for(const effect of g.effects)positions.push(effect.x,1.7,effect.z,effect.tx,1.7,effect.tz);beamGeo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  const rect=canvas.getBoundingClientRect(),w=Math.max(1,rect.width||960),h=Math.max(1,rect.height||540);if(canvas.width!==Math.floor(w*renderer.getPixelRatio())||canvas.height!==Math.floor(h*renderer.getPixelRatio())){renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}
  renderer.render(scene,camera);
 }
 return {draw,destroy(){for(const texture of labels)texture.dispose();for(const geo of geometries)geo.dispose();for(const m of materials)m.dispose();renderer.dispose();renderer.forceContextLoss();}};
}
