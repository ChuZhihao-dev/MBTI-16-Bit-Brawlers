import { GameEngine } from './engine.js';
import { FIGHTER_ROSTER, createFighter } from './fighters/index.js';

const selectScreen = document.getElementById('select-screen');
const fightScreen = document.getElementById('fight-screen');
const rosterGrid = document.getElementById('roster-grid');
const p1SelectedName = document.getElementById('p1-selected-name');
const p2SelectedName = document.getElementById('p2-selected-name');
const startBtn = document.getElementById('start-btn');

const resultOverlay = document.getElementById('result-overlay');
const winnerText = document.getElementById('winner-text');
const resultSubtext = document.getElementById('result-subtext');
const rematchBtn = document.getElementById('rematch-btn');
const backSelectBtn = document.getElementById('back-select-btn');

const canvas = document.getElementById('game-canvas');
const engine = new GameEngine(canvas);

let selectedP1 = 'intj';
let selectedP2 = 'entp';
let p1 = null;
let p2 = null;
let gameState = 'SELECT'; // SELECT | FIGHT | RESULT
let matchTimer = 99;
let lastTime = 0;

// 键盘状态管理（含边沿触发）
const keysDown = new Set();
const keysJustPressed = new Set();

const BLOCKED_KEYS = new Set([
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'Space'
]);

window.addEventListener('keydown', (e) => {
  if (BLOCKED_KEYS.has(e.code)) {
    e.preventDefault();
  }
  if (!keysDown.has(e.code)) {
    keysJustPressed.add(e.code);
  }
  keysDown.add(e.code);
});

window.addEventListener('keyup', (e) => {
  keysDown.delete(e.code);
});

function getPlayerInput(playerIndex) {
  if (playerIndex === 1) {
    return {
      left: keysDown.has('KeyA'),
      right: keysDown.has('KeyD'),
      up: keysJustPressed.has('KeyW'),
      attack: keysJustPressed.has('KeyJ'),
      skill: keysJustPressed.has('KeyK'),
      ultimate: keysJustPressed.has('KeyL')
    };
  }
  return {
    left: keysDown.has('ArrowLeft'),
    right: keysDown.has('ArrowRight'),
    up: keysJustPressed.has('ArrowUp'),
    attack: keysJustPressed.has('KeyU') || keysJustPressed.has('Numpad1'),
    skill: keysJustPressed.has('KeyI') || keysJustPressed.has('Numpad2'),
    ultimate: keysJustPressed.has('KeyO') || keysJustPressed.has('Numpad3')
  };
}

// 渲染选人卡片
function renderRoster() {
  rosterGrid.innerHTML = '';
  for (const fighter of FIGHTER_ROSTER) {
    const card = document.createElement('div');
    card.className = 'fighter-card';
    card.style.borderColor = fighter.color;
    card.innerHTML = `
      <div class="fighter-card-head">
        <span class="fighter-card-name" style="color:${fighter.color}">${fighter.name}</span>
        <span class="fighter-card-title">${fighter.title}</span>
      </div>
      <p class="fighter-card-desc">${fighter.desc}</p>
      <div class="card-pick-btns">
        <button class="pick-btn p1 ${selectedP1 === fighter.id ? 'selected' : ''}" data-player="1" data-id="${fighter.id}">选为 1P</button>
        <button class="pick-btn p2 ${selectedP2 === fighter.id ? 'selected' : ''}" data-player="2" data-id="${fighter.id}">选为 2P</button>
      </div>
    `;
    rosterGrid.appendChild(card);
  }

  p1SelectedName.textContent = selectedP1.toUpperCase();
  p2SelectedName.textContent = selectedP2.toUpperCase();
}

rosterGrid.addEventListener('click', (e) => {
  const btn = e.target.closest('.pick-btn');
  if (!btn) return;
  const player = Number(btn.dataset.player);
  const id = btn.dataset.id;
  if (player === 1) selectedP1 = id;
  else selectedP2 = id;
  renderRoster();
});

function startMatch() {
  engine.reset();
  p1 = createFighter(selectedP1, {
    playerIndex: 1,
    x: 180,
    y: engine.groundY - 76,
    facing: 1
  });
  p2 = createFighter(selectedP2, {
    playerIndex: 2,
    x: engine.arenaWidth - 228,
    y: engine.groundY - 76,
    facing: -1
  });

  matchTimer = 99;
  gameState = 'FIGHT';
  resultOverlay.classList.add('hidden');
  selectScreen.classList.remove('active');
  fightScreen.classList.add('active');
  updateHud();
}

function updateHud() {
  document.getElementById('p1-hud-name').textContent = p1.name;
  document.getElementById('p1-hp-text').textContent = `${Math.ceil(p1.hp)} / ${p1.maxHp}`;
  document.getElementById('p1-hp-bar').style.width = `${(p1.hp / p1.maxHp) * 100}%`;
  document.getElementById('p1-ep-bar').style.width = `${(p1.ep / p1.maxEp) * 100}%`;
  document.getElementById('p1-ep-text').textContent = p1.ep >= 100 ? 'MAX! 按 L' : `EP ${Math.floor(p1.ep)}%`;
  document.getElementById('p1-cd-text').textContent = p1.skillCd > 0 ? `CD ${p1.skillCd.toFixed(1)}s` : 'SKILL READY';

  document.getElementById('p2-hud-name').textContent = p2.name;
  document.getElementById('p2-hp-text').textContent = `${Math.ceil(p2.hp)} / ${p2.maxHp}`;
  document.getElementById('p2-hp-bar').style.width = `${(p2.hp / p2.maxHp) * 100}%`;
  document.getElementById('p2-ep-bar').style.width = `${(p2.ep / p2.maxEp) * 100}%`;
  document.getElementById('p2-ep-text').textContent = p2.ep >= 100 ? 'MAX! 按 O/3' : `EP ${Math.floor(p2.ep)}%`;
  document.getElementById('p2-cd-text').textContent = p2.skillCd > 0 ? `CD ${p2.skillCd.toFixed(1)}s` : 'SKILL READY';

  document.getElementById('match-timer').textContent = String(Math.ceil(matchTimer));
}

function finishMatch(winnerLabel, subtext) {
  gameState = 'RESULT';
  winnerText.textContent = winnerLabel;
  resultSubtext.textContent = subtext;
  resultOverlay.classList.remove('hidden');
}

function gameLoop(timestamp) {
  if (!lastTime) lastTime = timestamp;
  const dt = Math.min(0.05, (timestamp - lastTime) / 1000);
  lastTime = timestamp;

  if (gameState === 'FIGHT') {
    matchTimer = Math.max(0, matchTimer - dt);
    const p1Input = getPlayerInput(1);
    const p2Input = getPlayerInput(2);
    engine.update(dt, p1, p2, p1Input, p2Input);
    engine.render(p1, p2);
    updateHud();

    if (p1.hp <= 0 && p2.hp <= 0) {
      finishMatch('DRAW GAME!', '双方同时陷入深度内耗。');
    } else if (p2.hp <= 0) {
      finishMatch(`1P ${p1.name} WINS!`, '完美压制，对手已彻底破防。');
    } else if (p1.hp <= 0) {
      finishMatch(`2P ${p2.name} WINS!`, '完美压制，对手已彻底破防。');
    } else if (matchTimer <= 0) {
      if (p1.hp === p2.hp) {
        finishMatch('TIME UP · DRAW!', '旗鼓相当的性格对决！');
      } else {
        const win = p1.hp > p2.hp ? `1P ${p1.name}` : `2P ${p2.name}`;
        finishMatch(`${win} WINS!`, '时间耗尽，剩余血量更高者获胜！');
      }
    }
  }

  keysJustPressed.clear();
  requestAnimationFrame(gameLoop);
}

startBtn.addEventListener('click', startMatch);
rematchBtn.addEventListener('click', startMatch);
backSelectBtn.addEventListener('click', () => {
  gameState = 'SELECT';
  fightScreen.classList.remove('active');
  selectScreen.classList.add('active');
});

renderRoster();
requestAnimationFrame(gameLoop);
