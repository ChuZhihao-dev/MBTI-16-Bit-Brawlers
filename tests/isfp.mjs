import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import vm from 'node:vm';

// Logic tests do not load or render browser images.
const imagePaths = new Set();
globalThis.Image = class { set src(path) { imagePaths.add(path); } };
const { createFighter } = await import('../js/fighters/index.js');
const dt = 1 / 60;
function setup(playerIndex) {
  const fighter = createFighter('isfp', { playerIndex, x: 450, y: 364, facing: playerIndex === 1 ? 1 : -1 });
  fighter.onGround = true;
  const hits = [], projectiles = [];
  const opponent = {
    getHurtbox: () => ({ x: 450, y: 364, width: 48, height: 76 }),
    takeDamage(...args) { hits.push(args); return true; }, applyStatus() {}
  };
  const context = {
    gravity: 1800, groundY: 440, arenaWidth: 1200,
    rectsOverlap: () => true, spawnProjectile: p => projectiles.push(p),
    triggerHitstop() {}, triggerShake() {}, spawnFloatingText() {}
  };
  const step = (input = {}) => fighter.update(dt, input, opponent, context);
  return { fighter, hits, projectiles, opponent, context, step };
}
for (const side of [1, 2]) {
  const dash = setup(side), facing = dash.fighter.facing, startX = dash.fighter.x;
  dash.step({ dash: true });
  assert.equal(dash.fighter.action.kind, 'dash');
  for (let i = 0; i < 4; i++) dash.step();
  assert.equal(dash.fighter.takeDamage(8, 100, 0, null, dash.context), false);
  assert.equal(dash.fighter.hp, 95);
  for (let i = 0; i < 12; i++) dash.step();
  assert.ok(Math.abs(dash.fighter.x - startX - facing * 160) < 1e-6);
  dash.step({ dash: true });
  assert.equal(dash.fighter.action, null, 'cooldown prevents another dash');
  const reverse = setup(side);
  reverse.step({ dash: true, left: facing === 1, right: facing === -1 });
  assert.equal(reverse.fighter.facing, -facing);
  for (const blocked of ['rooted', 'exhausted']) {
    const test = setup(side); test.fighter.applyStatus(blocked, 1); test.step({ dash: true });
    assert.equal(test.fighter.action, null);
  }
  for (const [key, damage] of [['lightAttack', 8], ['heavyAttack', 11], ['inspirationDash', 15]]) {
    const test = setup(side); test.step({ [key]: true });
    for (let i = 0; i < 40; i++) test.step();
    assert.equal(test.hits.length, 1);
    assert.equal(test.hits[0][0], damage);
    assert.equal(Math.sign(test.hits[0][1]), facing);
  }
  const paint = setup(side); paint.step({ paintProjectile: true });
  for (let i = 0; i < 35; i++) paint.step();
  assert.equal(paint.projectiles.length, 1);
  assert.equal(paint.projectiles[0].vx, facing * 520);
  const ult = setup(side); ult.fighter.ep = 100; ult.step({ ultimate: true });
  assert.equal(ult.fighter.ep, 0);
  assert.equal(ult.fighter.ultimateName, '万象泼彩狂想曲');
  assert.equal(ult.projectiles.length, 1);
  const hitbox = ult.projectiles[0];
  hitbox.onHit(ult.opponent, ult.context); assert.equal(ult.hits.length, 0);
  hitbox.update(0.75); hitbox.onHit(ult.opponent, ult.context); hitbox.onHit(ult.opponent, ult.context);
  assert.equal(ult.hits.length, 1); assert.equal(ult.hits[0][0], 26);
  assert.equal(Math.sign(ult.hits[0][1]), facing);
  for (let i = 0; i < 81; i++) ult.step();
  assert.equal(ult.fighter.ultimateAnimTimer, 0);
}
const source = readFileSync(new URL('../js/main.js', import.meta.url), 'utf8');
const inputFn = source.slice(source.indexOf('function getPlayerInput('), source.indexOf('function updateControlsHint('));
for (const [player, codes] of [[1, ['KeyJ','KeyK','KeyL','KeyU','KeyI','KeyO']], [2, ['Digit1','Digit2','Digit3','Digit4','Digit5','Digit6']], [2, ['Numpad1','Numpad2','Numpad3','Numpad4','Numpad5','Numpad6']]]) {
  for (const [i, key] of ['lightAttack','heavyAttack','dash','skill1','skill2','ultimate'].entries()) {
    const scope = { p1: {id:'isfp'}, p2: {id:'isfp'}, keysDown: new Set(), keysJustPressed: new Set([codes[i]]) };
    const input = vm.runInNewContext(`${inputFn}\ngetPlayerInput(${player})`, scope);
    assert.equal(input[key], true, codes[i]);
    assert.equal(input.attack, undefined); assert.equal(input.skill, undefined);
  }
}
for (const path of imagePaths) assert.ok(existsSync(new URL(`../${path}`, import.meta.url)), path);
console.log('PASS: both sides use new actions, directional dash and invulnerability, cooldown/status gates, attacks, projectiles, ultimate timing, all key mappings, and resource paths.');
