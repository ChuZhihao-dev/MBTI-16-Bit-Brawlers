export class GameEngine {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.arenaWidth = canvas.width;
    this.arenaHeight = canvas.height;
    this.groundY = canvas.height - 72;
    this.gravity = 1650;

    this.projectiles = [];
    this.floatingTexts = [];
    this.particles = [];
    this.hitstopFrames = 0;
    this.shakeTimer = 0;
    this.shakeIntensity = 0;
    this.onUltimateStart = null;
    this.portraitCache = new Map();
  }

  reset() {
    this.projectiles = [];
    this.floatingTexts = [];
    this.particles = [];
    this.hitstopFrames = 0;
    this.shakeTimer = 0;
    this.shakeIntensity = 0;
  }

  rectsOverlap(a, b) {
    return (
      a.x < b.x + b.width &&
      a.x + a.width > b.x &&
      a.y < b.y + b.height &&
      a.y + a.height > b.y
    );
  }

  triggerHitstop(frames) {
    this.hitstopFrames = Math.max(this.hitstopFrames, frames);
  }

  triggerShake(intensity, duration = 0.15) {
    this.shakeIntensity = Math.max(this.shakeIntensity, intensity);
    this.shakeTimer = Math.max(this.shakeTimer, duration);
  }

  spawnProjectile(proj) {
    this.projectiles.push({
      vx: 0,
      vy: 0,
      lifetime: 2,
      damage: 10,
      knockbackX: 220,
      knockbackY: -120,
      color: '#fde047',
      hitLabel: '',
      ...proj
    });
  }

  spawnFloatingText(x, y, text, color = '#0f172a') {
    this.floatingTexts.push({
      x,
      y,
      text,
      color,
      vy: -62,
      lifetime: 0.85,
      maxLifetime: 0.85
    });
  }

  spawnParticles(x, y, color = '#f97316', count = 8) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 90 + Math.random() * 240;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 80,
        size: 4 + Math.random() * 5,
        color,
        lifetime: 0.28 + Math.random() * 0.22,
        maxLifetime: 0.5
      });
    }
  }

  createContext() {
    return {
      arenaWidth: this.arenaWidth,
      arenaHeight: this.arenaHeight,
      groundY: this.groundY,
      gravity: this.gravity,
      rectsOverlap: this.rectsOverlap.bind(this),
      triggerHitstop: this.triggerHitstop.bind(this),
      triggerShake: this.triggerShake.bind(this),
      spawnProjectile: this.spawnProjectile.bind(this),
      spawnFloatingText: this.spawnFloatingText.bind(this),
      spawnParticles: this.spawnParticles.bind(this),
      onUltimateStart: (fighter) => {
        if (typeof this.onUltimateStart === 'function') {
          this.onUltimateStart(fighter);
        }
      }
    };
  }

  update(dt, p1, p2, p1Input, p2Input) {
    if (this.shakeTimer > 0) {
      this.shakeTimer = Math.max(0, this.shakeTimer - dt);
      if (this.shakeTimer === 0) this.shakeIntensity = 0;
    }

    // 顿帧期间冻结角色与飞行道具物理更新
    if (this.hitstopFrames > 0) {
      this.hitstopFrames -= 1;
      return;
    }

    const context = this.createContext();
    p1.update(dt, p1Input, p2, context);
    p2.update(dt, p2Input, p1, context);

    // 更新飞行道具与碰撞检测
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.lifetime -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;

      if (typeof p.update === 'function') {
        p.update(dt, context);
      }

      const target = p.owner === p1 ? p2 : p1;
      const box = { x: p.x, y: p.y, width: p.width, height: p.height };

      if (this.rectsOverlap(box, target.getHurtbox())) {
        if (typeof p.onHit === 'function') {
          p.onHit(target, context);
        } else {
          const dir = p.vx !== 0 ? Math.sign(p.vx) : p.owner.facing;
          target.takeDamage(p.damage, dir * p.knockbackX, p.knockbackY, p.owner, context, p.hitLabel);
        }
        if (!p.pierce) {
          this.projectiles.splice(i, 1);
          continue;
        }
      }

      if (p.lifetime <= 0 || p.x < -120 || p.x > this.arenaWidth + 120) {
        this.projectiles.splice(i, 1);
      }
    }

    // 更新梗文字弹幕
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.lifetime -= dt;
      ft.y += ft.vy * dt;
      if (ft.lifetime <= 0) {
        this.floatingTexts.splice(i, 1);
      }
    }

    // 更新打击粒子
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const pt = this.particles[i];
      pt.lifetime -= dt;
      pt.vy += 680 * dt;
      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt;
      if (pt.lifetime <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  render(p1, p2) {
    const ctx = this.ctx;
    ctx.save();

    // 屏幕震动偏移
    if (this.shakeTimer > 0) {
      const dx = (Math.random() - 0.5) * 2 * this.shakeIntensity;
      const dy = (Math.random() - 0.5) * 2 * this.shakeIntensity;
      ctx.translate(dx, dy);
    }

    this.drawArena(ctx);

    // 绘制飞行道具/陷阱
    for (const p of this.projectiles) {
      if (typeof p.draw === 'function') {
        p.draw(ctx);
      } else {
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x, p.y, p.width, p.height);
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 2;
        ctx.strokeRect(p.x, p.y, p.width, p.height);
      }
    }

    p1.draw(ctx);
    p2.draw(ctx);

    // 若任一角色正在释放终极奥义，叠加完整的大招演出特写画面
    const ultFighter = p1.ultimateAnimTimer > 0 ? p1 : (p2.ultimateAnimTimer > 0 ? p2 : null);
    if (ultFighter) {
      this.drawUltimateShowcase(ctx, ultFighter);
    }

    // 绘制打击像素粒子
    for (const pt of this.particles) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, pt.lifetime / pt.maxLifetime);
      ctx.fillStyle = pt.color;
      ctx.fillRect(pt.x - pt.size / 2, pt.y - pt.size / 2, pt.size, pt.size);
      ctx.restore();
    }

    // 绘制浮动文字特效（深色描边确保白底高对比可读）
    for (const ft of this.floatingTexts) {
      const alpha = Math.max(0, ft.lifetime / ft.maxLifetime);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.font = 'bold 16px monospace';
      ctx.textAlign = 'center';
      ctx.lineWidth = 4;
      ctx.strokeStyle = '#0f172a';
      ctx.strokeText(ft.text, ft.x, ft.y);
      ctx.fillStyle = ft.color;
      ctx.fillText(ft.text, ft.x, ft.y);
      ctx.restore();
    }

    ctx.restore();
  }

  drawArena(ctx) {
    // 明亮白底格斗舞台
    const grad = ctx.createLinearGradient(0, 0, 0, this.arenaHeight);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(1, '#f1f5f9');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, this.arenaWidth, this.arenaHeight);

    // 浅灰网格辅助线
    ctx.strokeStyle = 'rgba(15, 23, 42, 0.06)';
    ctx.lineWidth = 1;
    for (let x = 0; x < this.arenaWidth; x += 48) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, this.groundY);
      ctx.stroke();
    }
    for (let y = 0; y < this.groundY; y += 48) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(this.arenaWidth, y);
      ctx.stroke();
    }

    // 擂台地面
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(0, this.groundY, this.arenaWidth, this.arenaHeight - this.groundY);

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, this.groundY, this.arenaWidth, 4);
  }

  _getPortraitImage(path) {
    if (!path) return null;
    if (this.portraitCache.has(path)) {
      return this.portraitCache.get(path);
    }
    const img = new Image();
    img.src = path;
    this.portraitCache.set(path, img);
    return img;
  }

  /**
   * 明星大乱斗风格：完整大招播放演出画面（电影遮幅 + 集中线 + 中央放大播放全帧奥义动画）
   */
  drawUltimateShowcase(ctx, fighter) {
    const w = this.arenaWidth;
    const h = this.arenaHeight;
    const duration = Math.max(0.01, fighter.ultimateAnimDuration || 1.0);
    const progress = Math.min(1, Math.max(0, 1 - fighter.ultimateAnimTimer / duration));
    const cx = w / 2;
    const cy = h / 2 - 4;
    const now = performance.now() / 1000;

    ctx.save();

    // 1. 暗化舞台 + 角色主色径向聚光灯
    ctx.fillStyle = 'rgba(15, 23, 42, 0.72)';
    ctx.fillRect(0, 0, w, h);

    const glow = ctx.createRadialGradient(cx, cy, 24, cx, cy, 340);
    glow.addColorStop(0, 'rgba(255, 255, 255, 0.96)');
    glow.addColorStop(0.45, 'rgba(255, 255, 255, 0.52)');
    glow.addColorStop(0.75, `${fighter.color}55`);
    glow.addColorStop(1, 'rgba(15, 23, 42, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, w, h);

    // 2. 动态街机放射集中线
    ctx.save();
    ctx.translate(cx, cy);
    const rayCount = 24;
    for (let i = 0; i < rayCount; i++) {
      const angle = (i / rayCount) * Math.PI * 2 + now * 0.9;
      const innerR = 135 + Math.sin(now * 8 + i) * 14;
      const outerR = 540;
      ctx.beginPath();
      ctx.moveTo(Math.cos(angle) * innerR, Math.sin(angle) * innerR);
      ctx.lineTo(Math.cos(angle + 0.03) * outerR, Math.sin(angle + 0.03) * outerR);
      ctx.lineTo(Math.cos(angle - 0.03) * outerR, Math.sin(angle - 0.03) * outerR);
      ctx.closePath();
      ctx.fillStyle = i % 2 === 0 ? 'rgba(255, 255, 255, 0.16)' : `${fighter.color}44`;
      ctx.fill();
    }
    ctx.restore();

    // 3. 中央高清大招帧播放（优先播放角色专属 16 帧终极奥义精灵动画，无则展示官方立绘特写）
    const ultFrame = fighter.spriteAnimator && fighter.spriteAnimator.hasAnimation('ultimate')
      ? fighter.spriteAnimator.getCurrentFrame('ultimate')
      : null;

    ctx.save();
    ctx.translate(cx, cy);
    if (ultFrame) {
      // 聚光圆盘底衬，确保白底亮色细节在暗背景上清晰锐利
      ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
      ctx.strokeStyle = fighter.color;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(0, 4, 158, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.scale(fighter.facing, 1);
      const drawH = 292;
      const drawW = (ultFrame.width / ultFrame.height) * drawH;
      ctx.drawImage(ultFrame, -drawW / 2, -drawH / 2 + 4, drawW, drawH);
    } else {
      const portrait = this._getPortraitImage(fighter.posterPath);
      const scale = 1 + Math.sin(progress * Math.PI) * 0.08;
      ctx.scale(scale, scale);

      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = fighter.color;
      ctx.lineWidth = 6;
      ctx.fillRect(-102, -134, 204, 268);
      ctx.strokeRect(-102, -134, 204, 268);

      if (portrait && portrait.complete && portrait.naturalWidth > 0) {
        ctx.drawImage(portrait, -94, -126, 188, 252);
      }
    }
    ctx.restore();

    // 4. 电影上下黑边遮幅与奥义横幅
    const topBarH = 44;
    const botBarH = 54;
    ctx.fillStyle = '#090b12';
    ctx.fillRect(0, 0, w, topBarH);
    ctx.fillRect(0, h - botBarH, w, botBarH);

    // 彩色装饰分割线
    ctx.fillStyle = fighter.color;
    ctx.fillRect(0, topBarH - 3, w, 3);
    ctx.fillRect(0, h - botBarH, w, 3);

    // 顶部提示文字
    ctx.fillStyle = '#facc15';
    ctx.font = '900 16px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('★ FINAL SMASH // 终极奥义完整演出 ★', cx, 28);

    // 底部角色与奥义名
    const tag = fighter.playerIndex === 1 ? '1P' : '2P';
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 20px monospace';
    ctx.fillText(`${tag} ${fighter.name} · 【${fighter.ultimateName}】`, cx, h - 24);

    // 底部演出播放进度条
    const barW = 360;
    const barH = 6;
    const barX = cx - barW / 2;
    const barY = h - 13;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.fillRect(barX, barY, barW, barH);
    ctx.fillStyle = '#facc15';
    ctx.fillRect(barX, barY, barW * progress, barH);

    ctx.restore();
  }
}
