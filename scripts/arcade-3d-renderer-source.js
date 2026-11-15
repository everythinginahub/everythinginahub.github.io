import * as THREE from 'three';

const BLOCK_PALETTES = {
  grass: {top:[[74,156,82],[92,180,91],[116,194,103],[64,139,75],[139,198,105]],side:[[68,139,73],[93,161,80],[112,176,85],[128,89,54],[147,103,61],[115,76,49]]},
  dirt: {all:[[133,92,58],[151,103,64],[168,117,70],[116,77,51],[183,129,78]]},
  stone: {all:[[85,103,119],[103,121,137],[120,136,148],[73,91,108],[142,153,158]]},
  bedrock: {all:[[35,43,58],[49,58,74],[57,65,78],[29,36,50]]},
  crystal: {all:[[35,67,79],[39,87,95],[56,119,119],[95,239,205],[44,138,137]]},
  wool: {all:[[109,127,203],[125,145,220],[143,157,232],[95,104,180]]},
  wood: {all:[[91,58,36],[119,76,45],[143,94,55],[164,111,66],[76,49,34]]},
  leaves: {all:[[45,111,70],[55,136,75],[71,155,83],[87,172,91],[40,96,64]]},
  berry: {all:[[56,112,67],[74,143,72],[116,52,96],[188,61,103],[226,94,116]]},
  copper: {all:[[75,91,101],[99,111,116],[138,92,62],[185,117,66],[102,127,131]]}
};
const FLOWER_COLOURS = [0xffd16d,0xff8bb6,0x9bc7ff,0xd0a2ff];
const LEAF_COLOURS = ['#357b4e','#438e54','#559c5a','#2e7047'];
const materialCache = new Map();
const geometryCache = new Map();
const textureCache = new Map();
let liveViewports = 0;
const clamp = (value,min,max)=>Math.max(min,Math.min(max,value));
const colorMaterial = (colour,options={})=>{
  const key=`${colour}|${options.roughness ?? .82}|${options.metalness ?? .02}|${options.emissive ?? ''}|${options.emissiveIntensity ?? 0}|${options.transparent ?? false}|${options.opacity ?? 1}`;
  if(!materialCache.has(key))materialCache.set(key,new THREE.MeshStandardMaterial({color:colour,roughness:options.roughness ?? .82,metalness:options.metalness ?? .02,emissive:options.emissive ?? 0,emissiveIntensity:options.emissiveIntensity ?? 0,transparent:options.transparent ?? false,opacity:options.opacity ?? 1,depthWrite:options.depthWrite}));
  return materialCache.get(key);
};
const geometry=(key,create)=>{if(!geometryCache.has(key))geometryCache.set(key,create());return geometryCache.get(key);};
function hashRandom(seed){let state=(seed>>>0)||1;return()=>{state=(state+0x6d2b79f5)>>>0;let value=state;value=Math.imul(value^value>>>15,value|1);value^=value+Math.imul(value^value>>>7,value|61);return((value^value>>>14)>>>0)/4294967296;};}
function pixelTexture(kind,face){
  const key=`${kind}:${face}`;
  if(textureCache.has(key))return textureCache.get(key);
  const size=16,data=new Uint8Array(size*size*4),random=hashRandom([...key].reduce((sum,char)=>sum+char.charCodeAt(0),19));
  const palettes=BLOCK_PALETTES[kind] || BLOCK_PALETTES.stone;
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    let palette=palettes.all || (kind==='grass'&&face!==2&&face!==3?palettes.side:palettes.top);
    let shade=palette[Math.floor(random()*palette.length)];
    if(kind==='grass'&&face===3)shade=[101,72,48];
    if(kind==='stone'&&((x*3+y*7)%19===0))shade=[166,174,174];
    if(kind==='wood'&&(x%5===0||x%7===0))shade=[76,48,31];
    if(kind==='crystal'&&((x+y*2)%11<2||x===y))shade=[132,255,225];
    if(kind==='copper'&&((x*3+y*5)%13<3))shade=[192,121,67];
    if(kind==='berry'&&((x*5+y*3)%17<4))shade=[225,75+Math.floor(random()*35),116];
    let alpha=255;
    if(kind==='leaves'&&random()<.11)alpha=0;
    const offset=(y*size+x)*4;
    data[offset]=shade[0];data[offset+1]=shade[1];data[offset+2]=shade[2];data[offset+3]=alpha;
  }
  const texture=new THREE.DataTexture(data,size,size,THREE.RGBAFormat);
  texture.colorSpace=THREE.SRGBColorSpace;texture.magFilter=THREE.NearestFilter;texture.minFilter=THREE.NearestFilter;
  texture.generateMipmaps=false;texture.needsUpdate=true;textureCache.set(key,texture);return texture;
}
function blockMaterials(kind){
  return Array.from({length:6},(_,face)=>{
    const key=`block:${kind}:${face}`;
    if(!materialCache.has(key)){
      const emissive=kind==='crystal'?'#147f7b':kind==='berry'?'#321321':0;
      materialCache.set(key,new THREE.MeshStandardMaterial({map:pixelTexture(kind,face),color:'#ffffff',roughness:kind==='crystal'?.45:.9,metalness:kind==='copper'?.16:.01,emissive,emissiveIntensity:kind==='crystal'?.3:.08,alphaTest:kind==='leaves'?.28:0}));
    }
    return materialCache.get(key);
  });
}
function createAvatar(local,mode){
  const group=new THREE.Group();
  const shirt=colorMaterial(mode==='obby'?(local?'#5b79e4':'#ee8b74'):(local?'#3f9480':'#e39759'));
  const pants=colorMaterial(local?'#293a5a':'#44385f');
  const skin=colorMaterial('#f4bf91');
  const hair=colorMaterial('#263448');
  const boot=colorMaterial('#28334a');
  const torso=new THREE.Mesh(geometry('avatar-torso',()=>new THREE.BoxGeometry(.7,.78,.4)),shirt);
  torso.position.set(0,1.13,0);torso.castShadow=true;group.add(torso);
  const head=new THREE.Mesh(geometry('avatar-head',()=>new THREE.BoxGeometry(.48,.48,.46)),skin);
  head.position.set(0,1.78,0);head.castShadow=true;group.add(head);
  const cap=new THREE.Mesh(geometry('avatar-hair',()=>new THREE.BoxGeometry(.52,.15,.5)),hair);
  cap.position.set(0,2.08,0);cap.castShadow=true;group.add(cap);
  const eyeGeometry=geometry('avatar-eye',()=>new THREE.BoxGeometry(.055,.065,.025));
  for(const side of [-1,1]){
    const eye=new THREE.Mesh(eyeGeometry,hair);eye.position.set(side*.105,1.79,-.246);group.add(eye);
    const arm=new THREE.Mesh(geometry('avatar-arm',()=>new THREE.BoxGeometry(.2,.64,.25)),shirt);
    arm.position.set(side*.46,1.15,0);arm.castShadow=true;group.add(arm);
    const leg=new THREE.Mesh(geometry('avatar-leg',()=>new THREE.BoxGeometry(.24,.6,.28)),pants);
    leg.position.set(side*.18,.38,0);leg.castShadow=true;group.add(leg);
    const shoe=new THREE.Mesh(geometry('avatar-shoe',()=>new THREE.BoxGeometry(.26,.16,.34)),boot);
    shoe.position.set(side*.18,.08,-.025);shoe.castShadow=true;group.add(shoe);
  }
  const scarf=new THREE.Mesh(geometry('avatar-scarf',()=>new THREE.BoxGeometry(.72,.14,.43)),colorMaterial(local?'#f3ca68':'#79b8e8'));
  scarf.position.set(0,1.48,0);group.add(scarf);
  group.userData.mode=mode;return group;
}
function makeSkyMaterial(){
  return new THREE.ShaderMaterial({
    uniforms:{
      uTop:{value:new THREE.Color('#428dc4')},uHorizon:{value:new THREE.Color('#b9e9f5')},
      uNightTop:{value:new THREE.Color('#111a39')},uNightHorizon:{value:new THREE.Color('#39466d')},
      uSunDirection:{value:new THREE.Vector3(.2,.8,.5)},uDaylight:{value:.55}
    },
    vertexShader:`varying vec3 vDirection;
      void main(){
        vDirection=normalize(position);
        vec4 mvPosition=modelViewMatrix*vec4(position,1.0);
        gl_Position=projectionMatrix*mvPosition;
        gl_Position.z=gl_Position.w;
      }`,
    fragmentShader:`uniform vec3 uTop;uniform vec3 uHorizon;uniform vec3 uNightTop;uniform vec3 uNightHorizon;
      uniform vec3 uSunDirection;uniform float uDaylight;varying vec3 vDirection;
      void main(){
        float h=smoothstep(-.18,.78,vDirection.y);
        vec3 day=mix(uHorizon,uTop,pow(h,.62));
        float sunDot=max(dot(normalize(vDirection),normalize(uSunDirection)),0.0);
        float glow=pow(sunDot,20.0);float disc=pow(sunDot,520.0);
        day+=vec3(1.0,.55,.2)*glow*.24+vec3(1.0,.86,.58)*disc*.82;
        vec3 night=mix(uNightHorizon,uNightTop,pow(h,.7));
        gl_FragColor=vec4(mix(night,day,uDaylight),1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
    side:THREE.BackSide,depthWrite:false,depthTest:false,toneMapped:false
  });
}
function makeWater(){
  const material=new THREE.ShaderMaterial({
    uniforms:{uTime:{value:0}},
    vertexShader:`uniform float uTime;varying vec2 vUv;varying float vWave;
      void main(){
        vUv=uv;vec3 p=position;
        float wave=sin(p.x*.055+uTime*.42)*.11+cos(p.y*.073-uTime*.31)*.09+sin((p.x+p.y)*.028+uTime*.2)*.08;
        p.z+=wave;vWave=wave;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.0);
      }`,
    fragmentShader:`uniform float uTime;varying vec2 vUv;varying float vWave;
      void main(){
        float ripple=sin(vUv.x*170.0+uTime*.7)*cos(vUv.y*135.0-uTime*.42);
        float light=smoothstep(.68,1.0,ripple+vWave*1.6);
        vec3 deep=vec3(.035,.17,.28);vec3 teal=vec3(.08,.36,.48);
        vec3 color=mix(deep,teal,light*.45+.12);gl_FragColor=vec4(color,1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
    side:THREE.DoubleSide,toneMapped:false
  });
  const mesh=new THREE.Mesh(new THREE.PlaneGeometry(520,520,50,50),material);
  mesh.rotation.x=-Math.PI/2;mesh.position.y=-12;mesh.frustumCulled=false;mesh.receiveShadow=false;
  return {mesh,material};
}
function makeCloud(scene,index){
  const random=hashRandom(701+index*97),group=new THREE.Group();
  const shade=colorMaterial(index%3===0?'#f9ffff':'#eaf7ff',{roughness:1,transparent:true,opacity:.78,depthWrite:false});
  const puffGeometry=geometry('cloud-puff',()=>new THREE.IcosahedronGeometry(1,1));
  const puffs=4+Math.floor(random()*4);
  for(let puff=0;puff<puffs;puff++){
    const mesh=new THREE.Mesh(puffGeometry,shade);
    mesh.position.set((random()-.5)*8,(random()-.5)*1.2,(random()-.5)*4);
    mesh.scale.set(2+random()*2,.75+random()*.55,1.5+random()*1.2);
    group.add(mesh);
  }
  const angle=index*2.399;
  group.position.set(Math.cos(angle)*(34+random()*35),13+random()*19,Math.sin(angle)*(38+random()*38)-12);
  group.userData.drift=(random()-.5)*.05;group.userData.originX=group.position.x;group.userData.phase=random()*7;
  scene.add(group);return group;
}
function addFlower(group,decoration){
  const x=decoration.x,y=decoration.y,z=decoration.z;
  const stem=new THREE.Mesh(geometry('flora-stem',()=>new THREE.CylinderGeometry(.025,.035,.28,5)),colorMaterial('#4b9c61'));
  stem.position.set(x,y+.14,z);group.add(stem);
  const color=colorMaterial(FLOWER_COLOURS[decoration.tint%FLOWER_COLOURS.length],{roughness:.7});
  const petalGeometry=geometry('flora-petal',()=>new THREE.SphereGeometry(.075,6,5));
  for(let petal=0;petal<5;petal++){
    const angle=petal*Math.PI*2/5,mesh=new THREE.Mesh(petalGeometry,color);
    mesh.position.set(x+Math.cos(angle)*.105,y+.31,z+Math.sin(angle)*.105);mesh.scale.set(1,.72,1);group.add(mesh);
  }
  const center=new THREE.Mesh(geometry('flora-center',()=>new THREE.SphereGeometry(.055,6,5)),colorMaterial('#ffd77a'));
  center.position.set(x,y+.31,z);group.add(center);
}
function addGrass(group,decoration){
  const green=colorMaterial(LEAF_COLOURS[decoration.tint%LEAF_COLOURS.length]);
  const bladeGeometry=geometry('grass-blade',()=>new THREE.BoxGeometry(.045,.27,.055));
  for(let blade=0;blade<3;blade++){
    const mesh=new THREE.Mesh(bladeGeometry,green);mesh.position.set(decoration.x+(blade-1)*.09,decoration.y+.12,decoration.z+(blade%2)*.06);
    mesh.rotation.z=(blade-1)*.22;mesh.rotation.y=blade*.85;group.add(mesh);
  }
}
function addMushroom(group,decoration){
  const stalk=new THREE.Mesh(geometry('mushroom-stalk',()=>new THREE.CylinderGeometry(.07,.09,.16,6)),colorMaterial('#f3e4c8'));
  stalk.position.set(decoration.x,decoration.y+.08,decoration.z);group.add(stalk);
  const cap=new THREE.Mesh(geometry('mushroom-cap',()=>new THREE.SphereGeometry(.15,7,5)),colorMaterial(['#e77568','#d88b64','#bb6f87'][decoration.tint%3]));
  cap.scale.y=.55;cap.position.set(decoration.x,decoration.y+.17,decoration.z);group.add(cap);
}
function addTreeCanopy(group,block){
  const canopy=new THREE.Group();canopy.position.set(block.x+.5,block.maxY+1.15,block.z+.5);
  const geometryBlob=geometry('tree-crown',()=>new THREE.IcosahedronGeometry(1,1));
  const parts=[[0,.55,0,1.05],[ -.78,0,0,.8],[.78,0,.06,.82],[0,-.03,.72,.82],[.02,-.05,-.72,.8]];
  parts.forEach((part,index)=>{
    const leafIndex=((index+block.x+block.z+20)%LEAF_COLOURS.length+LEAF_COLOURS.length)%LEAF_COLOURS.length;
    const blob=new THREE.Mesh(geometryBlob,colorMaterial(LEAF_COLOURS[leafIndex]));
    blob.position.set(part[0],part[1],part[2]);blob.scale.set(part[3],part[3]*.8,part[3]);blob.castShadow=true;blob.receiveShadow=true;canopy.add(blob);
  });
  group.add(canopy);
}

export function createBlockboundViewport(canvas,{win=window,mode='survival'}={}){
  if(!canvas||typeof win.WebGL2RenderingContext==='undefined')return null;
  let renderer;
  try{renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});}catch{return null;}
  if(!renderer)return null;
  liveViewports++;
  renderer.setPixelRatio(Math.min(win.devicePixelRatio||1,1.5));renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.08;
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  const scene=new THREE.Scene();scene.background=new THREE.Color('#b9e9f5');scene.fog=new THREE.Fog('#b9e9f5',62,148);
  const camera=new THREE.PerspectiveCamera(70,16/9,.08,600);
  const blockGeometry=geometry('world-block',()=>new THREE.BoxGeometry(1,1,1));
  const blockGroup=new THREE.Group(),playerGroup=new THREE.Group(),objectGroup=new THREE.Group();scene.add(blockGroup,playerGroup,objectGroup);
  const skyGeometry=new THREE.SphereGeometry(450,32,20),skyMaterial=makeSkyMaterial();
  const sky=new THREE.Mesh(skyGeometry,skyMaterial);sky.frustumCulled=false;sky.renderOrder=-5;scene.add(sky);
  const skyStars=[];let starGeometry=null,starMaterial=null;
  {
    const random=hashRandom(92731),positions=[];
    for(let index=0;index<380;index++){
      const y=random()*2-1,angle=random()*Math.PI*2,radius=Math.sqrt(1-y*y);
      positions.push(Math.cos(angle)*radius*370,y*370,Math.sin(angle)*radius*370);
    }
    starGeometry=new THREE.BufferGeometry();starGeometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
    starMaterial=new THREE.PointsMaterial({color:'#dce9ff',size:1.35,sizeAttenuation:false,transparent:true,opacity:0,depthWrite:false});
    const points=new THREE.Points(starGeometry,starMaterial);points.frustumCulled=false;points.renderOrder=-4;scene.add(points);skyStars.push(points);
  }
  const water=makeWater();scene.add(water.mesh);
  const clouds=Array.from({length:9},(_,index)=>makeCloud(scene,index));
  const hemisphere=new THREE.HemisphereLight(0xe4f8ff,0x534844,1.5);scene.add(hemisphere);
  const sun=new THREE.DirectionalLight(0xffedcb,3.15);sun.position.set(-25,42,20);sun.castShadow=true;
  sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-38;sun.shadow.camera.right=38;sun.shadow.camera.top=38;sun.shadow.camera.bottom=-38;
  sun.shadow.camera.near=.5;sun.shadow.camera.far=150;sun.shadow.bias=-.00028;sun.shadow.normalBias=.025;sun.shadow.radius=4;scene.add(sun);scene.add(sun.target);
  const sunDirection=new THREE.Vector3(),fogDay=new THREE.Color('#b8e7f2'),fogNight=new THREE.Color('#2b3f5e');
  const sunDiscMaterial=new THREE.MeshBasicMaterial({color:'#fff0bd',toneMapped:false});
  const sunDisc=new THREE.Mesh(geometry('sun-disc',()=>new THREE.SphereGeometry(2.15,20,14)),sunDiscMaterial);scene.add(sunDisc);
  const moonMaterial=new THREE.MeshBasicMaterial({color:'#d9e6ff',toneMapped:false});
  const moon=new THREE.Mesh(geometry('moon-disc',()=>new THREE.SphereGeometry(1.35,16,12)),moonMaterial);scene.add(moon);
  const firstPerson=new THREE.Group();camera.add(firstPerson);scene.add(camera);
  const arm=new THREE.Mesh(geometry('first-person-arm',()=>new THREE.BoxGeometry(.22,.56,.25)),colorMaterial('#3d8e78'));
  arm.position.set(.02,-.1,.03);arm.rotation.z=-.14;firstPerson.add(arm);
  const hand=new THREE.Mesh(geometry('first-person-hand',()=>new THREE.BoxGeometry(.19,.17,.2)),colorMaterial('#e7ad7d'));
  hand.position.set(0,.16,-.05);firstPerson.add(hand);
  const handle=new THREE.Mesh(geometry('pickaxe-handle',()=>new THREE.CylinderGeometry(.035,.055,.65,7)),colorMaterial('#785039'));
  handle.position.set(-.1,.25,-.17);handle.rotation.z=-.46;firstPerson.add(handle);
  const pickHead=new THREE.Mesh(geometry('pickaxe-head',()=>new THREE.BoxGeometry(.46,.1,.12)),colorMaterial('#8cc9ce',{metalness:.55,roughness:.38}));
  pickHead.position.set(-.13,.49,-.2);pickHead.rotation.z=-.16;firstPerson.add(pickHead);
  const blockMeshes=new Map(),playerMeshes=new Map(),objectMeshes=new Map(),instancedBlocks=[];
  let activeGame=null,activeBlockGame=null,activeBlockRevision=-1,cameraYaw=0,cameraPitch=0,resizeObserver=null,destroyed=false;
  const resize=()=>{
    const bounds=canvas.getBoundingClientRect?.()||{width:960,height:540};
    const width=Math.max(1,Math.round(bounds.width||960)),height=Math.max(1,Math.round(bounds.height||width*9/16));
    renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix();
  };
  resize();
  if(typeof win.ResizeObserver==='function'){resizeObserver=new win.ResizeObserver(resize);resizeObserver.observe(canvas.parentElement||canvas);}
  else win.addEventListener('resize',resize);
  function syncBlocks(game){
    const revision=game.blockRevision ?? game.blocks.length;
    if(activeBlockGame===game&&activeBlockRevision===revision)return;
    for(const mesh of instancedBlocks)blockGroup.remove(mesh);
    instancedBlocks.length=0;blockMeshes.clear();
    const byKind=new Map();
    for(const block of game.blocks||[]){if(!byKind.has(block.kind))byKind.set(block.kind,[]);byKind.get(block.kind).push(block);}
    const dummy=new THREE.Object3D();
    for(const [kind,blocks] of byKind){
      if(!blocks.length)continue;
      const mesh=new THREE.InstancedMesh(blockGeometry,blockMaterials(kind),blocks.length);
      mesh.castShadow=true;mesh.receiveShadow=true;mesh.instanceMatrix.setUsage(THREE.StaticDrawUsage);
      const ids=[];
      blocks.forEach((block,index)=>{dummy.position.set(block.x+.5,block.y+.5,block.z+.5);dummy.rotation.set(0,0,0);dummy.scale.set(1,1,1);dummy.updateMatrix();mesh.setMatrixAt(index,dummy.matrix);ids.push(block.id);});
      mesh.userData.blockIds=ids;mesh.userData.kind=kind;mesh.computeBoundingSphere();blockGroup.add(mesh);instancedBlocks.push(mesh);
    }
    activeBlockGame=game;activeBlockRevision=revision;
  }
  function syncObjects(game){
    objectGroup.clear();objectMeshes.clear();
    const treeBases=new Map();
    for(const block of game.blocks||[])if(block.kind==='wood'&&block.y>0&&!block.owner){
      const key=`${block.x},${block.z}`,entry=treeBases.get(key)||{x:block.x,z:block.z,maxY:block.y};entry.maxY=Math.max(entry.maxY,block.y);treeBases.set(key,entry);
    }
    if(game.mode==='survival')for(const tree of treeBases.values())addTreeCanopy(objectGroup,tree);
    for(const decoration of game.decorations||[]){
      if(decoration.kind==='flower')addFlower(objectGroup,decoration);
      else if(decoration.kind==='grass')addGrass(objectGroup,decoration);
      else if(decoration.kind==='mushroom')addMushroom(objectGroup,decoration);
    }
    for(const [index,crystal] of (game.crystals||[]).entries()){
      const group=new THREE.Group();
      const glow=new THREE.Mesh(geometry('crystal-halo',()=>new THREE.TorusGeometry(.48,.035,7,24)),colorMaterial(game.mode==='obby'?'#ffe190':'#79ffe5',{emissive:game.mode==='obby'?'#d38a19':'#29bca7',emissiveIntensity:.6,roughness:.35}));
      glow.rotation.x=Math.PI/2;glow.position.y=.2;group.add(glow);
      const gem=new THREE.Mesh(geometry('crystal-gem',()=>new THREE.OctahedronGeometry(.35,0)),colorMaterial(game.mode==='obby'?'#ffe18a':'#8af7df',{emissive:game.mode==='obby'?'#d88a16':'#20bba2',emissiveIntensity:.72,metalness:.12,roughness:.25}));
      gem.position.y=.55;gem.castShadow=true;group.add(gem);
      group.position.set(crystal.x,crystal.y,crystal.z);group.userData.spin=true;group.userData.baseY=crystal.y;
      const id=crystal.id||`star-${index}`;group.userData.starId=id;objectGroup.add(group);objectMeshes.set(`star:${id}`,group);
    }
    if(game.mode==='obby'){
      const portalMaterial=colorMaterial('#8cf6dd',{emissive:'#30b899',emissiveIntensity:.8,metalness:.16,roughness:.3});
      const portal=new THREE.Mesh(geometry('obby-portal',()=>new THREE.TorusGeometry(1.2,.12,12,40)),portalMaterial);
      portal.position.set(.5,2.2,-30.5);portal.castShadow=true;objectGroup.add(portal);objectMeshes.set('obby-finish',portal);
      [-3.5,-8.5,-13.5,-18.5,-23.5].forEach((z,index)=>{
        const pole=new THREE.Mesh(geometry('checkpoint-pole',()=>new THREE.CylinderGeometry(.055,.08,2.8,8)),colorMaterial(index===game.checkpoint?'#ffe08b':'#b8c4ee'));
        pole.position.set(2.9,1.4,z);pole.castShadow=true;objectGroup.add(pole);
        const flag=new THREE.Mesh(geometry('checkpoint-flag',()=>new THREE.BoxGeometry(.68,.42,.08)),colorMaterial(index<=game.checkpoint?'#ffdb78':'#a9b4db'));
        flag.position.set(3.23,2.36,z);objectGroup.add(flag);
      });
    }
  }
  function syncPlayers(game){
    const players=Object.values(game.players||{}),ids=new Set(players.map(player=>player.id));
    for(const [id,avatar] of playerMeshes)if(!ids.has(id)){playerGroup.remove(avatar);playerMeshes.delete(id);}
    for(const player of players){
      let avatar=playerMeshes.get(player.id);
      if(avatar&&avatar.userData.mode!==game.mode){playerGroup.remove(avatar);playerMeshes.delete(player.id);avatar=null;}
      if(!avatar){avatar=createAvatar(player.id===game.localId,game.mode);playerGroup.add(avatar);playerMeshes.set(player.id,avatar);}
      avatar.visible=player.alive!==false&&(game.mode==='obby'||player.id!==game.localId);
      avatar.position.set(player.x,player.y,player.z);avatar.rotation.y=player.yaw||0;
      avatar.scale.setScalar(player.health<35 ? .94 : 1);
    }
  }
  function setGame(game){
    activeGame=game;syncBlocks(game);syncPlayers(game);syncObjects(game);
    const obby=game.mode==='obby';firstPerson.visible=!obby;water.mesh.visible=!obby;clouds.forEach(cloud=>cloud.visible=!obby);skyStars.forEach(points=>points.visible=!obby);
  }
  function updateEnvironment(game){
    const obby=game.mode==='obby';
    const phase=obby ? .26 : (game.time%240)/240;
    const sunHeight=Math.sin((phase+.05)*Math.PI*2);
    const daylight=obby ? .88 : clamp(.24+Math.max(0,sunHeight)*.76,.12,1);
    const skyUniforms=sky.material.uniforms;
    skyUniforms.uDaylight.value=daylight;
    if(obby){
      skyUniforms.uTop.value.set('#6879be');skyUniforms.uHorizon.value.set('#ffc1c4');skyUniforms.uNightTop.value.set('#272d61');skyUniforms.uNightHorizon.value.set('#756b9e');
      scene.fog.color.set('#9c9dd1');scene.fog.near=34;scene.fog.far=92;
    }else{
      skyUniforms.uTop.value.set('#3e91c4');skyUniforms.uHorizon.value.set('#b9e9f5');skyUniforms.uNightTop.value.set('#101832');skyUniforms.uNightHorizon.value.set('#293e63');
      scene.fog.color.copy(fogNight).lerp(fogDay,daylight);scene.fog.near=48;scene.fog.far=132;
    }
    const angle=phase*Math.PI*2-.9;
    sunDirection.set(Math.cos(angle),Math.max(-.35,sunHeight),Math.sin(angle)).normalize();
    skyUniforms.uSunDirection.value.copy(sunDirection);
    hemisphere.intensity=obby?1.7:.42+1.65*daylight;
    sun.intensity=obby?2.7:.22+3.05*daylight;
    sun.color.set(obby?'#fff0d8':daylight<.5?'#ffd0a1':'#fff1d2');
    const focus=game.players?.[game.localId]||{x:0,z:0};
    sun.position.set(focus.x+sunDirection.x*62,focus.y+sunDirection.y*62+24,focus.z+sunDirection.z*62);
    sun.target.position.set(focus.x,0,focus.z);sun.target.updateMatrixWorld();
    sunDisc.visible=!obby&&daylight>.24;sunDisc.position.set(focus.x+sunDirection.x*155,focus.y+sunDirection.y*155+26,focus.z+sunDirection.z*155);
    moon.visible=!obby&&daylight<.4;moon.position.set(focus.x-sunDirection.x*150,focus.y-sunDirection.y*150+26,focus.z-sunDirection.z*150);
    skyStars[0].material.opacity=obby?0:clamp((.55-daylight)*1.5,0,.9);
    clouds.forEach(cloud=>{cloud.position.x=cloud.userData.originX+Math.sin(game.time*.035+cloud.userData.phase)*2;cloud.children.forEach(child=>{child.material.opacity=.35+.43*daylight;});});
    water.material.uniforms.uTime.value=game.time||0;
  }
  function draw(game=activeGame,yaw=cameraYaw,pitch=cameraPitch){
    if(!game)return;activeGame=game;cameraYaw=yaw;cameraPitch=pitch;
    syncBlocks(game);syncPlayers(game);
    for(const [key,group] of objectMeshes){
      if(key.startsWith('star:')){
        const starId=key.slice(5);const exists=(game.crystals||[]).some(crystal=>(crystal.id||'')===starId);
        group.visible=exists;
        if(exists&&group.userData.spin){group.rotation.y+=.025;group.position.y=group.userData.baseY+Math.sin(game.time*2.4+group.position.x)*.12;group.children[1].rotation.y-=.035;}
      }
      if(key==='obby-finish')group.rotation.z=Math.sin(game.time*1.5)*.05;
    }
    updateEnvironment(game);
    const player=game.players?.[game.localId];
    if(player){
      if(game.mode==='obby'){
        const horizontal=Math.cos(cameraPitch)*8.8;
        camera.position.set(player.x-Math.sin(cameraYaw)*horizontal,player.y+5.8,player.z+Math.cos(cameraYaw)*horizontal);
        camera.lookAt(player.x,player.y+1.05,player.z);
      }else{
        const eyeY=player.y+1.53,forward=Math.cos(cameraPitch);
        camera.position.set(player.x,eyeY,player.z);
        camera.lookAt(player.x+Math.sin(cameraYaw)*forward,eyeY-Math.sin(cameraPitch),player.z-Math.cos(cameraYaw)*forward);
      }
    }
    try{renderer.render(scene,camera);}catch{}
  }
  function pickBlock(){
    if(!activeGame)return null;
    raycaster.setFromCamera(new THREE.Vector2(0,0),camera);
    const hit=raycaster.intersectObjects(instancedBlocks,false).find(item=>item.distance<4.5);
    return hit?.object?.userData?.blockIds?.[hit.instanceId] || null;
  }
  const raycaster=new THREE.Raycaster();raycaster.far=4.5;
  function setCamera(yaw,pitch=cameraPitch){
    cameraYaw=yaw;cameraPitch=clamp(pitch,activeGame?.mode==='obby' ? .18 : -.9,activeGame?.mode==='obby' ? 1.08 : .9);
    if(activeGame)draw(activeGame,cameraYaw,cameraPitch);
  }
  function destroy(){
    if(destroyed)return;destroyed=true;
    resizeObserver?.disconnect();if(!resizeObserver)win.removeEventListener('resize',resize);
    renderer.dispose();
    skyGeometry.dispose();skyMaterial.dispose();starGeometry?.dispose();starMaterial?.dispose();
    water.mesh.geometry.dispose();water.material.dispose();sunDiscMaterial.dispose();moonMaterial.dispose();
    liveViewports=Math.max(0,liveViewports-1);
    if(liveViewports===0){
      for(const geometry of geometryCache.values())geometry.dispose();geometryCache.clear();
      for(const material of materialCache.values())material.dispose();materialCache.clear();
      for(const texture of textureCache.values())texture.dispose();textureCache.clear();
    }
  }
  return {renderer,scene,camera,draw,setGame,pickBlock,setCamera,destroy};
}
