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
const resetBindingsBtn = document.getElementById('reset-bindings-btn');
const keybindingsGrid = document.getElementById('keybindings-grid');
const keybindingsStatus = document.getElementById('keybindings-status');
const gameOverBanner = document.getElementById('game-over-banner');
const enterSelectBtn = document.getElementById('enter-select-btn');
const singlePlayerBtn = document.getElementById('single-player-btn');
const twoPlayerBtn = document.getElementById('two-player-btn');
const coverSettingsBtn = document.getElementById('cover-settings-btn');
const coverModeNote = document.getElementById('cover-mode-note');
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

const KEY_BINDINGS_STORAGE_KEY = 'mbti_brawlers_key_bindings_v1';
const KEY_BINDING_ACTIONS = [
  { key: 'left', label: '向左移动' },
  { key: 'right', label: '向右移动' },
  { key: 'up', label: '跳跃' },
  { key: 'guard', label: '下蹲 / 防御' },
  { key: 'lightAttack', label: '普通攻击' },
  { key: 'heavyAttack', label: '角色性格技能' },
  { key: 'dash', label: '闪避 / 冲刺' },
  { key: 'skill1', label: '小技能 1' },
  { key: 'skill2', label: '小技能 2' },
  { key: 'ultimate', label: '终极奥义' }
];
const DEFAULT_KEY_BINDINGS = {
  1: {
    left: 'KeyA',
    right: 'KeyD',
    up: 'KeyW',
    guard: 'KeyS',
    lightAttack: 'KeyJ',
    heavyAttack: 'KeyK',
    dash: 'KeyL',
    skill1: 'KeyU',
    skill2: 'KeyI',
    ultimate: 'KeyO'
  },
  2: {
    left: 'ArrowLeft',
    right: 'ArrowRight',
    up: 'ArrowUp',
    guard: 'ArrowDown',
    lightAttack: 'Numpad1',
    heavyAttack: 'Numpad2',
    dash: 'Numpad3',
    skill1: 'Numpad4',
    skill2: 'Numpad5',
    ultimate: 'Numpad6'
  }
};

function loadKeyBindings() {
  const fallback = {
    1: { ...DEFAULT_KEY_BINDINGS[1] },
    2: { ...DEFAULT_KEY_BINDINGS[2] }
  };
  try {
    const raw = localStorage.getItem(KEY_BINDINGS_STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    for (const p of [1, 2]) {
      for (const { key } of KEY_BINDING_ACTIONS) {
        if (typeof parsed?.[p]?.[key] === 'string' && parsed[p][key]) {
          fallback[p][key] = parsed[p][key];
        }
      }
    }
  } catch {
    // Ignore storage errors and use defaults.
  }
  return fallback;
}

function saveKeyBindings() {
  try {
    localStorage.setItem(KEY_BINDINGS_STORAGE_KEY, JSON.stringify(keyBindings));
  } catch {
    // Ignore storage errors.
  }
}

let keyBindings = loadKeyBindings();
let listeningBinding = null;

function formatKeyCode(code, compact = false) {
  if (!code) return '?';
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  if (code.startsWith('Numpad')) return compact ? code.slice(6) : `小键盘 ${code.slice(6)}`;
  const map = {
    ArrowLeft: '←',
    ArrowRight: '→',
    ArrowUp: '↑',
    ArrowDown: '↓',
    Space: 'Space',
    ShiftLeft: 'L-Shift',
    ShiftRight: 'R-Shift',
    ControlLeft: 'L-Ctrl',
    ControlRight: 'R-Ctrl',
    AltLeft: 'L-Alt',
    AltRight: 'R-Alt',
    Enter: 'Enter',
    Semicolon: ';',
    Quote: "'",
    Comma: ',',
    Period: '.',
    Slash: '/',
    BracketLeft: '[',
    BracketRight: ']'
  };
  return map[code] || code;
}

function isCodeExplicitlyBound(code) {
  return [1, 2].some((p) => Object.values(keyBindings[p]).includes(code));
}

function renderKeybindingsUI(statusMessage = '点击任意按键即可自定义键位（按 Esc 取消）') {
  if (!keybindingsGrid) return;
  if (keybindingsStatus) {
    keybindingsStatus.textContent = listeningBinding
      ? `正在为 ${listeningBinding.player}P 设置「${listeningBinding.label}」，请按下新按键（Esc 取消）...`
      : statusMessage;
    keybindingsStatus.classList.toggle('is-listening', Boolean(listeningBinding));
  }
  keybindingsGrid.innerHTML = [1, 2].map((player) => {
    const rows = KEY_BINDING_ACTIONS.map(({ key, label }) => {
      const isListening = listeningBinding?.player === player && listeningBinding?.action === key;
      const codeLabel = isListening ? '请按键...' : formatKeyCode(keyBindings[player][key]);
      return `
        <div class="keybind-row">
          <span>${label}</span>
          <button
            class="keybind-btn${isListening ? ' listening' : ''}"
            type="button"
            data-player="${player}"
            data-action="${key}"
          >${codeLabel}</button>
        </div>
      `;
    }).join('');
    return `
      <div class="keybind-col">
        <h3 class="keybind-col-title">${player}P 按键设置</h3>
        ${rows}
      </div>
    `;
  }).join('');
}

const BLOCKED_KEYS = new Set([
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'Space'
]);

const GROUP_ORDER = { NT: 0, NF: 1, SJ: 2, SP: 3 };

function getVisibleFighters() {
  return FIGHTER_ROSTER
    .filter((f) => activeGroup === 'ALL' || f.group === activeGroup)
    .sort((a, b) => (GROUP_ORDER[a.group] ?? 9) - (GROUP_ORDER[b.group] ?? 9));
}

window.addEventListener('keydown', (e) => {
  if (paused && listeningBinding) {
    e.preventDefault();
    e.stopPropagation();
    if (e.code === 'Escape') {
      listeningBinding = null;
      renderKeybindingsUI();
      return;
    }
    const { player, action, label } = listeningBinding;
    const prevCode = keyBindings[player][action];
    for (const p of [1, 2]) {
      for (const item of KEY_BINDING_ACTIONS) {
        if ((p !== player || item.key !== action) && keyBindings[p][item.key] === e.code) {
          keyBindings[p][item.key] = prevCode;
        }
      }
    }
    keyBindings[player][action] = e.code;
    listeningBinding = null;
    saveKeyBindings();
    renderKeybindingsUI(`已将 ${player}P「${label}」绑定为 ${formatKeyCode(e.code)}`);
    updateControlsHint();
    return;
  }
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
  if (e.code === 'Escape' && paused) {
    setPaused(false);
    return;
  }
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
  const defaults = playerIndex === 1
    ? { left: 'KeyA', right: 'KeyD', up: 'KeyW', guard: 'KeyS', lightAttack: 'KeyJ', heavyAttack: 'KeyK', dash: 'KeyL', skill1: 'KeyU', skill2: 'KeyI', ultimate: 'KeyO' }
    : { left: 'ArrowLeft', right: 'ArrowRight', up: 'ArrowUp', guard: 'ArrowDown', lightAttack: 'Numpad1', heavyAttack: 'Numpad2', dash: 'Numpad3', skill1: 'Numpad4', skill2: 'Numpad5', ultimate: 'Numpad6' };
  const binds = (typeof keyBindings !== 'undefined' && keyBindings?.[playerIndex]) || defaults;
  const isBoundElsewhere = (code) => typeof isCodeExplicitlyBound === 'function' && isCodeExplicitlyBound(code);
  const check = (set, code) => {
    if (!code) return false;
    if (set.has(code)) return true;
    if (code.startsWith('Numpad')) {
      const digit = `Digit${code.slice(6)}`;
      if (!isBoundElsewhere(digit) && set.has(digit)) return true;
    }
    return false;
  };
  const down = (action) => check(keysDown, binds[action]);
  const pressed = (action) => check(keysJustPressed, binds[action]);
  const fighterId = playerIndex === 1 ? p1?.id : p2?.id;

  if (fighterId === 'isfp') {
    return {
      left: down('left'),
      right: down('right'),
      up: pressed('up'),
      lightAttack: pressed('lightAttack'),
      heavyAttack: pressed('heavyAttack'),
      dash: pressed('dash'),
      paintProjectile: pressed('skill1'),
      inspirationDash: pressed('skill2'),
      ultimate: pressed('ultimate')
    };
  }
  if (fighterId === 'enfj') {
    return {
      left: down('left'),
      right: down('right'),
      up: pressed('up'),
      guard: down('guard'),
      lightAttack: pressed('lightAttack'),
      heavyAttack: pressed('heavyAttack'),
      dash: pressed('dash'),
      rangedAttack: pressed('skill1'),
      special: pressed('skill2'),
      ultimate: pressed('ultimate')
    };
  }
  return {
    left: down('left'),
    right: down('right'),
    up: pressed('up'),
    guard: down('guard'),
    attack: pressed('lightAttack'),
    skill: pressed('heavyAttack') || pressed('skill1') || pressed('skill2'),
    ultimate: pressed('ultimate')
  };
}

function updateControlsHint() {
  const fmt = (player, action) => formatKeyCode(keyBindings[player][action], true);
  const p1Move = `${fmt(1, 'up')}${fmt(1, 'left')}${fmt(1, 'guard')}${fmt(1, 'right')}`;
  const p2Move = `${fmt(2, 'up')}${fmt(2, 'guard')}${fmt(2, 'left')}${fmt(2, 'right')}`;
  p1ControlsHint.innerHTML = `<strong>1P:</strong> ${p1Move} 移动 · ${fmt(1, 'lightAttack')} 普攻 · ${fmt(1, 'heavyAttack')} 性格技能 · ${fmt(1, 'dash')} 闪避 · ${fmt(1, 'skill1')}/${fmt(1, 'skill2')} 小技能 · ${fmt(1, 'ultimate')} 大招`;
  p2ControlsHint.innerHTML = `<strong>2P:</strong> ${p2Move} 移动 · ${fmt(2, 'lightAttack')} 普攻 · ${fmt(2, 'heavyAttack')} 性格技能 · ${fmt(2, 'dash')} 闪避 · ${fmt(2, 'skill1')}/${fmt(2, 'skill2')} 小技能 · ${fmt(2, 'ultimate')} 大招`;
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
  // Cover now displays the full-screen mbti-brawl.jpeg artwork.
}

const FACTION_GROUPS = [
  { id: 'NT', name: 'NT 分析家', cls: 'nt', color: '#7c3aed' },
  { id: 'NF', name: 'NF 外交家', cls: 'nf', color: '#10b981' },
  { id: 'SJ', name: 'SJ 守护者', cls: 'sj', color: '#3b82f6' },
  { id: 'SP', name: 'SP 探险家', cls: 'sp', color: '#d97706' }
];

function renderSpotlight(container, playerIndex, fighterId, { isPreview = false, animatePop = false } = {}) {
  const f = getFighterMeta(fighterId);
  const faction = FACTION_GROUPS.find((g) => g.id === f.group) || FACTION_GROUPS[0];
  const fmt = (action) => formatKeyCode(keyBindings[playerIndex][action], true);
  const movesHtml = fighterId === 'isfp'
    ? `<li><strong>[${fmt('lightAttack')}/${fmt('heavyAttack')}] 甩笔点刺 / 泼墨横扫：</strong>轻击可接重击。</li>
       <li><strong>[${fmt('dash')}] 闪避：</strong>朝移动方向或当前朝向滑步，初段短暂无敌。</li>
       <li><strong>[${fmt('skill1')}/${fmt('skill2')}] 颜料弹 / 彩绘突刺：</strong>中距离牵制或突进爆发。</li>
       <li><strong>[${fmt('ultimate')}] 万象泼彩狂想曲：</strong>聚能后释放大范围泼彩。</li>`
    : fighterId === 'enfj'
      ? `<li><strong>[${fmt('lightAttack')}/${fmt('heavyAttack')}] 耀光连斩 / 破阵重击：</strong>多段变化轻重攻击。</li>
         <li><strong>[${fmt('dash')}/${fmt('guard')}] 冲刺 / 格挡：</strong>快速突进无敌帧与正面格挡。</li>
         <li><strong>[${fmt('skill1')}/${fmt('skill2')}] 三连剑气 / 气焰共鸣：</strong>远程剑气与气焰强化。</li>
         <li><strong>[${fmt('ultimate')}] 耀光破阵斩：</strong>爆发全屏耀光斩击。</li>`
      : `<li><strong>[${fmt('lightAttack')} 普攻] ${f.moves.basic.name}：</strong>${f.moves.basic.desc}</li>
         <li><strong>[${fmt('heavyAttack')}/${fmt('skill1')}/${fmt('skill2')} 特技] ${f.moves.skill.name}：</strong>${f.moves.skill.desc}</li>
         <li><strong>[${fmt('ultimate')} 奥义] ${f.moves.ultimate.name}：</strong>${f.moves.ultimate.desc}</li>`;
  const tag = playerIndex === 1 ? '1P' : '2P';
  const cls = playerIndex === 1 ? 'p1' : 'p2';
  container.classList.toggle('active-slot', activeSlot === playerIndex);
  container.classList.toggle('previewing', isPreview);

  const hpPct = Math.min(100, Math.round((f.stats.hp / 140) * 100));
  const spdPct = Math.min(100, Math.round((f.stats.speed / 360) * 100));
  const jmpPct = Math.min(100, Math.round((f.stats.jump / 700) * 100));

  const posterHtml = `
    <div class="spotlight-poster ${animatePop ? 'pop' : ''}" style="--fighter-color:${f.color}">
      ${createPosterImgHtml(f)}
      <span class="spotlight-slot-ribbon ${cls}">${tag}${isPreview ? ' 预览' : ' 已选'}</span>
    </div>
  `;
  const infoHtml = `
    <div class="spotlight-info">
      <div class="spotlight-head">
        <span class="badge ${cls}">${tag}</span>
        <span class="spotlight-name" style="color:${f.color}">${f.name}</span>
        <span class="spotlight-faction ${faction.cls}">${faction.name}</span>
      </div>
      <div class="spotlight-subtitle">${f.title}</div>
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

  container.innerHTML = playerIndex === 1 ? `${posterHtml}${infoHtml}` : `${infoHtml}${posterHtml}`;
}

function updateSpotlights({ animateSlot = 0 } = {}) {
  const p1Id = activeSlot === 1 && hoveredId ? hoveredId : selectedP1;
  const p2Id = activeSlot === 2 && hoveredId ? hoveredId : selectedP2;
  const m1 = getFighterMeta(p1Id);
  const m2 = getFighterMeta(p2Id);
  selectScreen.style.setProperty('--p1-color', m1.color);
  selectScreen.style.setProperty('--p2-color', m2.color);
  const wm1 = document.getElementById('stage-wm-p1');
  const wm2 = document.getElementById('stage-wm-p2');
  if (wm1) wm1.textContent = m1.name;
  if (wm2) wm2.textContent = m2.name;
  if (animateSlot === 1 || animateSlot === 2) {
    const cls = `stage-impact-p${animateSlot}`;
    selectScreen.classList.remove('stage-impact-p1', 'stage-impact-p2');
    void selectScreen.offsetWidth;
    selectScreen.classList.add(cls);
  }
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

  const groupsToShow = FACTION_GROUPS.filter(
    (g) => activeGroup === 'ALL' || g.id === activeGroup
  );
  rosterGrid.classList.toggle('is-single-group', groupsToShow.length === 1);

  let cardIndex = 0;
  groupsToShow.forEach((group) => {
    const members = visibleFighters.filter((f) => f.group === group.id);
    if (!members.length) return;

    const section = document.createElement('div');
    section.className = `faction-group ${group.cls}`;

    const header = document.createElement('div');
    header.className = 'faction-group-header';
    header.innerHTML = `
      <span class="faction-dot" style="background:${group.color}"></span>
      <strong>${group.name}</strong>
      <span class="faction-count">${members.length} 人</span>
    `;
    section.appendChild(header);

    const cardsWrap = document.createElement('div');
    cardsWrap.className = 'faction-cards';

    const fanAngles = [-7, -2.5, 2.5, 7];
    const fanLifts = [10, 0, 0, 10];
    members.forEach((fighter, memberIdx) => {
      const isP1 = selectedP1 === fighter.id;
      const isP2 = selectedP2 === fighter.id;
      const justLocked = lastLockedId === fighter.id;
      const card = document.createElement('div');
      card.className = `poster-card ${isP1 ? 'pick-p1' : ''} ${isP2 ? 'pick-p2' : ''} ${justLocked ? 'just-locked' : ''}`;
      card.dataset.id = fighter.id;
      card.dataset.index = String(cardIndex);
      card.style.setProperty('--fan-rot', `${fanAngles[memberIdx] ?? 0}deg`);
      card.style.setProperty('--fan-y', `${fanLifts[memberIdx] ?? 0}px`);
      card.style.setProperty('--card-color', fighter.color);
      card.style.setProperty('--enter-delay', `${cardIndex * 28}ms`);
      cardIndex += 1;

      card.innerHTML = `
        <div class="poster-thumb">
          ${createPosterImgHtml(fighter)}
          <div class="poster-sheen" aria-hidden="true"></div>
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
      cardsWrap.appendChild(card);
    });

    section.appendChild(cardsWrap);
    rosterGrid.appendChild(section);
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
twoPlayerBtn?.addEventListener('click', () => enterSelectScreen('ALL'));
singlePlayerBtn?.addEventListener('click', () => {
  sfx.tick();
  if (coverModeNote) {
    coverModeNote.textContent = '单人 AI 模式正在开发中，请先选择「双人模式」或「开始游戏」体验本地对战';
    coverModeNote.hidden = false;
    coverModeNote.classList.remove('hidden');
  }
});
coverSettingsBtn?.addEventListener('click', () => {
  sfx.tick();
  setPaused(true);
});

backCoverBtn.addEventListener('click', () => {
  sfx.tick();
  gameState = 'COVER';
  switchScreen(coverScreen);
});

function setPaused(value) {
  paused = value;
  listeningBinding = null;
  pauseOverlay.hidden = !value;
  pauseOverlay.classList.toggle('hidden', !value);
  pauseBtn.textContent = value ? '▶ 继续' : '⏸ 暂停';
  if (value) {
    renderKeybindingsUI();
    resumeBtn.focus();
  } else {
    pauseBtn.focus();
  }
  keysDown.clear();
  keysJustPressed.clear();
}
pauseBtn.addEventListener('click', () => setPaused(!paused));
resumeBtn.addEventListener('click', () => setPaused(false));
keybindingsGrid?.addEventListener('click', (e) => {
  const btn = e.target.closest('.keybind-btn');
  if (!btn) return;
  const player = Number(btn.dataset.player);
  const action = btn.dataset.action;
  const item = KEY_BINDING_ACTIONS.find((entry) => entry.key === action);
  if (!item) return;
  sfx.tick();
  listeningBinding = { player, action, label: item.label };
  renderKeybindingsUI();
});
resetBindingsBtn?.addEventListener('click', () => {
  sfx.tick();
  keyBindings = {
    1: { ...DEFAULT_KEY_BINDINGS[1] },
    2: { ...DEFAULT_KEY_BINDINGS[2] }
  };
  listeningBinding = null;
  saveKeyBindings();
  renderKeybindingsUI('已恢复默认按键设置');
  updateControlsHint();
});
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
    ? `MAX! 按 ${['isfp', 'enfj'].includes(p2.id) ? '9' : ['isfp', 'enfj'].includes(p1.id) ? '小键盘 3' : 'O/3'}` : `EP ${Math.floor(p2.ep)}%`;
  document.getElementById('p2-cd-text').textContent = p2.id === 'isfp'
    ? `7 ${p2.paintCd > 0 ? p2.paintCd.toFixed(1) + 's' : 'READY'} · 8 ${p2.inspirationCd > 0 ? p2.inspirationCd.toFixed(1) + 's' : 'READY'}`
    : p2.id === 'enfj'
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
