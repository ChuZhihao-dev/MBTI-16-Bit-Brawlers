import { FighterBase } from '../fighter-base.js';

const NEW_FRAMES = 'assets/fighters/isfp/frames/skill_doc_v1/';
const GRID_8 = { cols: 4, rows: 2, frames: 8, loop: false, trimToContent: true };
const FRAME_EPS = 1e-6;
const FRAME_STARTS = {
  landing: [0, 1, 2, 3],
  dash: [0, 4, 7, 12],
  lightAttack: [0, 2, 3, 4, 6, 8, 10, 12],
  heavyAttack: [0, 3, 6, 8, 10, 12, 16, 21],
  paintProjectile: [0, 3, 6, 9, 11, 13, 16, 22],
  inspirationDash: [0, 3, 6, 9, 12, 15, 21, 29]
};

export class ISFP extends FighterBase {
  constructor(config) {
    super({
      ...config,
      id: 'isfp',
      name: 'ISFP',
      title: '探险家 · 随性画师',
      color: '#f59e0b',
      maxHp: 95,
      speed: 340,
      jumpForce: 660,
      skillCdMax: 3.4,
      spriteHeight: 94,
      spriteFootOffset: 0,
      sprites: {
        idle: { src: 'assets/fighters/isfp/frames/idle_sheet.png', frames: 4, fps: 6, loop: true, trimToContent: true },
        walk: { src: `${NEW_FRAMES}walk_sheet.png`, frames: 4, fps: 11, loop: true, trimToContent: true },
        jump: { src: `${NEW_FRAMES}jump_sheet.png`, frames: 4, fps: 9, loop: false, trimToContent: true },
        landing: { src: `${NEW_FRAMES}landing_sheet.png`, frames: 4, loop: false, trimToContent: true },
        dash: { src: `${NEW_FRAMES}dash_sheet.png`, frames: 4, loop: false, trimToContent: true },
        lightAttack: { src: `${NEW_FRAMES}light_attack_sheet.png`, ...GRID_8 },
        heavyAttack: { src: `${NEW_FRAMES}heavy_attack_sheet.png`, ...GRID_8 },
        paintProjectile: { src: `${NEW_FRAMES}paint_projectile_sheet.png`, ...GRID_8 },
        inspirationDash: { src: `${NEW_FRAMES}inspiration_dash_sheet.png`, ...GRID_8 },
        hit: { src: 'assets/fighters/isfp/frames/hit_sheet.png', frames: 2, fps: 10, loop: false, trimToContent: true },
        ultimate: {
          src: `${NEW_FRAMES}ultimate_sheet.png`, cols: 4, rows: 4,
          frames: 16, fps: 12, loop: false, cropInset: 4, renderHeight: 280
        }
      }
    });
    this.action = null;
    this.dashCd = 0;
    this.paintCd = 0;
    this.inspirationCd = 0;
    this.landingTimer = 0;
    this.paintOrbImage = new Image();
    this.paintOrbImage.src = `${NEW_FRAMES}paint_orb.png`;
  }

  update(dt, input, opponent, context) {
    this.dashCd = Math.max(0, this.dashCd - dt);
    this.paintCd = Math.max(0, this.paintCd - dt);
    this.inspirationCd = Math.max(0, this.inspirationCd - dt);
    const wasGrounded = this.onGround;
    const wasFalling = this.vy > 0;
    const locked = Boolean(this.action);
    const actionEnding = locked && this.action.duration - this.action.elapsed <= dt + FRAME_EPS;
    super.update(dt, {
      left: !locked && input.left,
      right: !locked && input.right,
      up: !locked && input.up,
      attack: false,
      skill: false,
      ultimate: (!locked || actionEnding) && input.ultimate
    }, opponent, context);

    if (this.ultimateAnimTimer > 0 || this.hitstunTimer > 0 || this.statusEffects.exhausted > 0) {
      this.action = null;
      return;
    }

    if (!wasGrounded && wasFalling && this.onGround && !this.action) this.landingTimer = 4 / 60;
    if (this.action) this.advanceAction(dt, input, opponent, context);

    if (!this.action) {
      const direction = Number(Boolean(input.right)) - Number(Boolean(input.left));
      const triggerSkill1 = Boolean(input.skill1 ?? input.paintProjectile);
      const triggerSkill2 = Boolean(input.skill2 ?? input.inspirationDash);
      if (input.dash && this.onGround && this.dashCd <= 0 && this.statusEffects.rooted <= 0) {
        this.facing = direction || this.facing;
        this.dashCd = 0.85;
        this.beginAction('dash', 16 / 60);
      } else if (input.heavyAttack && this.basicCd <= 0) {
        this.basicCd = 0.5;
        this.beginAction('heavyAttack', 26 / 60);
      } else if (input.lightAttack && this.basicCd <= 0) {
        this.basicCd = 0.28;
        this.beginAction('lightAttack', 13 / 60);
      } else if (triggerSkill1 && this.paintCd <= 0) {
        this.paintCd = 3.4;
        this.beginAction('paintProjectile', 34 / 60);
      } else if (triggerSkill2 && this.inspirationCd <= 0 && this.statusEffects.rooted <= 0) {
        this.inspirationCd = 4.2;
        this.beginAction('inspirationDash', 38 / 60);
      }
    }

    if (this.action) {
      this.showActionFrame(this.action.kind, this.action.elapsed);
    } else if (this.landingTimer > 0 && this.onGround) {
      this.showActionFrame('landing', 4 / 60 - this.landingTimer);
      this.landingTimer = Math.max(0, this.landingTimer - dt);
    }
  }

  beginAction(kind, duration) {
    this.action = { kind, duration, elapsed: 0, fired: false, hit: false };
    this.vx = 0;
    this.landingTimer = 0;
    this.spriteAnimator?.reset(kind);
  }

  showActionFrame(kind, elapsed) {
    this.animState = kind;
    if (!this.spriteAnimator) return;
    const animation = this.spriteAnimator.animations[kind];
    const starts = FRAME_STARTS[kind];
    let frame = 0;
    for (let i = 1; i < starts.length; i++) {
      if (elapsed * 60 + FRAME_EPS >= starts[i]) frame = i;
    }
    this.spriteAnimator.currentState = kind;
    this.spriteAnimator.frameIndex = Math.min((animation?.frames.length || starts.length) - 1, frame);
  }

  advanceAction(dt, input, opponent, context) {
    const action = this.action;
    action.elapsed = Math.min(action.duration, action.elapsed + dt);
    const t = action.elapsed;
    if (action.kind === 'dash') {
      if (t + FRAME_EPS >= 4 / 60 && t < 12 / 60 - FRAME_EPS) this.moveBurst(1200 * dt, context);
    } else if (action.kind === 'lightAttack') {
      if (!action.fired && t + FRAME_EPS >= 5 / 60) {
        action.fired = true;
        this.strike(opponent, context, 48, 8, 205, -100, '甩笔点刺!');
      }
      if (input.heavyAttack && t + FRAME_EPS >= 6 / 60 && t <= 11 / 60 + FRAME_EPS) {
        this.basicCd = 0.5;
        this.beginAction('heavyAttack', 26 / 60);
        return;
      }
    } else if (action.kind === 'heavyAttack') {
      if (!action.fired && t + FRAME_EPS >= 10 / 60) {
        action.fired = true;
        if (this.strike(opponent, context, 92, 11, 310, -150, '泼墨横扫!')) context.triggerHitstop(5);
      }
    } else if (action.kind === 'paintProjectile') {
      if (!action.fired && t + FRAME_EPS >= 13 / 60) {
        action.fired = true;
        this.firePaint(context);
      }
    } else if (action.kind === 'inspirationDash') {
      if (t + FRAME_EPS >= 12 / 60 && t < 20 / 60 - FRAME_EPS) {
        this.moveBurst(650 * dt, context);
        if (!action.hit && this.strike(opponent, context, 85, 15, 380, -250, '狂想一笔!')) {
          action.hit = true;
          context.triggerHitstop(8);
        }
      }
    }
    if (action.duration - action.elapsed <= FRAME_EPS) this.action = null;
  }

  moveBurst(distance, context) {
    const leftBound = context.stageLeft ?? 12;
    const rightBound = (context.stageRight ?? context.arenaWidth - 12) - this.width;
    this.x = Math.max(leftBound, Math.min(rightBound, this.x + this.facing * distance));
    this.vx = 0;
  }

  strike(opponent, context, reach, damage, knockbackX, knockbackY, label) {
    const box = {
      x: this.facing === 1 ? this.x + this.width - 4 : this.x - reach + 4,
      y: this.y + 12, width: reach, height: this.height - 20
    };
    return context.rectsOverlap(box, opponent.getHurtbox())
      && opponent.takeDamage(damage, this.facing * knockbackX, knockbackY, this, context, label);
  }

  firePaint(context) {
    const size = 36;
    const orb = this.paintOrbImage;
    context.spawnProjectile({
      owner: this,
      x: this.facing === 1 ? this.x + this.width + 2 : this.x - size - 2,
      y: this.y + 18,
      width: size, height: size, vx: this.facing * 520,
      lifetime: 0.85, color: '#ec4899',
      draw(ctx) {
        ctx.save();
        ctx.translate(this.x + this.width / 2, this.y + this.height / 2);
        ctx.scale(this.vx < 0 ? -1 : 1, 1);
        if (orb?.complete && orb.naturalWidth > 0) {
          ctx.drawImage(orb, -28, -28, 56, 56);
        } else {
          const facets = [
            ['#facc15', [-18, -10, 0, -18, 13, -9]],
            ['#fb923c', [-18, -10, 13, -9, 16, 8]],
            ['#ec4899', [13, -9, 20, 4, 9, 17]],
            ['#38bdf8', [-14, 9, 9, 17, -4, 18]]
          ];
          facets.forEach(([color, points]) => {
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.moveTo(points[0], points[1]);
            ctx.lineTo(points[2], points[3]);
            ctx.lineTo(points[4], points[5]);
            ctx.closePath();
            ctx.fill();
          });
        }
        ctx.restore();
      },
      onHit(target, ctx) {
        if (target.takeDamage(13, this.owner.facing * 210, -110,
          this.owner, ctx, '泼彩飞溅!')) target.applyStatus('slowed', 0.8);
      }
    });
  }

  takeDamage(amount, knockbackX, knockbackY, attacker, context, hitLabel = '') {
    if (this.hitstunTimer <= 0 && this.action?.kind === 'dash'
      && this.action.elapsed + FRAME_EPS >= 4 / 60
      && this.action.elapsed < 8 / 60 - FRAME_EPS) {
      context.spawnFloatingText(this.getCenterX(), this.y - 14, 'MISS!', '#a855f7');
      return false;
    }
    return super.takeDamage(amount, knockbackX, knockbackY, attacker, context, hitLabel);
  }

  // 万象泼彩狂想曲：双侧共用新必杀动作与判定。
  useUltimate(_opponent, context) {
    this.ultimateAnimTimer = 16 / 12;
    this.applyStatus('invincible', 0.9);
    context.spawnFloatingText(this.getCenterX(), this.y - 26, '【万象泼彩狂想曲】', '#facc15');

    let elapsed = 0;
    let hitDone = false;
    const reach = 220;
    context.spawnProjectile({
      owner: this,
      x: this.facing === 1 ? this.x + this.width - 8 : this.x - reach + 8,
      y: this.y - 25,
      width: reach,
      height: this.height + 50,
      lifetime: 1.2,
      pierce: true,
      update(dt) {
        elapsed += dt;
        this.x = this.owner.facing === 1
          ? this.owner.x + this.owner.width - 8
          : this.owner.x - reach + 8;
        this.y = this.owner.y - 25;
        if (!this.shaken && elapsed >= 0.75) {
          this.shaken = true;
          context.triggerShake(10, 0.24);
        }
      },
      onHit(target, ctx) {
        if (hitDone || elapsed < 0.75) return;
        hitDone = target.takeDamage(26, this.owner.facing * 430, -300,
          this.owner, ctx, '万象泼彩!');
        if (hitDone) ctx.triggerHitstop(10);
      },
      draw() {}
    });
  }
}
