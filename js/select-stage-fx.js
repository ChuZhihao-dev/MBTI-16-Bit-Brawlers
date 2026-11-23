function hexToRgb(hex) {
  const clean = (hex || '#94a3b8').replace('#', '');
  const full = clean.length === 3
    ? clean.split('').map((c) => c + c).join('')
    : clean.padEnd(6, '0');
  const num = parseInt(full, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255
  };
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function lerpRgb(curr, target, t) {
  curr.r = lerp(curr.r, target.r, t);
  curr.g = lerp(curr.g, target.g, t);
  curr.b = lerp(curr.b, target.b, t);
}

function rgba(rgb, alpha) {
  return `rgba(${Math.round(rgb.r)}, ${Math.round(rgb.g)}, ${Math.round(rgb.b)}, ${alpha})`;
}

export function createSelectStageFX(canvas, bgImage) {
  if (!canvas) {
    return {
      setColors() {},
      triggerLockBurst() {},
      setPointer() {},
      updateAndDraw() {}
    };
  }
  const ctx = canvas.getContext('2d');
  let width = 0;
  let height = 0;
  let time = 0;

  const p1Color = hexToRgb('#7c3aed');
  const p1Target = hexToRgb('#7c3aed');
  const p2Color = hexToRgb('#10b981');
  const p2Target = hexToRgb('#10b981');

  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  const motes = [];
  const bursts = [];
  const ripples = [];

  function spawnMote(randomY = false) {
    const lane = Math.random();
    let xNorm;
    let side = 0;
    if (lane < 0.38) {
      xNorm = 0.16 + Math.random() * 0.22;
      side = 1;
    } else if (lane < 0.76) {
      xNorm = 0.62 + Math.random() * 0.22;
      side = 2;
    } else {
      xNorm = 0.08 + Math.random() * 0.84;
      side = 0;
    }
    return {
      xNorm,
      yNorm: randomY ? Math.random() : 0.78 + Math.random() * 0.12,
      vy: 0.025 + Math.random() * 0.045,
      size: 2.2 + Math.random() * 4.2,
      swayAmp: 0.004 + Math.random() * 0.008,
      swaySpeed: 0.7 + Math.random() * 1.1,
      phase: Math.random() * Math.PI * 2,
      rot: Math.random() * Math.PI,
      rotSpeed: (Math.random() - 0.5) * 0.8,
      side,
      isDiamond: Math.random() < 0.55,
      alpha: 0.25 + Math.random() * 0.5
    };
  }

  for (let i = 0; i < 48; i += 1) {
    motes.push(spawnMote(true));
  }

  const stageHost = canvas.closest('#select-screen');

  // 原画 select_bg.jpg 中左右聚光灯石台中心的归一化坐标 (u, v)
  const SPOT_U1 = 0.278;
  const SPOT_U2 = 0.722;
  const SPOT_V = 0.735;

  function computeCoverLayout(cssW, cssH) {
    const natW = bgImage?.naturalWidth || 1408;
    const natH = bgImage?.naturalHeight || 768;
    const scale = Math.max(cssW / natW, cssH / natH) * 1.035;
    const drawW = natW * scale;
    const drawH = natH * scale;
    const offsetX = (cssW - drawW) / 2;
    // 与 CSS object-position: center 82% 对齐，让石台略微上移，完整露出角色全身不被底部选人栏遮挡
    const offsetY = (cssH - drawH) * 0.82;
    return { offsetX, offsetY, drawW, drawH };
  }

  function resizeIfNeeded() {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const nextW = Math.max(1, Math.round(rect.width * dpr));
    const nextH = Math.max(1, Math.round(rect.height * dpr));
    if (nextW !== width || nextH !== height) {
      width = nextW;
      height = nextH;
      canvas.width = width;
      canvas.height = height;
    }
    return { dpr, cssW: rect.width, cssH: rect.height };
  }

  function drawSpotlightBeam(topL, topR, botL, botR, baseY, rgb, breath) {
    const grad = ctx.createLinearGradient(0, 0, 0, baseY);
    grad.addColorStop(0, rgba(rgb, 0.02));
    grad.addColorStop(0.5, rgba(rgb, 0.09 * breath));
    grad.addColorStop(1, rgba(rgb, 0.16 * breath));
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(topL, 0);
    ctx.lineTo(topR, 0);
    ctx.lineTo(botR, baseY);
    ctx.lineTo(botL, baseY);
    ctx.closePath();
    ctx.fill();
  }

  function drawPedestalRings(cx, cy, rx, ry, rgb, breath, dpr) {
    ctx.save();
    // 柔和地面光晕
    const radGrad = ctx.createRadialGradient(cx, cy, rx * 0.1, cx, cy, rx * 1.15);
    radGrad.addColorStop(0, rgba(rgb, 0.22 * breath));
    radGrad.addColorStop(0.65, rgba(rgb, 0.08 * breath));
    radGrad.addColorStop(1, rgba(rgb, 0));
    ctx.fillStyle = radGrad;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx * 1.15, ry * 1.35, 0, 0, Math.PI * 2);
    ctx.fill();

    // 精致细线同心椭圆环
    ctx.strokeStyle = rgba(rgb, 0.42 * breath);
    ctx.lineWidth = 1.5 * dpr;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = `rgba(255, 250, 235, ${0.55 * breath})`;
    ctx.lineWidth = 1 * dpr;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx * 0.72, ry * 0.72, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  function drawShard(x, y, size, rot, fillStyle, isDiamond) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.fillStyle = fillStyle;
    ctx.beginPath();
    if (isDiamond) {
      ctx.moveTo(0, -size);
      ctx.lineTo(size * 0.65, 0);
      ctx.lineTo(0, size);
      ctx.lineTo(-size * 0.65, 0);
    } else {
      ctx.moveTo(0, -size);
      ctx.lineTo(size * 0.85, size * 0.75);
      ctx.lineTo(-size * 0.85, size * 0.75);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  return {
    setColors(p1Hex, p2Hex) {
      if (p1Hex) Object.assign(p1Target, hexToRgb(p1Hex));
      if (p2Hex) Object.assign(p2Target, hexToRgb(p2Hex));
    },

    triggerLockBurst(playerIndex, hex) {
      const rgb = hexToRgb(hex);
      const cxNorm = playerIndex === 1 ? 0.275 : 0.725;
      const cyNorm = 0.74;
      ripples.push({
        cxNorm,
        cyNorm,
        progress: 0,
        duration: 0.65,
        rgb
      });
      for (let i = 0; i < 16; i += 1) {
        const angle = (Math.PI * 2 * i) / 16 + (Math.random() - 0.5) * 0.25;
        const speed = 0.08 + Math.random() * 0.16;
        bursts.push({
          xNorm: cxNorm + (Math.random() - 0.5) * 0.04,
          yNorm: cyNorm + (Math.random() - 0.5) * 0.02,
          vx: Math.cos(angle) * speed * 0.65,
          vy: Math.sin(angle) * speed * 0.45 - 0.09,
          size: 3 + Math.random() * 4.5,
          rot: Math.random() * Math.PI,
          rotSpeed: (Math.random() - 0.5) * 4,
          life: 0,
          maxLife: 0.55 + Math.random() * 0.35,
          rgb,
          isDiamond: i % 2 === 0
        });
      }
    },

    setPointer(nx, ny) {
      pointer.tx = Math.max(-1, Math.min(1, nx));
      pointer.ty = Math.max(-1, Math.min(1, ny));
    },

    updateAndDraw(dt) {
      const { dpr, cssW, cssH } = resizeIfNeeded();
      if (!width || !height || !cssW || !cssH) return;

      time += dt;
      const colorStep = Math.min(1, dt * 6);
      lerpRgb(p1Color, p1Target, colorStep);
      lerpRgb(p2Color, p2Target, colorStep);

      const pStep = Math.min(1, dt * 5);
      pointer.x = lerp(pointer.x, pointer.tx, pStep);
      pointer.y = lerp(pointer.y, pointer.ty, pStep);

      const shiftX = -pointer.x * 7;
      const shiftY = -pointer.y * 5;
      if (bgImage) {
        bgImage.style.transform = `scale(1.035) translate3d(${shiftX.toFixed(1)}px, ${shiftY.toFixed(1)}px, 0)`;
      }

      // 精确按 object-fit: cover 投影计算左右聚光灯石台在当前屏幕下的像素坐标
      const layout = computeCoverLayout(cssW, cssH);
      const p1CssX = layout.offsetX + layout.drawW * SPOT_U1 + shiftX;
      const p2CssX = layout.offsetX + layout.drawW * SPOT_U2 + shiftX;
      const spotCssY = layout.offsetY + layout.drawH * SPOT_V + shiftY;
      const charSize = Math.max(150, Math.min(310, layout.drawH * 0.34));

      if (stageHost) {
        stageHost.style.setProperty('--p1-spot-x', `${p1CssX.toFixed(1)}px`);
        stageHost.style.setProperty('--p2-spot-x', `${p2CssX.toFixed(1)}px`);
        stageHost.style.setProperty('--spot-y', `${spotCssY.toFixed(1)}px`);
        stageHost.style.setProperty('--spot-char-size', `${charSize.toFixed(1)}px`);
      }

      ctx.clearRect(0, 0, width, height);

      const p1X = p1CssX * dpr;
      const p2X = p2CssX * dpr;
      const baseY = spotCssY * dpr;
      const parallaxX = shiftX * dpr;
      const parallaxY = shiftY * dpr;
      const breath1 = 0.88 + Math.sin(time * 1.4) * 0.12;
      const breath2 = 0.88 + Math.sin(time * 1.4 + 1.6) * 0.12;

      // 1. 石台底座同心共振环（按 cover 投影动态锁定在原画聚光灯椭圆中心）
      const rx = layout.drawW * 0.108 * dpr;
      const ry = layout.drawH * 0.036 * dpr;
      drawPedestalRings(p1X, baseY, rx, ry, p1Color, breath1, dpr);
      drawPedestalRings(p2X, baseY, rx, ry, p2Color, breath2, dpr);

      // 2. 锁定瞬间的石台扩散涟漪
      for (let i = ripples.length - 1; i >= 0; i -= 1) {
        const r = ripples[i];
        r.progress += dt / r.duration;
        if (r.progress >= 1) {
          ripples.splice(i, 1);
          continue;
        }
        const ease = 1 - Math.pow(1 - r.progress, 3);
        const alpha = (1 - r.progress) * 0.65;
        const rCx = (layout.offsetX + layout.drawW * r.cxNorm + shiftX) * dpr;
        const rCy = (layout.offsetY + layout.drawH * r.cyNorm + shiftY) * dpr;
        ctx.save();
        ctx.strokeStyle = rgba(r.rgb, alpha);
        ctx.lineWidth = (2.5 - ease * 1.5) * dpr;
        ctx.beginPath();
        ctx.ellipse(
          rCx,
          rCy,
          rx * (0.8 + ease * 0.9),
          ry * (0.8 + ease * 1.1),
          0,
          0,
          Math.PI * 2
        );
        ctx.stroke();
        ctx.restore();
      }

      // 4. 空气中缓慢上升的低多边形光尘与微晶
      for (const m of motes) {
        m.yNorm -= m.vy * dt;
        m.rot += m.rotSpeed * dt;
        if (m.yNorm < 0.04) {
          Object.assign(m, spawnMote(false));
        }
        const fadeBottom = Math.min(1, Math.max(0, (0.84 - m.yNorm) / 0.14));
        const fadeTop = Math.min(1, Math.max(0, (m.yNorm - 0.05) / 0.16));
        const alpha = m.alpha * fadeBottom * fadeTop;
        if (alpha <= 0.01) continue;

        const x = (m.xNorm + Math.sin(time * m.swaySpeed + m.phase) * m.swayAmp) * width + parallaxX * 1.15;
        const y = m.yNorm * height + parallaxY * 1.15;
        const color = m.side === 1
          ? rgba(p1Color, alpha * 0.85)
          : m.side === 2
            ? rgba(p2Color, alpha * 0.85)
            : `rgba(254, 243, 199, ${alpha})`;
        drawShard(x, y, m.size * dpr, m.rot, color, m.isDiamond);
      }

      // 5. 锁定爆散几何微粒
      for (let i = bursts.length - 1; i >= 0; i -= 1) {
        const b = bursts[i];
        b.life += dt;
        if (b.life >= b.maxLife) {
          bursts.splice(i, 1);
          continue;
        }
        b.xNorm += b.vx * dt;
        b.yNorm += b.vy * dt;
        b.vy += 0.18 * dt;
        b.rot += b.rotSpeed * dt;
        const t = 1 - b.life / b.maxLife;
        drawShard(
          b.xNorm * width + parallaxX,
          b.yNorm * height + parallaxY,
          b.size * dpr * (0.4 + t * 0.6),
          b.rot,
          rgba(b.rgb, t * 0.85),
          b.isDiamond
        );
      }
    }
  };
}
