import { GameEngine } from './engine.js';
import { FIGHTER_ROSTER, createFighter, getFighterMeta } from './fighters/index.js';
import { sfx } from './sfx.js';

const coverScreen = document.getElementById('cover-screen');
const selectScreen = document.getElementById('select-screen');
const fightScreen = document.getElementById('fight-screen');

const pauseBtn = document.getElementById('pause-btn');
const pauseOverlay = document.getElementById('pause-overlay');
const soundSetting = document.getElementById('sound-setting');
const showcaseSetting = document.getElementById('showcase-setting');
const resumeBtn = document.getElementById('resume-btn');
const gameOverBanner = document.getElementById('game-over-banner');
const coverMarquee = document.getElementById('cover-marquee');
const enterSelectBtn = document.getElementById('enter-select-btn');
const backCoverBtn = document.getElementById('back-cover-btn');
const startBtn = document.getElementById('start-btn');

const slotP1Btn = document.getElementById('slot-p1-btn');
const slotP2Btn = document.getElementById('slot-p2-btn');
const randomPickBtn = document.getElementById('random-pick-btn');
const randomBothBtn = document.getElementById('random-both-btn');
const swapPickBtn = document.getElementById('swap-pick-btn');
const groupFilter = document.getElementById('group-filter');
const p1Spotlight = document.getElementById('p1-spotlight');
const p2Spotlight = document.getElementById('p2-spotlight');
const rosterGrid = document.getElementById('roster-grid');

const vsOverlay = document.getElementById('vs-overlay');
const vsCountdown = document.getElementById('vs-countdown');
const resultOverlay = document.getElementById('result-overlay');
const winnerPortrait = document.getElementById('winner-portrait');
const winnerPortraitWrap = document.querySelector('.winner-portrait-wrap');
const winnerText = document.getElementById('winner-text');
const resultSubtext = document.getElementById('result-subtext');
const rematchBtn = document.getElementById('rematch-btn');
const backSelectBtn = document.getElementById('back-select-btn');
const fillEpBtn = document.getElementById('fill-ep-btn');
const resetRoundBtn = document.getElementById('reset-round-btn');
const fightBackSelectBtn = document.getElementById('fight-back-select-btn');
const p1ControlsHint = document.getElementById('p1-controls-hint');
const p2ControlsHint = document.getElementById('p2-controls-hint');

const canvas = document.getElementById('game-canvas');
const engine = new GameEngine(canvas);
engine.onUltimateStart = () => {
  sfx.ultimate();
};

let selectedP1 = 'intj';
let selectedP2 = 'infj';
let activeSlot = 1; // 1 或 2
let activeGroup = 'ALL';
let hoveredId = null;
let kbdCursorIdx = 0;
let lastLockedId = null;

let p1 = null;
let p2 = null;
let gameState = 'COVER'; // COVER | SELECT | VS | FIGHT | RESULT
let matchTimer = 99;
let lastTime = 0;
let vsTimerIds = [];
let paused = false;
let finisher = null;
function showGameOverBanner(visible) {
  gameOverBanner.hidden = !visible;
  gameOverBanner.classList.toggle('hidden', !visible);
}
engine.onUltimateKo = (winner, loser) => {
  if (finisher) return;
  const remainingShowcase = engine.showUltimateShowcase && winner.ultimateAnimTimer > 0;
  finisher = {
    winner, loser,
    phase: remainingShowcase ? 'showcase' : 'gameover',
    elapsed: 0,
    specialFinish: true
  };
  engine.projectiles = [];
  if (finisher.phase === 'gameover') {
    winner.ultimateAnimTimer = 0;
    showGameOverBanner(true);
  }
};

const keysDown = new Set();
const keysJustPressed = new Set();

const BLOCKED_KEYS = new Set([
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'Space'
]);

function getVisibleFighters() {
  return FIGHTER_ROSTER.filter(
    (f) => activeGroup === 'ALL' || f.group === activeGroup
  );
}

window.addEventListener('keydown', (e) => {
  if (BLOCKED_KEYS.has(e.code)) {
    e.preventDefault();
  }
  if (!keysDown.has(e.code)) {
    keysJustPressed.add(e.code);
    handleMenuShortcut(e);
  }
  keysDown.add(e.code);
});

window.addEventListener('keyup', (e) => {
  keysDown.delete(e.code);
});

function handleMenuShortcut(e) {
  if (gameState === 'FIGHT' && e.code === 'Escape') {
    setPaused(!paused);
    return;
  }
  if (gameState === 'COVER') {
    if (e.code === 'Enter' || e.code === 'Space') {
      enterSelectScreen('ALL');
    }
    return;
  }

  if (gameState === 'VS') {
    if (e.code === 'Space' || e.code === 'Enter' || e.code === 'Escape') {
      finishVsSplash();
    }
    return;
  }

  if (gameState === 'SELECT') {
    const visible = getVisibleFighters();
    if (!visible.length) return;

    if (e.code === 'ArrowRight' || e.code === 'KeyD') {
      kbdCursorIdx = (kbdCursorIdx + 1) % visible.length;
      sfx.tick();
      updateKeyboardFocusAndPreview();
    } else if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
      kbdCursorIdx = (kbdCursorIdx - 1 + visible.length) % visible.length;
      sfx.tick();
      updateKeyboardFocusAndPreview();
    } else if (e.code === 'Enter') {
      const target = visible[kbdCursorIdx];
      if (target) lockFighter(target.id);
    } else if (e.code === 'Digit1') {
      setActiveSlot(1);
    } else if (e.code === 'Digit2') {
      setActiveSlot(2);
    } else if (e.code === 'Tab') {
      e.preventDefault();
      setActiveSlot(activeSlot === 1 ? 2 : 1);
    } else if (e.code === 'KeyR') {
      randomizeActiveSlot();
    } else if (e.code === 'Space') {
      launchMatchWithVsSplash();
    }
  }
}

function switchScreen(target) {
  coverScreen.classList.remove('active');
  selectScreen.classList.remove('active');
  fightScreen.classList.remove('active');
  target.classList.add('active');
}

function getPlayerInput(playerIndex) {
  if (playerIndex === 1) {
    if (p1?.id === 'enfj') {
      return {
        left: keysDown.has('KeyA'), right: keysDown.has('KeyD'),
        up: keysJustPressed.has('KeyW'), guard: keysDown.has('KeyS'),
        lightAttack: keysJustPressed.has('KeyJ'), heavyAttack: keysJustPressed.has('KeyK'),
        dash: keysJustPressed.has('KeyL'), rangedAttack: keysJustPressed.has('KeyU'),
        special: keysJustPressed.has('KeyI'), ultimate: keysJustPressed.has('KeyO')
      };
    }
    if (p1?.id === 'isfp') {
      return {
        left: keysDown.has('KeyA'),
        right: keysDown.has('KeyD'),
        up: keysJustPressed.has('KeyW'),
        dash: keysJustPressed.has('KeyL'),
        lightAttack: keysJustPressed.has('KeyJ'),
        heavyAttack: keysJustPressed.has('KeyK'),
        paintProjectile: keysJustPressed.has('KeyU'),
        inspirationDash: keysJustPressed.has('KeyI'),
        ultimate: keysJustPressed.has('KeyO')
      };
    }
    return {
      left: keysDown.has('KeyA'),
      right: keysDown.has('KeyD'),
      up: keysJustPressed.has('KeyW'),
      attack: keysJustPressed.has('KeyJ'),
      skill: keysJustPressed.has('KeyK'),
      ultimate: keysJustPressed.has('KeyL')
    };
  }
  if (p2?.id === 'enfj') {
    const pressed = (digit) => keysJustPressed.has(`Digit${digit}`) || keysJustPressed.has(`Numpad${digit}`);
    return {
      left: keysDown.has('ArrowLeft'), right: keysDown.has('ArrowRight'),
      up: keysJustPressed.has('ArrowUp'), guard: keysDown.has('ArrowDown'),
      lightAttack: pressed(4), heavyAttack: pressed(5), dash: pressed(6),
      rangedAttack: pressed(7), special: pressed(8), ultimate: pressed(9)
    };
  }
  return {
    left: keysDown.has('ArrowLeft'),
    right: keysDown.has('ArrowRight'),
    up: keysJustPressed.has('ArrowUp'),
    attack: keysJustPressed.has('Numpad1') || (!['isfp', 'enfj'].includes(p1?.id) && keysJustPressed.has('KeyU')),
    skill: keysJustPressed.has('Numpad2') || (!['isfp', 'enfj'].includes(p1?.id) && keysJustPressed.has('KeyI')),
    ultimate: keysJustPressed.has('Numpad3') || (!['isfp', 'enfj'].includes(p1?.id) && keysJustPressed.has('KeyO'))
  };
}

function updateControlsHint() {
  p1ControlsHint.innerHTML = selectedP1 === 'enfj'
    ? '<strong>1P ENFJ:</strong> A/D 移动 · W 跳 · S 防御 · J 轻击 · K 重击 · L 冲刺 · U 三连剑气 · I 气焰共鸣 · O 必杀'
    : selectedP1 === 'isfp'
      ? '<strong>1P ISFP:</strong> A/D 移动 · W 跳 · A/D+L 冲刺 · J 轻击 · K 重击 · U 颜料弹 · I 彩绘突刺 · O 必杀'
      : '<strong>1P:</strong> A/D 移动 · W 跳 · J 普攻 · K 特技 · L 大招';
  p2ControlsHint.innerHTML = selectedP2 === 'enfj'
    ? '<strong>2P ENFJ:</strong> ←/→ 移动 · ↑ 跳 · ↓ 防御 · 4 轻击 · 5 重击 · 6 冲刺 · 7 三连剑气 · 8 气焰共鸣 · 9 必杀'
    : selectedP1 === 'isfp' || selectedP1 === 'enfj'
      ? '<strong>2P:</strong> ←/→ 移动 · ↑ 跳 · 小键盘 1 普攻 · 2 特技 · 3 大招'
      : '<strong>2P:</strong> ←/→ 移动 · ↑ 跳 · U(1) 普攻 · I(2) 特技 · O(3) 大招';
}

/**
 * 若角色暂未放入 concept/portrait.png，则自动生成 16-bit 风格 SVG 海报作为保底
 */
function buildFallbackPosterUrl(fighter) {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="240" height="320" viewBox="0 0 240 320">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#0f172a"/>
          <stop offset="100%" stop-color="${fighter.color}"/>
        </linearGradient>
      </defs>
      <rect width="240" height="320" fill="url(#bg)"/>
      <rect x="14" y="14" width="212" height="292" fill="none" stroke="rgba(255,255,255,0.28)" stroke-width="3"/>
      <text x="24" y="46" fill="rgba(255,255,255,0.8)" font-family="monospace" font-size="16" font-weight="bold">${fighter.group} · ${fighter.groupName}</text>
      <rect x="72" y="88" width="96" height="128" rx="6" fill="${fighter.color}" stroke="#090b12" stroke-width="6"/>
      <rect x="92" y="120" width="20" height="16" fill="#090b12"/>
      <rect x="128" y="120" width="20" height="16" fill="#090b12"/>
      <rect x="98" y="124" width="8" height="8" fill="#ffffff"/>
      <rect x="134" y="124" width="8" height="8" fill="#ffffff"/>
      <text x="120" y="274" text-anchor="middle" fill="#ffffff" font-family="monospace" font-size="38" font-weight="900">${fighter.name}</text>
    </svg>
  `.trim();
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function createPosterImgHtml(fighter) {
  const fallback = buildFallbackPosterUrl(fighter);
  const src = fighter.id === 'infj' ? fallback : fighter.posterPath;
  return `<img src="${src}" alt="${fighter.name} 海报" onerror="this.onerror=null;this.src='${fallback}';" />`;
}

function setImgWithFallback(imgEl, fighter) {
  const fallback = buildFallbackPosterUrl(fighter);
  imgEl.onerror = () => {
    imgEl.onerror = null;
    imgEl.src = fallback;
  };
  imgEl.src = fighter.id === 'infj' ? fallback : fighter.posterPath;
  imgEl.alt = fighter.name;
}

function renderCoverMarquee() {
  const chips = [...FIGHTER_ROSTER, ...FIGHTER_ROSTER]
    .map(
      (f) => `
      <div class="marquee-chip">
        ${createPosterImgHtml(f)}
        <strong style="color:${f.color}">${f.name}</strong>
      </div>`
    )
    .join('');
  coverMarquee.innerHTML = chips;
}

function renderSpotlight(container, playerIndex, fighterId, { isPreview = false, animatePop = false } = {}) {
  const f = getFighterMeta(fighterId);
  const movesHtml = playerIndex === 1 && fighterId === 'isfp'
    ? '<li><strong>[J/K] 甩笔点刺 / 泼墨横扫：</strong>轻击可接重击。</li>'
      + '<li><strong>[U/I] 颜料弹 / 彩绘突刺：</strong>中距离牵制或突进爆发。</li>'
      + '<li><strong>[O] 万象泼彩狂想曲：</strong>聚能后释放大范围泼彩。</li>'
    : `<li><strong>[普攻] ${f.moves.basic.name}：</strong>${f.moves.basic.desc}</li>
        <li><strong>[特技] ${f.moves.skill.name}：</strong>${f.moves.skill.desc}</li>
        <li><strong>[奥义] ${f.moves.ultimate.name}：</strong>${f.moves.ultimate.desc}</li>`;
  const tag = playerIndex === 1 ? '1P' : '2P';
  const cls = playerIndex === 1 ? 'p1' : 'p2';
  container.classList.toggle('active-slot', activeSlot === playerIndex);
  container.classList.toggle('previewing', isPreview);

  const hpPct = Math.min(100, Math.round((f.stats.hp / 140) * 100));
  const spdPct = Math.min(100, Math.round((f.stats.speed / 360) * 100));
  const jmpPct = Math.min(100, Math.round((f.stats.jump / 700) * 100));

  container.innerHTML = `
    <div class="spotlight-poster ${animatePop ? 'pop' : ''}">
      ${createPosterImgHtml(f)}
      ${isPreview ? '<span class="preview-pill">PREVIEW</span>' : ''}
    </div>
    <div class="spotlight-info">
      <div class="spotlight-head">
        <span class="badge ${cls}">${tag}</span>
        <span class="spotlight-name" style="color:${f.color}">${f.name}</span>
        <span class="spotlight-title">${f.title}</span>
      </div>
      <p class="spotlight-bio">${f.bio}</p>
      <div class="spotlight-stat-bars">
        <div class="stat-bar-item">
          <div class="stat-bar-head"><span>HP</span><span>${f.stats.hp}</span></div>
          <div class="stat-bar-track"><div class="stat-bar-fill" style="width:${hpPct}%;background:${f.color}"></div></div>
        </div>
        <div class="stat-bar-item">
          <div class="stat-bar-head"><span>移速</span><span>${f.stats.speed}</span></div>
          <div class="stat-bar-track"><div class="stat-bar-fill" style="width:${spdPct}%;background:${f.color}"></div></div>
        </div>
        <div class="stat-bar-item">
          <div class="stat-bar-head"><span>跳跃</span><span>${f.stats.jump}</span></div>
          <div class="stat-bar-track"><div class="stat-bar-fill" style="width:${jmpPct}%;background:${f.color}"></div></div>
        </div>
      </div>
      <ul class="spotlight-moves">
        ${movesHtml}
      </ul>
    </div>
  `;
}

function updateSpotlights({ animateSlot = 0 } = {}) {
  const p1Id = activeSlot === 1 && hoveredId ? hoveredId : selectedP1;
  const p2Id = activeSlot === 2 && hoveredId ? hoveredId : selectedP2;
  renderSpotlight(p1Spotlight, 1, p1Id, {
    isPreview: activeSlot === 1 && Boolean(hoveredId) && hoveredId !== selectedP1,
    animatePop: animateSlot === 1
  });
  renderSpotlight(p2Spotlight, 2, p2Id, {
    isPreview: activeSlot === 2 && Boolean(hoveredId) && hoveredId !== selectedP2,
    animatePop: animateSlot === 2
  });
}

function updateKeyboardFocusAndPreview() {
  const visible = getVisibleFighters();
  const cards = rosterGrid.querySelectorAll('.poster-card');
  cards.forEach((card, idx) => {
    card.classList.toggle('kbd-focus', idx === kbdCursorIdx);
  });
  const focused = visible[kbdCursorIdx];
  if (focused) {
    hoveredId = focused.id;
    updateSpotlights();
  }
}

function renderSelectScreen({ animateSlot = 0 } = {}) {
  updateControlsHint();
  updateSpotlights({ animateSlot });

  rosterGrid.innerHTML = '';
  const visibleFighters = getVisibleFighters();
  if (kbdCursorIdx >= visibleFighters.length) kbdCursorIdx = 0;

  visibleFighters.forEach((fighter, idx) => {
    const isP1 = selectedP1 === fighter.id;
    const isP2 = selectedP2 === fighter.id;
    const justLocked = lastLockedId === fighter.id;
    const card = document.createElement('div');
    card.className = `poster-card ${isP1 ? 'pick-p1' : ''} ${isP2 ? 'pick-p2' : ''} ${justLocked ? 'just-locked' : ''}`;
    card.dataset.id = fighter.id;
    card.dataset.index = String(idx);

    card.innerHTML = `
      <div class="poster-thumb">
        ${createPosterImgHtml(fighter)}
        <div class="poster-tags">
          ${isP1 ? '<span class="poster-tag p1">1P</span>' : ''}
          ${isP2 ? '<span class="poster-tag p2">2P</span>' : ''}
        </div>
      </div>
      <div class="poster-footer">
        <strong style="color:${fighter.color}">${fighter.name}</strong>
        <span>${fighter.title}</span>
      </div>
    `;
    rosterGrid.appendChild(card);
  });
  lastLockedId = null;
}

function lockFighter(id) {
  if (activeSlot === 1) {
    selectedP1 = id;
  } else {
    selectedP2 = id;
  }
  lastLockedId = id;
  hoveredId = null;
  sfx.confirm();
  renderSelectScreen({ animateSlot: activeSlot });
}

rosterGrid.addEventListener('click', (e) => {
  const card = e.target.closest('.poster-card');
  if (!card) return;
  kbdCursorIdx = Number(card.dataset.index || 0);
  lockFighter(card.dataset.id);
});

rosterGrid.addEventListener('mouseover', (e) => {
  const card = e.target.closest('.poster-card');
  if (!card) return;
  const id = card.dataset.id;
  if (hoveredId !== id) {
    hoveredId = id;
    sfx.tick();
    updateSpotlights();
  }
});

rosterGrid.addEventListener('mouseleave', () => {
  if (hoveredId !== null) {
    hoveredId = null;
    updateSpotlights();
  }
});

p1Spotlight.addEventListener('click', () => setActiveSlot(1));
p2Spotlight.addEventListener('click', () => setActiveSlot(2));

function setActiveSlot(slot) {
  if (activeSlot !== slot) {
    sfx.tick();
  }
  activeSlot = slot;
  hoveredId = null;
  slotP1Btn.classList.toggle('active', slot === 1);
  slotP2Btn.classList.toggle('active', slot === 2);
  updateSpotlights();
}

function randomizeActiveSlot() {
  const visible = getVisibleFighters();
  const pick = visible[Math.floor(Math.random() * visible.length)];
  if (!pick) return;
  if (activeSlot === 1) selectedP1 = pick.id;
  else selectedP2 = pick.id;
  lastLockedId = pick.id;
  hoveredId = null;
  sfx.random();
  renderSelectScreen({ animateSlot: activeSlot });
}

function randomizeBothSlots() {
  const pool = getVisibleFighters();
  const p1Pick = pool[Math.floor(Math.random() * pool.length)];
  let p2Pick = pool[Math.floor(Math.random() * pool.length)];
  if (pool.length > 1 && p2Pick.id === p1Pick.id) {
    p2Pick = pool[(pool.indexOf(p1Pick) + 1) % pool.length];
  }
  selectedP1 = p1Pick.id;
  selectedP2 = p2Pick.id;
  hoveredId = null;
  sfx.random();
  renderSelectScreen({ animateSlot: 1 });
}

function swapSlots() {
  const tmp = selectedP1;
  selectedP1 = selectedP2;
  selectedP2 = tmp;
  hoveredId = null;
  sfx.swap();
  renderSelectScreen({ animateSlot: activeSlot });
}

slotP1Btn.addEventListener('click', () => setActiveSlot(1));
slotP2Btn.addEventListener('click', () => setActiveSlot(2));
randomPickBtn.addEventListener('click', randomizeActiveSlot);
randomBothBtn.addEventListener('click', randomizeBothSlots);
swapPickBtn.addEventListener('click', swapSlots);

groupFilter.addEventListener('click', (e) => {
  const btn = e.target.closest('.filter-btn');
  if (!btn) return;
  activeGroup = btn.dataset.group;
  for (const b of groupFilter.querySelectorAll('.filter-btn')) {
    b.classList.toggle('active', b === btn);
  }
  hoveredId = null;
  kbdCursorIdx = 0;
  sfx.tick();
  renderSelectScreen();
});

function enterSelectScreen(group = 'ALL') {
  activeGroup = group;
  for (const b of groupFilter.querySelectorAll('.filter-btn')) {
    b.classList.toggle('active', b.dataset.group === group);
  }
  gameState = 'SELECT';
  sfx.confirm();
  renderSelectScreen();
  switchScreen(selectScreen);
}

enterSelectBtn.addEventListener('click', () => enterSelectScreen('ALL'));

document.querySelectorAll('.cover-factions .faction-pill').forEach((pill) => {
  pill.addEventListener('click', () => {
    enterSelectScreen(pill.dataset.group || 'ALL');
  });
});

backCoverBtn.addEventListener('click', () => {
  sfx.tick();
  gameState = 'COVER';
  switchScreen(coverScreen);
});

function setPaused(value) {
  paused = value;
  pauseOverlay.hidden = !value;
  pauseOverlay.classList.toggle('hidden', !value);
  pauseBtn.textContent = value ? '▶ 继续' : '⏸ 暂停';
  if (value) resumeBtn.focus();
  else pauseBtn.focus();
  keysDown.clear();
  keysJustPressed.clear();
}
pauseBtn.addEventListener('click', () => setPaused(!paused));
resumeBtn.addEventListener('click', () => setPaused(false));
soundSetting.addEventListener('change', () => { sfx.muted = !soundSetting.checked; });
engine.showUltimateShowcase = showcaseSetting.checked;
showcaseSetting.addEventListener('change', () => { engine.showUltimateShowcase = showcaseSetting.checked; });

function clearVsTimers() {
  vsTimerIds.forEach((id) => clearTimeout(id));
  vsTimerIds = [];
}

function finishVsSplash() {
  if (gameState !== 'VS') return;
  clearVsTimers();
  vsOverlay.classList.add('hidden');
  startMatch();
}

function launchMatchWithVsSplash() {
  clearVsTimers();
  const m1 = getFighterMeta(selectedP1);
  const m2 = getFighterMeta(selectedP2);

  setImgWithFallback(document.getElementById('vs-p1-img'), m1);
  setImgWithFallback(document.getElementById('vs-p2-img'), m2);
  document.getElementById('vs-p1-name').textContent = m1.name;
  document.getElementById('vs-p1-title').textContent = m1.title;
  document.getElementById('vs-p2-name').textContent = m2.name;
  document.getElementById('vs-p2-title').textContent = m2.title;

  vsCountdown.textContent = 'READY!';
  vsOverlay.classList.remove('hidden');
  gameState = 'VS';
  sfx.start();

  vsTimerIds.push(
    setTimeout(() => {
      vsCountdown.textContent = 'FIGHT!';
    }, 650),
    setTimeout(() => {
      finishVsSplash();
    }, 1150)
  );
}

vsOverlay.addEventListener('click', finishVsSplash);

function startMatch() {
  finisher = null;
  showGameOverBanner(false);
  setPaused(false);
  updateControlsHint();
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

  setImgWithFallback(document.getElementById('p1-hud-avatar'), getFighterMeta(selectedP1));
  setImgWithFallback(document.getElementById('p2-hud-avatar'), getFighterMeta(selectedP2));

  matchTimer = 99;
  gameState = 'FIGHT';
  resultOverlay.classList.add('hidden');
  switchScreen(fightScreen);
  updateHud();
}

function updateHud() {
  const p1Pct = Math.max(0, (p1.hp / p1.maxHp) * 100);
  const p2Pct = Math.max(0, (p2.hp / p2.maxHp) * 100);

  document.getElementById('p1-hud-name').textContent = p1.name;
  document.getElementById('p1-hp-text').textContent = `${Math.ceil(p1.hp)} / ${p1.maxHp}`;
  document.getElementById('p1-hp-bar').style.width = `${p1Pct}%`;
  document.getElementById('p1-hp-trail').style.width = `${p1Pct}%`;
  document.getElementById('p1-ep-bar').style.width = `${(p1.ep / p1.maxEp) * 100}%`;
  document.getElementById('p1-ep-text').textContent = p1.ep >= 100
    ? `MAX! 按 ${['isfp', 'enfj'].includes(p1.id) ? 'O' : 'L'}` : `EP ${Math.floor(p1.ep)}%`;
  document.getElementById('p1-cd-text').textContent = p1.id === 'isfp'
    ? `U ${p1.paintCd > 0 ? p1.paintCd.toFixed(1) + 's' : 'READY'} · I ${p1.inspirationCd > 0 ? p1.inspirationCd.toFixed(1) + 's' : 'READY'}`
    : p1.id === 'enfj'
      ? `U ${p1.skillCd > 0 ? p1.skillCd.toFixed(1) + 's' : 'READY'} · I ${p1.buffTimer > 0 ? 'BUFF ' + p1.buffTimer.toFixed(1) + 's' : p1.buffCooldown > 0 ? p1.buffCooldown.toFixed(1) + 's' : 'READY'}`
    : (p1.skillCd > 0 ? `CD ${p1.skillCd.toFixed(1)}s` : 'SKILL READY');
  document.getElementById('hud-p1').classList.toggle('low-hp', p1Pct > 0 && p1Pct <= 25);
  document.getElementById('hud-p1').classList.toggle('ep-max', p1.ep >= 100);

  document.getElementById('p2-hud-name').textContent = p2.name;
  document.getElementById('p2-hp-text').textContent = `${Math.ceil(p2.hp)} / ${p2.maxHp}`;
  document.getElementById('p2-hp-bar').style.width = `${p2Pct}%`;
  document.getElementById('p2-hp-trail').style.width = `${p2Pct}%`;
  document.getElementById('p2-ep-bar').style.width = `${(p2.ep / p2.maxEp) * 100}%`;
  document.getElementById('p2-ep-text').textContent = p2.ep >= 100
    ? `MAX! 按 ${p2.id === 'enfj' ? '9' : ['isfp', 'enfj'].includes(p1.id) ? '小键盘 3' : 'O/3'}` : `EP ${Math.floor(p2.ep)}%`;
  document.getElementById('p2-cd-text').textContent = p2.id === 'enfj'
    ? `7 ${p2.skillCd > 0 ? p2.skillCd.toFixed(1) + 's' : 'READY'} · 8 ${p2.buffTimer > 0 ? 'BUFF ' + p2.buffTimer.toFixed(1) + 's' : p2.buffCooldown > 0 ? p2.buffCooldown.toFixed(1) + 's' : 'READY'}`
    : p2.skillCd > 0 ? `CD ${p2.skillCd.toFixed(1)}s` : 'SKILL READY';
  document.getElementById('hud-p2').classList.toggle('low-hp', p2Pct > 0 && p2Pct <= 25);
  document.getElementById('hud-p2').classList.toggle('ep-max', p2.ep >= 100);

  document.getElementById('match-timer').textContent = String(Math.ceil(matchTimer));
}

function finishMatch(winnerLabel, subtext, winnerId = null) {
  engine.finisherFighter = null;
  gameState = 'RESULT';
  sfx.ko();
  winnerText.textContent = winnerLabel;
  resultSubtext.textContent = subtext;
  if (winnerId) {
    setImgWithFallback(winnerPortrait, getFighterMeta(winnerId));
    winnerPortraitWrap.classList.remove('hidden');
  } else {
    winnerPortraitWrap.classList.add('hidden');
  }
  resultOverlay.classList.remove('hidden');
}

function advanceFinisher(dt) {
  const state = finisher;
  if (!state) return;
  if (state.phase === 'showcase') {
    state.winner.ultimateAnimTimer = Math.max(0, state.winner.ultimateAnimTimer - dt);
    state.winner.spriteAnimator?.update(dt, 'ultimate');
    if (state.winner.ultimateAnimTimer <= 0) {
      state.phase = 'gameover';
      state.elapsed = 0;
      showGameOverBanner(true);
    }
  } else if (state.phase === 'gameover') {
    state.elapsed += dt;
    if (state.elapsed >= 1) {
      showGameOverBanner(false);
      state.phase = 'animation';
      state.elapsed = 0;
      if (state.specialFinish) {
        state.winner.showFrame?.('finish', 0);
        engine.finisherFighter = state.winner;
      } else if (state.loser.id !== 'enfj') {
        state.loser.hiddenForFinisher = true;
      }
    }
  } else if (state.phase === 'animation') {
    state.elapsed += dt;
    if (state.specialFinish) state.winner.showFrame?.('finish', Math.min(23, Math.floor(state.elapsed * 15)));
    state.loser.showFrame?.('ko', Math.min(47, Math.floor(state.elapsed * 30)));
    if (state.elapsed >= 24 / 15) {
      if (state.specialFinish) state.winner.showFrame?.('finish', 23);
      state.phase = 'hold';
      state.elapsed = 0;
    }
  } else if (state.phase === 'hold') {
    state.elapsed += dt;
    if (state.elapsed >= 1) {
      const winner = state.winner;
      const tag = winner.playerIndex === 1 ? '1P' : '2P';
      finishMatch(`${tag} ${winner.name} WINS!`,
        state.specialFinish ? '耀光之后，仍以同理心致意。' : '战斗结束。', winner.id);
      finisher = null;
    }
  }
}

function gameLoop(timestamp) {
  if (!lastTime) lastTime = timestamp;
  const dt = Math.min(0.05, (timestamp - lastTime) / 1000);
  lastTime = timestamp;

  if (gameState === 'FIGHT' && !paused) {
    if (finisher) {
      advanceFinisher(dt);
      engine.render(p1, p2);
      updateHud();
    } else {
    const someoneInUlt = p1.ultimateAnimTimer > 0 || p2.ultimateAnimTimer > 0;
    if (!someoneInUlt) {
      matchTimer = Math.max(0, matchTimer - dt);
    }
    const p1Input = getPlayerInput(1);
    const p2Input = getPlayerInput(2);
    engine.update(dt, p1, p2, p1Input, p2Input);
    if (!finisher && (p1.hp <= 0 || p2.hp <= 0)) {
      const winner = p1.hp > 0 ? p1 : p2;
      const loser = winner === p1 ? p2 : p1;
      engine.projectiles = [];
      if (loser.id === 'enfj') {
        finisher = { winner, loser, phase: 'animation', elapsed: 0, specialFinish: false };
      } else {
        const tag = winner.playerIndex === 1 ? '1P' : '2P';
        finishMatch(`${tag} ${winner.name} WINS!`, '对手血量归零。', winner.id);
      }
    }
    engine.render(p1, p2);
    updateHud();

    // 已移除血量见底即结束的效果，确保完整大招画面可不受中断播放；仅在非大招期间且时间耗尽时结算
    if (!finisher && gameState === 'FIGHT' && matchTimer <= 0 && !someoneInUlt) {
      if (p1.hp === p2.hp) {
        finishMatch('TIME UP · DRAW!', '旗鼓相当的性格对决！', null);
      } else {
        const p1Wins = p1.hp > p2.hp;
        const win = p1Wins ? `1P ${p1.name}` : `2P ${p2.name}`;
        finishMatch(`${win} WINS!`, '时间耗尽，剩余血量更高者获胜！', p1Wins ? selectedP1 : selectedP2);
      }
    }
    }
  }

  keysJustPressed.clear();
  requestAnimationFrame(gameLoop);
}

startBtn.addEventListener('click', launchMatchWithVsSplash);
rematchBtn.addEventListener('click', launchMatchWithVsSplash);
backSelectBtn.addEventListener('click', () => {
  sfx.tick();
  gameState = 'SELECT';
  renderSelectScreen();
  switchScreen(selectScreen);
});

fillEpBtn.addEventListener('click', () => {
  if (!p1 || !p2) return;
  p1.ep = p1.maxEp;
  p2.ep = p2.maxEp;
  sfx.confirm();
  updateHud();
});

resetRoundBtn.addEventListener('click', () => {
  sfx.swap();
  startMatch();
});

fightBackSelectBtn.addEventListener('click', () => {
  sfx.tick();
  gameState = 'SELECT';
  renderSelectScreen();
  switchScreen(selectScreen);
});

renderCoverMarquee();
renderSelectScreen();
requestAnimationFrame(gameLoop);
