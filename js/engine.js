import { STAGES, DEFAULT_STAGE_ID } from './stages.js';
import { sfx } from './sfx.js';

export class GameEngine {
  constructor(canvas, stageId = DEFAULT_STAGE_ID) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.stage = STAGES[stageId] || STAGES[DEFAULT_STAGE_ID];
    this.arenaWidth = this.stage.width;
    this.arenaHeight = this.stage.height;
    this.groundY = this.stage.groundY;
    this.stageLeft = this.stage.stageLeft;
    this.stageRight = this.stage.stageRight;
    this.platforms = this.stage.platforms || [];
    this.gravity = 1650;

    this.stageBgImage = new Image();
    this.stageBgLoaded = false;
    this.stageBgImage.onload = () => {
      this.stageBgLoaded = true;
    };
    this.stageBgImage.src = this.stage.backgroundSrc;

    // 动态跟随缩放摄像机（大乱斗风格）
    this.camera = {
      x: this.arenaWidth / 2,
      y: this.groundY - 120,
      zoom: 1.15
    };

    this.projectiles = [];
    this.floatingTexts = [];
    this.particles = [];
    this.hitSparks = [];
    this.afterimages = [];
    this.hitstopFrames = 0;
    this.shakeTimer = 0;
    this.shakeDuration = 0.15;
    this.shakeIntensity = 0;
    this.shakeDirX = 0;
    this.shakeDirY = 0;
    this.onUltimateStart = null;
    this.onUltimateKo = null;
    this.showUltimateShowcase = true;
    this.finisherFighter = null;
    this.portraitCache = new Map();
  }

  reset() {
    this.projectiles = [];
    this.floatingTexts = [];
    this.particles = [];
    this.hitSparks = [];
    this.afterimages = [];
    this.hitstopFrames = 0;
    this.shakeTimer = 0;
    this.shakeDuration = 0.15;
    this.shakeIntensity = 0;
    this.shakeDirX = 0;
    this.shakeDirY = 0;
    this.finisherFighter = null;
    this.camera = {
      x: this.arenaWidth / 2,
      y: this.groundY - 120,
      zoom: 1.15
    };
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

  triggerShake(intensity, duration = 0.15, dirX = 0, dirY = 0) {
    this.shakeIntensity = Math.max(this.shakeIntensity, intensity);
    this.shakeTimer = Math.max(this.shakeTimer, duration);
    this.shakeDuration = Math.max(this.shakeDuration || duration, duration);
    if (dirX !== 0 || dirY !== 0) {
      this.shakeDirX = dirX;
      this.shakeDirY = dirY;
    }
  }

  spawnHitSpark(x, y, color = '#fde047', kind = 'light', dirX = 1) {
    const isHeavy = kind === 'heavy' || kind === 'ultimate';
    const isGuard = kind === 'guard';
    const maxLife = isHeavy ? 0.24 : isGuard ? 0.2 : 0.16;
    this.hitSparks.push({
      x,
      y,
      color,
      kind,
      dirX: dirX || 1,
      rotation: (Math.random() - 0.5) * 0.8,
      maxRadius: kind === 'ultimate' ? 88 : isHeavy ? 62 : isGuard ? 46 : 38,
      life: 0,
      maxLife
    });
  }

  spawnAfterimage(fighter, color = fighter.color) {
    const frame = fighter.spriteAnimator?.getCurrentFrame(fighter.animState);
    if (!frame) return;
    const drawH = Math.min(frame.height, fighter.spriteHeight)
      * (fighter.getSpriteRenderScale?.(frame) ?? 1);
    const drawW = (frame.width / frame.height) * drawH;
    this.afterimages.push({
      frame,
      x: fighter.getCenterX(),
      y: fighter.getCenterY(),
      halfH: fighter.height / 2,
      footOffset: fighter.spriteFootOffset,
      drawW,
      drawH,
      facing: fighter.facing,
      color,
      life: 0,
      maxLife: 0.18
    });
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
      stageLeft: this.stageLeft,
      stageRight: this.stageRight,
      platforms: this.platforms,
      gravity: this.gravity,
      rectsOverlap: this.rectsOverlap.bind(this),
      triggerHitstop: this.triggerHitstop.bind(this),
      triggerShake: this.triggerShake.bind(this),
      spawnProjectile: this.spawnProjectile.bind(this),
      spawnFloatingText: this.spawnFloatingText.bind(this),
      spawnParticles: this.spawnParticles.bind(this),
      spawnHitSpark: this.spawnHitSpark.bind(this),
      spawnAfterimage: this.spawnAfterimage.bind(this),
      sfx,
      onUltimateStart: (fighter) => {
        if (typeof this.onUltimateStart === 'function') {
          this.onUltimateStart(fighter);
        }
      },
      onUltimateKo: (winner, loser) => this.onUltimateKo?.(winner, loser)
    };
  }

  update(dt, p1, p2, p1Input, p2Input) {
    if (this.shakeTimer > 0) {
      this.shakeTimer = Math.max(0, this.shakeTimer - dt);
      if (this.shakeTimer === 0) {
        this.shakeIntensity = 0;
        this.shakeDirX = 0;
        this.shakeDirY = 0;
      }
    }

    // 顿帧期间推进命中星芒与残影，并让受击方保持高频微颤（拳拳到肉的核心）
    for (let i = this.hitSparks.length - 1; i >= 0; i--) {
      this.hitSparks[i].life += dt;
      if (this.hitSparks[i].life >= this.hitSparks[i].maxLife) {
        this.hitSparks.splice(i, 1);
      }
    }
    for (let i = this.afterimages.length - 1; i >= 0; i--) {
      this.afterimages[i].life += dt;
      if (this.afterimages[i].life >= this.afterimages[i].maxLife) {
        this.afterimages.splice(i, 1);
      }
    }

    // 顿帧期间冻结角色与飞行道具物理更新
    if (this.hitstopFrames > 0) {
      this.hitstopFrames -= 1;
      return;
    }

    const context = this.createContext();
    p1.update(dt, p1Input, p2, context);
    p2.update(dt, p2Input, p1, context);
    this._updateCamera(dt, p1, p2);

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

  _updateCamera(dt, p1, p2) {
    if (!p1 || !p2) return;
    const midX = (p1.getCenterX() + p2.getCenterX()) / 2;
    const midY = (p1.getCenterY() + p2.getCenterY()) / 2 - 42;
    const distX = Math.abs(p1.getCenterX() - p2.getCenterX());
    const distY = Math.abs(p1.getCenterY() - p2.getCenterY());

    // 贴身时拉近增强打击感，拉开距离时平滑拉远容纳全图与高低台
    const distFactor = Math.max(distX / 900, distY / 380);
    const targetZoom = Math.max(1.0, Math.min(1.36, 1.38 - distFactor * 0.42));

    const smooth = 1 - Math.exp(-7.5 * dt);
    this.camera.x += (midX - this.camera.x) * smooth;
    this.camera.y += (midY - this.camera.y) * smooth;
    this.camera.zoom += (targetZoom - this.camera.zoom) * smooth;
  }

  _syncViewport() {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const targetW = Math.max(1, Math.round(rect.width * dpr));
    const targetH = Math.max(1, Math.round(rect.height * dpr));
    if (this.canvas.width !== targetW || this.canvas.height !== targetH) {
      this.canvas.width = targetW;
      this.canvas.height = targetH;
    }
    // 保证任意屏幕比例下都完全铺满全屏（cover 基准 * 动态缩放）
    const baseScale = Math.max(targetW / this.arenaWidth, targetH / this.arenaHeight);
    const scale = baseScale * this.camera.zoom;
    const visibleWorldW = targetW / scale;
    const visibleWorldH = targetH / scale;

    const minCamX = visibleWorldW / 2;
    const maxCamX = this.arenaWidth - visibleWorldW / 2;
    const minCamY = visibleWorldH / 2;
    const maxCamY = this.arenaHeight - visibleWorldH / 2;

    const camX = minCamX < maxCamX
      ? Math.max(minCamX, Math.min(maxCamX, this.camera.x))
      : this.arenaWidth / 2;
    const camY = minCamY < maxCamY
      ? Math.max(minCamY, Math.min(maxCamY, this.camera.y))
      : this.arenaHeight / 2;

    const offsetX = targetW / 2 - camX * scale;
    const offsetY = targetH / 2 - camY * scale;
    return { viewW: targetW, viewH: targetH, scale, offsetX, offsetY };
  }

  render(p1, p2) {
    const ctx = this.ctx;
    const { viewW, viewH, scale, offsetX, offsetY } = this._syncViewport();

    ctx.save();
    // 1. 映射到动态跟随摄像机的超大画幅世界坐标系
    ctx.translate(offsetX, offsetY);
    ctx.scale(scale, scale);

    // 方向性衰减震屏（首帧沿攻击方向强烈冲击，随后阻尼回弹）
    if (this.shakeTimer > 0) {
      const progress = this.shakeTimer / Math.max(0.01, this.shakeDuration || 0.15);
      const mag = this.shakeIntensity * progress;
      const impulse = Math.sin(progress * Math.PI * 5);
      const dx = this.shakeDirX !== 0
        ? this.shakeDirX * mag * impulse * 0.9 + (Math.random() - 0.5) * mag * 0.6
        : (Math.random() - 0.5) * 2 * mag;
      const dy = this.shakeDirY !== 0
        ? this.shakeDirY * mag * impulse * 0.6 + (Math.random() - 0.5) * mag * 0.7
        : (Math.random() - 0.5) * 2 * mag;
      ctx.translate(dx, dy);
    }

    this.drawArena(ctx);

    // 冲刺/爆发残影层（位于角色后方）
    for (const ghost of this.afterimages) {
      const t = 1 - ghost.life / ghost.maxLife;
      ctx.save();
      ctx.translate(ghost.x, ghost.y);
      ctx.scale(ghost.facing, 1);
      ctx.globalAlpha = t * 0.38;
      ctx.filter = 'brightness(1.35) saturate(1.4)';
      ctx.drawImage(
        ghost.frame,
        -ghost.drawW / 2,
        ghost.halfH - ghost.drawH + ghost.footOffset,
        ghost.drawW,
        ghost.drawH
      );
      ctx.restore();
    }

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

    if (!p1.hiddenForFinisher) p1.draw(ctx);
    if (!p2.hiddenForFinisher) p2.draw(ctx);

    // 绘制命中十字星芒 + 扩散冲击波圆环 + 方向性斩击线
    for (const sp of this.hitSparks) {
      const progress = sp.life / sp.maxLife;
      const ease = 1 - Math.pow(1 - progress, 3);
      const alpha = Math.max(0, 1 - progress);
      const radius = sp.maxRadius * (0.28 + ease * 0.72);
      ctx.save();
      ctx.translate(sp.x, sp.y);

      // 1. 扩散冲击波圆环
      ctx.strokeStyle = sp.kind === 'guard' ? '#38bdf8' : sp.color;
      ctx.globalAlpha = alpha * 0.85;
      ctx.lineWidth = (sp.kind === 'heavy' || sp.kind === 'ultimate' ? 5 : 3) * (1 - progress * 0.65);
      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, Math.PI * 2);
      ctx.stroke();

      // 2. 格斗游戏标志性十字星芒闪光
      if (sp.kind !== 'guard') {
        ctx.save();
        ctx.rotate(sp.rotation);
        const arm = radius * 1.15;
        const thick = Math.max(2, (sp.kind === 'light' ? 5 : 9) * (1 - progress));
        ctx.fillStyle = '#ffffff';
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.moveTo(0, -arm);
        ctx.lineTo(thick, -thick);
        ctx.lineTo(arm, 0);
        ctx.lineTo(thick, thick);
        ctx.lineTo(0, arm);
        ctx.lineTo(-thick, thick);
        ctx.lineTo(-arm, 0);
        ctx.lineTo(-thick, -thick);
        ctx.closePath();
        ctx.fill();

        // 方向性斜向斩击高光线
        ctx.strokeStyle = sp.color;
        ctx.lineWidth = thick * 0.9;
        ctx.beginPath();
        ctx.moveTo(-sp.dirX * radius * 0.8, -radius * 0.45);
        ctx.lineTo(sp.dirX * radius * 1.3, radius * 0.45);
        ctx.stroke();
        ctx.restore();
      } else {
        // 格挡内圈高亮环
        ctx.strokeStyle = '#ffffff';
        ctx.globalAlpha = alpha;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, radius * 0.62, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    }

    // 绘制打击像素粒子
    for (const pt of this.particles) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, pt.lifetime / pt.maxLifetime);
      ctx.fillStyle = pt.color;
      ctx.fillRect(pt.x - pt.size / 2, pt.y - pt.size / 2, pt.size, pt.size);
      ctx.restore();
    }

    // 绘制浮动文字特效（深色描边确保高对比可读）
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

    // 屏幕空间全屏特写层（脱离动态摄像机缩放与平移，始终居中满屏显示）
    const ultFighter = p1.ultimateAnimTimer > 0 ? p1 : (p2.ultimateAnimTimer > 0 ? p2 : null);
    if ((ultFighter && this.showUltimateShowcase) || this.finisherFighter) {
      const uiScale = Math.min(viewW / 960, viewH / 540);
      const uiOffsetX = (viewW - 960 * uiScale) / 2;
      const uiOffsetY = (viewH - 540 * uiScale) / 2;
      ctx.save();
      if (ultFighter && this.showUltimateShowcase) {
        ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
        ctx.fillRect(0, 0, viewW, viewH);
      } else if (this.finisherFighter) {
        ctx.fillStyle = 'rgba(247, 253, 246, 0.96)';
        ctx.fillRect(0, 0, viewW, viewH);
      }
      ctx.translate(uiOffsetX, uiOffsetY);
      ctx.scale(uiScale, uiScale);
      const prevW = this.arenaWidth;
      const prevH = this.arenaHeight;
      const prevG = this.groundY;
      this.arenaWidth = 960;
      this.arenaHeight = 540;
      this.groundY = 468;
      if (ultFighter && this.showUltimateShowcase) {
        this.drawUltimateShowcase(ctx, ultFighter);
      }
      if (this.finisherFighter) {
        this.drawFinisherShowcase(ctx, this.finisherFighter);
      }
      this.arenaWidth = prevW;
      this.arenaHeight = prevH;
      this.groundY = prevG;
      ctx.restore();
    }
  }

  drawFinisherShowcase(ctx, fighter) {
    const frame = fighter.spriteAnimator?.getCurrentFrame('finish');
    if (!frame) return;
    ctx.save();
    ctx.fillStyle = 'rgba(247, 253, 246, 0.94)';
    ctx.fillRect(0, 0, this.arenaWidth, this.arenaHeight);
    ctx.translate(this.arenaWidth / 2, this.groundY);
    ctx.scale(fighter.facing, 1);
    const height = 300;
    const width = frame.width / frame.height * height;
    ctx.drawImage(frame, -width / 2, -height, width, height);
    ctx.restore();
    ctx.save();
    ctx.textAlign = 'center';
    ctx.fillStyle = '#166534';
    ctx.font = 'bold 24px monospace';
    ctx.fillText('ENFJ · 同理心送花', this.arenaWidth / 2, 52);
    ctx.restore();
  }

  drawFullViewportBackdrop(ctx, viewW, viewH, screenGroundY) {
    // 明亮低多边形天空渐变（彻底去除网格）
    const skyGrad = ctx.createLinearGradient(0, 0, 0, screenGroundY);
    skyGrad.addColorStop(0, '#c8edf2');
    skyGrad.addColorStop(0.55, '#eef8f6');
    skyGrad.addColorStop(1, '#fff8e8');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, viewW, screenGroundY);

    // 远景柔和低多边形山峦剪影
    ctx.fillStyle = 'rgba(148, 163, 184, 0.16)';
    ctx.beginPath();
    ctx.moveTo(0, screenGroundY);
    ctx.lineTo(viewW * 0.14, screenGroundY * 0.62);
    ctx.lineTo(viewW * 0.28, screenGroundY * 0.8);
    ctx.lineTo(viewW * 0.45, screenGroundY * 0.58);
    ctx.lineTo(viewW * 0.63, screenGroundY * 0.78);
    ctx.lineTo(viewW * 0.82, screenGroundY * 0.56);
    ctx.lineTo(viewW, screenGroundY * 0.74);
    ctx.lineTo(viewW, screenGroundY);
    ctx.closePath();
    ctx.fill();

    // 全屏延展石质地面
    const floorGrad = ctx.createLinearGradient(0, screenGroundY, 0, viewH);
    floorGrad.addColorStop(0, '#d6cfc2');
    floorGrad.addColorStop(0.22, '#bfb6a6');
    floorGrad.addColorStop(1, '#8d8476');
    ctx.fillStyle = floorGrad;
    ctx.fillRect(0, screenGroundY, viewW, viewH - screenGroundY);

    // 地面高光沿线
    ctx.fillStyle = '#f5f0e6';
    ctx.fillRect(0, screenGroundY, viewW, 3);
    ctx.fillStyle = 'rgba(15, 23, 42, 0.28)';
    ctx.fillRect(0, screenGroundY + 3, viewW, 2);
  }

  drawArena(ctx) {
    if (this.stageBgLoaded) {
      ctx.drawImage(this.stageBgImage, 0, 0, this.arenaWidth, this.arenaHeight);
      return;
    }
    // 地图资源加载前的兜底天空与平台绘制
    this.drawFullViewportBackdrop(ctx, this.arenaWidth, this.arenaHeight, this.groundY);
    ctx.save();
    ctx.fillStyle = '#c8bfb0';
    ctx.strokeStyle = '#6b6255';
    ctx.lineWidth = 3;
    for (const plat of this.platforms) {
      ctx.fillRect(plat.x, plat.y, plat.width, 16);
      ctx.strokeRect(plat.x, plat.y, plat.width, 16);
    }
    ctx.restore();
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

      ctx.beginPath();
      ctx.arc(0, 4, 155, 0, Math.PI * 2);
      ctx.clip();

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
