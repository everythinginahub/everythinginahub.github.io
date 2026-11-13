import {
  BLOCKS, BLOCK_SIZE, GAME_WIDTH, GAME_HEIGHT, WORLD_COLS, WORLD_ROWS, WORLD_WIDTH,
  OBBY_CHECKPOINTS, OBBY_FINISH_X, OBBY_SPIKES, OBBY_STARS, obbyPlatforms
} from './arcade-creative-engine.js?v=20261114-1';

const rect = (context, color, x, y, width, height) => {
  context.fillStyle = color;
  context.fillRect(x, y, width, height);
};
const circle = (context, x, y, radius, color) => {
  context.beginPath();
  context.arc(x, y, radius, 0, Math.PI * 2);
  context.fillStyle = color;
  context.fill();
};
const polygon = (context, points, color) => {
  context.beginPath();
  points.forEach(([x, y], index) => index ? context.lineTo(x, y) : context.moveTo(x, y));
  context.closePath();
  context.fillStyle = color;
  context.fill();
};

function drawBlock(context, id, x, y) {
  const size = BLOCK_SIZE;
  const base = ({
    [BLOCKS.grass]: '#79523a', [BLOCKS.dirt]: '#865a3d', [BLOCKS.stone]: '#66727c',
    [BLOCKS.crystal]: '#394457', [BLOCKS.wood]: '#805137', [BLOCKS.leaf]: '#348866'
  })[id] || '#526274';
  rect(context, base, x, y, size, size);
  if (id === BLOCKS.grass) {
    rect(context, '#58bb74', x, y, size, 9);
    rect(context, '#8be184', x + 2, y + 2, 11, 3);
    rect(context, '#3f9760', x, y + 8, size, 3);
    rect(context, '#a2734d', x + 7, y + 17, 4, 3);
    rect(context, '#68452f', x + 23, y + 24, 5, 3);
  } else if (id === BLOCKS.dirt) {
    rect(context, '#a77750', x + 5, y + 7, 4, 3);
    rect(context, '#68452f', x + 21, y + 13, 5, 3);
    rect(context, '#b48257', x + 12, y + 25, 6, 3);
  } else if (id === BLOCKS.stone) {
    rect(context, '#87939a', x + 3, y + 4, 12, 3);
    rect(context, '#4a5662', x + 17, y + 12, 11, 4);
    rect(context, '#77838b', x + 6, y + 23, 9, 4);
  } else if (id === BLOCKS.crystal) {
    rect(context, '#4c586b', x + 2, y + 5, 27, 24);
    context.save();
    context.shadowColor = '#8ef5ee';
    context.shadowBlur = 10;
    polygon(context, [[x + 16, y + 6], [x + 24, y + 15], [x + 19, y + 26], [x + 11, y + 22], [x + 9, y + 13]], '#8cf3df');
    polygon(context, [[x + 16, y + 8], [x + 18, y + 17], [x + 13, y + 21], [x + 11, y + 13]], '#d9fff4');
    context.restore();
  } else if (id === BLOCKS.wood) {
    rect(context, '#b67a4e', x + 6, y, 5, size);
    rect(context, '#65412e', x + 20, y, 4, size);
    rect(context, '#d39a65', x + 12, y + 5, 3, 7);
    rect(context, '#d39a65', x + 12, y + 21, 3, 6);
  } else if (id === BLOCKS.leaf) {
    rect(context, '#54ae73', x + 4, y + 4, 9, 7);
    rect(context, '#2d7555', x + 17, y + 6, 10, 7);
    rect(context, '#65c57e', x + 8, y + 20, 8, 7);
    rect(context, '#24694e', x + 22, y + 22, 5, 6);
  }
  context.strokeStyle = id === BLOCKS.leaf ? '#176449' : '#1d304033';
  context.lineWidth = 1;
  context.strokeRect(x + .5, y + .5, size - 1, size - 1);
}

function drawBuilderPlayer(context, player, time) {
  const x = Math.round(player.x), y = Math.round(player.y);
  const stride = player.grounded ? Math.sin(time * 13) * 2 : 0;
  context.save();
  context.lineCap = 'round';
  context.strokeStyle = '#264255';
  context.lineWidth = 7;
  context.beginPath();
  context.moveTo(x + 7, y + 34); context.lineTo(x + 6 + stride, y + 42);
  context.moveTo(x + 17, y + 34); context.lineTo(x + 18 - stride, y + 42);
  context.stroke();
  rect(context, '#f0b967', x + 4, y + 11, 16, 24);
  rect(context, '#40c4b5', x + 2, y + 15, 20, 17);
  rect(context, '#287f86', x + 2, y + 25, 20, 5);
  rect(context, '#ffd3a4', x + 5, y + 1, 15, 14);
  rect(context, '#2e3650', x + 4, y, 16, 5);
  rect(context, '#2e3650', x + 3, y + 3, 4, 5);
  rect(context, '#2e3650', x + 15, y + 4, 4, 2);
  rect(context, '#23364b', x + 14, y + 7, 2, 2);
  context.restore();
}

export function drawBlockWorld(canvas, game) {
  let context;
  try { context = canvas?.getContext('2d'); } catch { return; }
  if (!context) return;
  const c = context, phase = (game.time % 90) / 90, daylight = .6 + Math.cos(phase * Math.PI * 2) * .32;
  const sky = c.createLinearGradient(0, 0, 0, GAME_HEIGHT);
  sky.addColorStop(0, daylight > .45 ? '#7bd5ed' : '#1f3158');
  sky.addColorStop(1, daylight > .45 ? '#d9f0d6' : '#43577d');
  rect(c, sky, 0, 0, GAME_WIDTH, GAME_HEIGHT);

  const sunX = 120 + phase * (GAME_WIDTH + 80) - 40;
  const sunY = 116 + Math.sin(phase * Math.PI * 2) * 44;
  circle(c, sunX, sunY, 42, daylight > .4 ? '#fff0a4' : '#d9e8ff');
  circle(c, sunX, sunY, 51, daylight > .4 ? '#fff0a433' : '#d9e8ff22');
  for (let index = 0; index < 20; index++) {
    const x = (index * 137 + 41) % GAME_WIDTH;
    const y = 42 + (index * 73) % 200;
    if (daylight < .45) circle(c, x, y, index % 4 === 0 ? 2 : 1, '#ffffffaa');
  }
  c.save();
  c.globalAlpha = .28;
  for (let index = 0; index < 7; index++) {
    const x = ((index * 215 - game.cameraX * .13) % (GAME_WIDTH + 220) + GAME_WIDTH + 220) % (GAME_WIDTH + 220) - 80;
    const y = 76 + (index % 3) * 47;
    circle(c, x, y, 22, '#ffffff'); circle(c, x + 22, y - 9, 28, '#ffffff'); circle(c, x + 47, y + 1, 20, '#ffffff');
  }
  c.restore();
  c.save();
  c.fillStyle = '#587c8c55';
  c.beginPath(); c.moveTo(0, 332);
  for (let x = -60; x <= GAME_WIDTH + 80; x += 80) c.lineTo(x, 298 + Math.sin((x + game.cameraX * .2) * .008) * 24);
  c.lineTo(GAME_WIDTH, GAME_HEIGHT); c.lineTo(0, GAME_HEIGHT); c.closePath(); c.fill();
  c.restore();

  c.save();
  c.translate(-game.cameraX, 0);
  const firstCol = Math.max(0, Math.floor(game.cameraX / BLOCK_SIZE) - 1);
  const lastCol = Math.min(WORLD_COLS - 1, Math.ceil((game.cameraX + GAME_WIDTH) / BLOCK_SIZE) + 1);
  for (let col = firstCol; col <= lastCol; col++) {
    for (let row = 0; row < WORLD_ROWS; row++) {
      const block = game.world[row * WORLD_COLS + col];
      if (block) drawBlock(c, block, col * BLOCK_SIZE, row * BLOCK_SIZE);
    }
  }
  if (game.hover) {
    const x = game.hover.col * BLOCK_SIZE, y = game.hover.row * BLOCK_SIZE;
    c.strokeStyle = '#fff6b6'; c.lineWidth = 2; c.strokeRect(x + 2, y + 2, BLOCK_SIZE - 4, BLOCK_SIZE - 4);
  }
  drawBuilderPlayer(c, game.player, game.time);
  c.restore();

  const shade = Math.max(0, .24 - daylight * .23);
  if (shade) rect(c, `rgba(19, 28, 65, ${shade})`, 0, 0, GAME_WIDTH, GAME_HEIGHT);
  const vignette = c.createLinearGradient(0, 0, 0, GAME_HEIGHT);
  vignette.addColorStop(0, '#ffffff08'); vignette.addColorStop(1, '#162a2f28');
  rect(c, vignette, 0, 0, GAME_WIDTH, GAME_HEIGHT);
}

function drawStar(context, x, y, radius, rotation = 0) {
  context.save(); context.translate(x, y); context.rotate(rotation); context.beginPath();
  for (let point = 0; point < 10; point++) {
    const angle = -Math.PI / 2 + point * Math.PI / 5;
    const r = point % 2 ? radius * .45 : radius;
    const px = Math.cos(angle) * r, py = Math.sin(angle) * r;
    point ? context.lineTo(px, py) : context.moveTo(px, py);
  }
  context.closePath(); context.fillStyle = '#ffe691'; context.shadowColor = '#ffd66f'; context.shadowBlur = 12; context.fill(); context.restore();
}

function drawObbyPlayer(context, player, time) {
  const x = Math.round(player.x), y = Math.round(player.y), stride = player.grounded ? Math.sin(time * 12) * 2 : 0;
  context.save();
  context.strokeStyle = '#2b3262'; context.lineWidth = 8; context.lineCap = 'round'; context.beginPath();
  context.moveTo(x + 7, y + 33); context.lineTo(x + 6 + stride, y + 42);
  context.moveTo(x + 18, y + 33); context.lineTo(x + 19 - stride, y + 42); context.stroke();
  rect(context, '#7356dd', x + 2, y + 13, 22, 22);
  rect(context, '#a795ff', x + 3, y + 13, 20, 5);
  rect(context, '#ffd2a6', x + 5, y + 1, 16, 15);
  rect(context, '#33365c', x + 4, y, 17, 5);
  rect(context, '#33365c', x + 3, y + 3, 4, 5);
  rect(context, '#33365c', x + 17, y + 4, 4, 2);
  rect(context, '#252846', x + 15, y + 7, 2, 2);
  context.restore();
}

export function drawObby(canvas, game) {
  let context;
  try { context = canvas?.getContext('2d'); } catch { return; }
  if (!context) return;
  const c = context;
  const sky = c.createLinearGradient(0, 0, 0, GAME_HEIGHT);
  sky.addColorStop(0, '#35337e'); sky.addColorStop(.62, '#5967ad'); sky.addColorStop(1, '#b782c2');
  rect(c, sky, 0, 0, GAME_WIDTH, GAME_HEIGHT);
  for (let index = 0; index < 56; index++) {
    const x = (index * 173 + 31) % GAME_WIDTH, y = (index * 89 + 23) % 315;
    circle(c, x, y, index % 9 === 0 ? 2 : 1, index % 3 === 0 ? '#fff0c9' : '#ffffffa8');
  }
  circle(c, 790, 108, 41, '#ffd8b0'); circle(c, 790, 108, 53, '#ffd8b033');
  c.save(); c.fillStyle = '#353c8299'; c.beginPath(); c.moveTo(0, 405);
  for (let x = 0; x <= GAME_WIDTH + 70; x += 70) c.lineTo(x, 365 + Math.sin((x + game.cameraX * .18) * .009) * 31);
  c.lineTo(GAME_WIDTH, GAME_HEIGHT); c.lineTo(0, GAME_HEIGHT); c.closePath(); c.fill(); c.restore();
  c.save(); c.fillStyle = '#45488f'; c.beginPath(); c.moveTo(0, 452);
  for (let x = 0; x <= GAME_WIDTH + 80; x += 80) c.lineTo(x, 430 + Math.sin((x + game.cameraX * .33) * .007) * 22);
  c.lineTo(GAME_WIDTH, GAME_HEIGHT); c.lineTo(0, GAME_HEIGHT); c.closePath(); c.fill(); c.restore();

  c.save(); c.translate(-game.cameraX, 0);
  for (const platform of obbyPlatforms(game.time)) {
    const ground = Boolean(platform.ground);
    rect(c, ground ? '#34305f' : '#4852a8', platform.x, platform.y, platform.w, platform.h);
    rect(c, ground ? '#43d3bc' : '#8ff0d5', platform.x, platform.y, platform.w, ground ? 8 : 5);
    rect(c, '#ffffff25', platform.x + 4, platform.y + (ground ? 11 : 7), Math.max(0, platform.w - 8), 2);
    if (ground) {
      for (let tile = 0; tile < platform.w; tile += 34) {
        rect(c, '#555080', platform.x + tile + 8, platform.y + 24, 16, 3);
        rect(c, '#272b55', platform.x + tile + 18, platform.y + 45, 9, 3);
      }
    }
  }
  for (const spike of OBBY_SPIKES) {
    const count = Math.max(1, Math.floor(spike.w / 18));
    for (let index = 0; index < count; index++) {
      const x = spike.x + index * 18;
      polygon(c, [[x, spike.y + spike.h], [x + 9, spike.y], [x + 18, spike.y + spike.h]], '#ff758f');
      polygon(c, [[x + 7, spike.y + spike.h - 1], [x + 10, spike.y + 8], [x + 14, spike.y + spike.h - 1]], '#ffc0cd');
    }
  }
  for (const x of OBBY_CHECKPOINTS) {
    const active = OBBY_CHECKPOINTS.indexOf(x) <= game.checkpoint;
    rect(c, active ? '#ffd879' : '#a9a6ef', x + 9, 409, 5, 63);
    polygon(c, [[x + 14, 412], [x + 50, 423], [x + 14, 436]], active ? '#ffdb7a' : '#a9a6ef');
    circle(c, x + 11, 407, 7, active ? '#fff1b5' : '#d9ddff');
  }
  for (const star of OBBY_STARS) {
    if (game.stars.includes(star.x)) continue;
    const pulse = 1 + Math.sin(game.time * 4 + star.x) * .08;
    drawStar(c, star.x, star.y, 12 * pulse, game.time * .2);
  }
  const portalX = OBBY_FINISH_X;
  c.save(); c.shadowColor = '#89ffe4'; c.shadowBlur = 24;
  c.strokeStyle = '#8effe4'; c.lineWidth = 8; c.beginPath(); c.ellipse(portalX, 418, 28, 48, 0, 0, Math.PI * 2); c.stroke();
  c.strokeStyle = '#ffe68e'; c.lineWidth = 3; c.beginPath(); c.ellipse(portalX, 418, 18, 38, 0, 0, Math.PI * 2); c.stroke();
  circle(c, portalX, 418, 10, '#c7fff2'); c.restore();
  drawObbyPlayer(c, game.player, game.time);
  c.restore();
  const progress = Math.min(1, game.player.x / OBBY_FINISH_X);
  rect(c, '#171a4645', 23, 19, 204, 10);
  rect(c, '#9af3d7', 25, 21, 200 * progress, 6);
  c.strokeStyle = '#ffffff9c'; c.lineWidth = 1; c.strokeRect(22.5, 18.5, 205, 11);
}
