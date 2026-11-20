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
    this.hitstopFrames = 0;
    this.shakeTimer = 0;
    this.shakeIntensity = 0;
  }

  reset() {
    this.projectiles = [];
    this.floatingTexts = [];
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

  spawnFloatingText(x, y, text, color = '#ffffff') {
    this.floatingTexts.push({
      x,
      y,
      text,
      color,
      vy: -55,
      lifetime: 0.85,
      maxLifetime: 0.85
    });
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
      spawnFloatingText: this.spawnFloatingText.bind(this)
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

    // 绘制浮动文字特效
    for (const ft of this.floatingTexts) {
      const alpha = Math.max(0, ft.lifetime / ft.maxLifetime);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.font = 'bold 16px monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#090b12';
      ctx.fillText(ft.text, ft.x + 2, ft.y + 2);
      ctx.fillStyle = ft.color;
      ctx.fillText(ft.text, ft.x, ft.y);
      ctx.restore();
    }

    ctx.restore();
  }

  drawArena(ctx) {
    // 夜空渐变背景
    const grad = ctx.createLinearGradient(0, 0, 0, this.arenaHeight);
    grad.addColorStop(0, '#0f1326');
    grad.addColorStop(1, '#1e2445');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, this.arenaWidth, this.arenaHeight);

    // 复古网格装饰
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.08)';
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
    ctx.fillStyle = '#181c33';
    ctx.fillRect(0, this.groundY, this.arenaWidth, this.arenaHeight - this.groundY);

    ctx.fillStyle = '#7c3aed';
    ctx.fillRect(0, this.groundY, this.arenaWidth, 4);
  }
}
