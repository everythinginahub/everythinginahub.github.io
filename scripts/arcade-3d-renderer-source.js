import * as THREE from 'three';

const BLOCK_COLOURS = {
  grass: ['#75513b', '#684830', '#61c779', '#61402e', '#79533b', '#684830'],
  dirt: ['#9d6d48', '#795338', '#a97952', '#694831', '#936341', '#795338'],
  stone: ['#667585', '#566374', '#96a6b2', '#4e5c69', '#778593', '#586572'],
  crystal: ['#45546b', '#33435b', '#92f4dc', '#31445d', '#526681', '#31445d'],
  wool: ['#dce4f2', '#c4d4eb', '#ff8991', '#cf6678', '#f27480', '#cf6678'],
  wood: ['#815638', '#67432f', '#b48254', '#593a2b', '#9a6942', '#63422f']
};
const TEAM_COLOURS = {red: 0xff6573, blue: 0x69a8ff};
const material = (colour, roughness = .88) => new THREE.MeshStandardMaterial({color: colour, roughness, metalness: .02});

function createAvatar(team, local, mode) {
  const group = new THREE.Group();
  const teamColour = mode === 'bedwars' ? (TEAM_COLOURS[team] || 0xf1ba79) : local ? 0x45c9b7 : 0xf0b967;
  const shirt = material(teamColour);
  const pants = material(local ? 0x273c60 : 0x38385f);
  const skin = material(0xffd1a7);
  const hair = material(0x273047);
  const body = new THREE.Mesh(new THREE.BoxGeometry(.72, .82, .42), shirt);
  body.position.y = 1.13; body.castShadow = true; group.add(body);
  const head = new THREE.Mesh(new THREE.BoxGeometry(.5, .48, .48), skin);
  head.position.y = 1.82; head.castShadow = true; group.add(head);
  const cap = new THREE.Mesh(new THREE.BoxGeometry(.54, .15, .51), hair);
  cap.position.set(0, 2.09, .01); cap.castShadow = true; group.add(cap);
  for (const side of [-1, 1]) {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(.22, .68, .28), shirt);
    arm.position.set(side * .48, 1.16, 0); arm.castShadow = true; group.add(arm);
    const leg = new THREE.Mesh(new THREE.BoxGeometry(.25, .63, .3), pants);
    leg.position.set(side * .19, .36, 0); leg.castShadow = true; group.add(leg);
  }
  const halo = new THREE.Mesh(new THREE.TorusGeometry(.48, .045, 8, 32), material(teamColour, .45));
  halo.rotation.x = Math.PI / 2; halo.position.y = .06; halo.castShadow = false; group.add(halo);
  group.userData.team = team; group.userData.mode = mode;
  return group;
}

function blockMaterials(kind) {
  const swatches = BLOCK_COLOURS[kind] || BLOCK_COLOURS.stone;
  return swatches.map(colour => material(colour));
}

export function createBlockboundViewport(canvas, {win = window, mode = 'bedwars'} = {}) {
  if (!canvas || typeof win.WebGL2RenderingContext === 'undefined') return null;
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({canvas, antialias: true, alpha: false, powerPreference: 'high-performance'});
  } catch { return null; }
  if (!renderer) return null;
  renderer.setPixelRatio(Math.min(win.devicePixelRatio || 1, 1.6));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#a9dff4');
  scene.fog = new THREE.Fog('#b4e5f5', 34, 105);
  const camera = new THREE.PerspectiveCamera(64, 16 / 9, .1, 180);
  const hemisphere = new THREE.HemisphereLight(0xd9f5ff, 0x756a62, 2.35);
  scene.add(hemisphere);
  const sun = new THREE.DirectionalLight(0xfff1cf, 3.2);
  sun.position.set(-14, 28, 13); sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = -36; sun.shadow.camera.right = 36;
  sun.shadow.camera.top = 36; sun.shadow.camera.bottom = -36;
  scene.add(sun);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(220, 220), material('#3b546c'));
  ground.rotation.x = -Math.PI / 2; ground.position.y = -8; ground.receiveShadow = true; scene.add(ground);
  const blockGeometry = new THREE.BoxGeometry(1, 1, 1);
  const blockGroup = new THREE.Group(), playerGroup = new THREE.Group(), objectGroup = new THREE.Group();
  scene.add(blockGroup, playerGroup, objectGroup);
  const blockMeshes = new Map(), playerMeshes = new Map(), objectMeshes = new Map();
  const sharedMaterials = new Map();
  const raycaster = new THREE.Raycaster();
  const screenCentre = new THREE.Vector2(0, 0);
  let activeGame = null, cameraYaw = 0, cameraPitch = .42;
  let resizeObserver = null;
  const resize = () => {
    const bounds = canvas.getBoundingClientRect?.() || {width: 960, height: 540};
    const width = Math.max(1, Math.round(bounds.width || 960));
    const height = Math.max(1, Math.round(bounds.height || width * 9 / 16));
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  };
  resize();
  if (typeof win.ResizeObserver === 'function') {
    resizeObserver = new win.ResizeObserver(resize);
    resizeObserver.observe(canvas.parentElement || canvas);
  } else win.addEventListener('resize', resize);

  function syncBlocks(game) {
    const byId = new Map(game.blocks.map(block => [block.id, block]));
    for (const [id, mesh] of blockMeshes) {
      const block = byId.get(id);
      if (block && mesh.userData.kind === block.kind) continue;
      blockGroup.remove(mesh); blockMeshes.delete(id);
    }
    for (const block of game.blocks) {
      if (blockMeshes.has(block.id)) continue;
      if (!sharedMaterials.has(block.kind)) sharedMaterials.set(block.kind, blockMaterials(block.kind));
      const mesh = new THREE.Mesh(blockGeometry, sharedMaterials.get(block.kind));
      mesh.position.set(block.x + .5, block.y + .5, block.z + .5);
      mesh.castShadow = true; mesh.receiveShadow = true;
      mesh.userData.blockId = block.id; mesh.userData.kind = block.kind;
      blockGroup.add(mesh); blockMeshes.set(block.id, mesh);
    }
  }
  function syncObjects(game) {
    for (const child of [...objectGroup.children]) child.traverse(item => {
      item.geometry?.dispose();
      if (Array.isArray(item.material)) item.material.forEach(entry => entry.dispose());
      else item.material?.dispose();
    });
    objectGroup.clear(); objectMeshes.clear();
    const wood = material('#865c3d'), redPillow = material('#ffe6d2');
    for (const bed of Object.values(game.beds || {})) {
      const bedGroup = new THREE.Group();
      const base = new THREE.Mesh(new THREE.BoxGeometry(1.25, .34, 2.15), wood);
      base.position.y = .18; base.castShadow = true; bedGroup.add(base);
      const cover = new THREE.Mesh(new THREE.BoxGeometry(1.15, .22, 1.48), material(TEAM_COLOURS[bed.team] || 0xffffff));
      cover.position.set(0, .46, .25); cover.castShadow = true; bedGroup.add(cover);
      const pillow = new THREE.Mesh(new THREE.BoxGeometry(.56, .24, .45), redPillow);
      pillow.position.set(0, .48, -.65); bedGroup.add(pillow);
      bedGroup.position.set(bed.x, bed.y, bed.z);
      bedGroup.visible = bed.alive;
      bedGroup.userData.team = bed.team;
      objectGroup.add(bedGroup); objectMeshes.set(`bed:${bed.team}`, bedGroup);
    }
    for (const generator of game.generators || []) {
      const group = new THREE.Group();
      const base = new THREE.Mesh(new THREE.CylinderGeometry(.58, .68, .28, 8), material('#527789'));
      base.position.y = .14; base.receiveShadow = true; group.add(base);
      const gem = new THREE.Mesh(new THREE.OctahedronGeometry(.52), material(generator.kind === 'emerald' ? '#55e0b4' : '#f5ce73', .38));
      gem.position.y = .9; gem.castShadow = true; group.add(gem);
      group.position.set(generator.x, .98, generator.z); group.userData.spin = true;
      objectGroup.add(group); objectMeshes.set(`generator:${generator.id}`, group);
    }
    for (const [index, star] of (game.crystals || []).entries()) {
      const gem = new THREE.Mesh(new THREE.OctahedronGeometry(.38), material(game.mode === 'obby' ? '#ffdf7b' : '#9cf3e0', .4));
      gem.position.set(star.x, star.y, star.z); gem.castShadow = true;
      gem.userData.starId = star.id || `star-${index}`;
      objectGroup.add(gem); objectMeshes.set(`star:${gem.userData.starId}`, gem);
    }
    if (game.mode === 'obby') {
      const portalMaterial = new THREE.MeshStandardMaterial({color: '#8cf6dd', emissive: '#30b899', emissiveIntensity: .55, metalness: .18, roughness: .32});
      const portal = new THREE.Mesh(new THREE.TorusGeometry(1.2, .12, 12, 40), portalMaterial);
      portal.position.set(.5, 2.2, -30.5); portal.castShadow = true; objectGroup.add(portal); objectMeshes.set('obby-finish', portal);
      const checkpoints = [ -3.5, -8.5, -13.5, -18.5, -23.5 ];
      checkpoints.forEach((z, index) => {
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(.055, .08, 2.8, 8), material(index === game.checkpoint ? '#ffe08b' : '#b8c4ee'));
        pole.position.set(2.9, 1.4, z); pole.castShadow = true; objectGroup.add(pole);
        const flag = new THREE.Mesh(new THREE.BoxGeometry(.68, .42, .08), material(index <= game.checkpoint ? '#ffdb78' : '#a9b4db'));
        flag.position.set(3.23, 2.36, z); objectGroup.add(flag);
      });
    }
  }
  function syncPlayers(game) {
    const players = Object.values(game.players || {});
    const ids = new Set(players.map(player => player.id));
    for (const [id, avatar] of playerMeshes) {
      if (ids.has(id)) continue;
      playerGroup.remove(avatar); playerMeshes.delete(id);
    }
    for (const player of players) {
      let avatar = playerMeshes.get(player.id);
      if (avatar && (avatar.userData.team !== player.team || avatar.userData.mode !== game.mode)) {
        playerGroup.remove(avatar); playerMeshes.delete(player.id); avatar = null;
      }
      if (!avatar) {
        avatar = createAvatar(player.team, player.id === game.localId, game.mode);
        playerGroup.add(avatar); playerMeshes.set(player.id, avatar);
      }
      avatar.visible = player.alive !== false && (game.mode === 'obby' || player.id !== game.localId);
      avatar.position.set(player.x, player.y, player.z);
      avatar.rotation.y = player.yaw || 0;
      const hit = player.hitAt && game.time - player.hitAt < .22;
      avatar.scale.setScalar(hit ? 1.08 : 1);
    }
  }
  function setGame(game) {
    activeGame = game;
    scene.fog = new THREE.Fog(game.mode === 'obby' ? '#7179b8' : '#b4e5f5', 28, 88);
    scene.background = new THREE.Color(game.mode === 'obby' ? '#6c75b4' : '#a9dff4');
    syncBlocks(game); syncPlayers(game); syncObjects(game);
  }
  function draw(game = activeGame, yaw = cameraYaw, pitch = cameraPitch) {
    if (!game) return;
    activeGame = game; cameraYaw = yaw; cameraPitch = pitch;
    syncBlocks(game); syncPlayers(game);
    for (const [key, mesh] of objectMeshes) {
      const bedTeam = key.startsWith('bed:') ? key.slice(4) : '';
      if (bedTeam) mesh.visible = Boolean(game.beds?.[bedTeam]?.alive);
      if (key.startsWith('star:')) {
        const starId = key.slice(5);
        mesh.visible = (game.crystals || []).some(star => star.id === starId);
      }
      if (mesh.userData.spin) { mesh.rotation.y += .018; mesh.children[1].rotation.y -= .027; }
      if (key === 'obby-finish') mesh.rotation.z = Math.sin(game.time * 1.5) * .05;
    }
    const player = game.players?.[game.localId];
    if (player) {
      if (game.mode === 'obby') {
        const distance = 8.8;
        const horizontal = Math.cos(cameraPitch) * distance;
        camera.position.set(
          player.x - Math.sin(cameraYaw) * horizontal,
          player.y + 5.8,
          player.z + Math.cos(cameraYaw) * horizontal
        );
        camera.lookAt(player.x, player.y + 1.05, player.z);
      } else {
        const eyeY = player.y + 1.45;
        const forward = Math.cos(cameraPitch);
        camera.position.set(player.x, eyeY, player.z);
        camera.lookAt(
          player.x + Math.sin(cameraYaw) * forward,
          eyeY - Math.sin(cameraPitch),
          player.z - Math.cos(cameraYaw) * forward
        );
      }
    }
    try { renderer.render(scene, camera); } catch {}
  }
  function pickBlock() {
    if (!activeGame) return null;
    raycaster.setFromCamera(screenCentre, camera);
    const hits = raycaster.intersectObjects([...blockMeshes.values()], false);
    const hit = hits.find(item => item.distance < 4.2);
    return hit?.object?.userData?.blockId || null;
  }
  function setCamera(yaw, pitch = cameraPitch) {
    cameraYaw = yaw;
    cameraPitch = Math.max(activeGame?.mode === 'obby' ? .18 : -.85, Math.min(activeGame?.mode === 'obby' ? 1.08 : .85, pitch));
    if (activeGame) draw(activeGame, cameraYaw, cameraPitch);
  }
  function destroy() {
    resizeObserver?.disconnect();
    if (!resizeObserver) win.removeEventListener('resize', resize);
    renderer.dispose();
    blockGeometry.dispose();
    for (const list of sharedMaterials.values()) list.forEach(item => item.dispose());
    scene.traverse(object => {
      if (object.geometry && object.geometry !== blockGeometry) object.geometry.dispose();
      if (object.material && !Array.isArray(object.material)) object.material.dispose();
    });
  }
  return {renderer, scene, camera, draw, setGame, pickBlock, setCamera, destroy};
}
