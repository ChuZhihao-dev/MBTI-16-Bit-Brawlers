import { GenericMBTIFighter, MBTI_16_DATA } from './roster-16.js';

const ENFJ_META = MBTI_16_DATA.find((fighter) => fighter.id === 'enfj');
const WAVE_PATH = 'assets/fighters/enfj/frames/';
const RELEASE_TIMES = [11 / 60, 14 / 60, 17 / 60];
const COMBOS = {
  light: [
    { frames: 10, cols: 5, rows: 2, active: 3, activeEnd: 5, reach: 54, damage: 7 },
    { frames: 11, cols: 6, rows: 2, active: 4, activeEnd: 6, reach: 62, damage: 7 },
    { frames: 13, cols: 7, rows: 2, active: 5, activeEnd: 8, reach: 68, damage: 8 },
    { frames: 15, cols: 5, rows: 3, active: 6, activeEnd: 9, reach: 76, damage: 8 },
    { frames: 20, cols: 5, rows: 4, active: 8, activeEnd: 12, reach: 86, damage: 10 }
  ],
  heavy: [
    { frames: 22, cols: 6, rows: 4, active: 9, activeEnd: 13, reach: 82, damage: 11 },
    { frames: 25, cols: 5, rows: 5, active: 10, activeEnd: 14, reach: 96, damage: 12 },
    { frames: 28, cols: 7, rows: 4, active: 11, activeEnd: 15, reach: 100, damage: 14 }
  ]
};
const comboSprites = Object.fromEntries(Object.entries(COMBOS).flatMap(([kind, stages]) =>
  stages.map((stage, index) => [`${kind}${index + 1}`, {
    src: `${WAVE_PATH}${kind === 'light' ? 'light_attack' : 'heavy_attack'}_${index + 1}_sheet.png`,
    cols: stage.cols, rows: stage.rows, frames: stage.frames, fps: 60, loop: false
  }])));

export class ENFJ extends GenericMBTIFighter {
  constructor(config) {
    super({
      ...config,
      spriteFootOffset: 0,
      sprites: {
        idle: { src: `${WAVE_PATH}idle_sheet.jpg`, cols: 6, rows: 6, frames: 36, fps: 20, loop: true },
        walk: { src: `${WAVE_PATH}walk_sheet.jpg`, cols: 6, rows: 4, frameStart: 12, frames: 12, fps: 12, loop: true },
        jump: { src: `${WAVE_PATH}jump_air_sheet.png`, cols: 8, rows: 4, frames: 32, fps: 30, loop: false },
        jumpStartup: { src: `${WAVE_PATH}jump_startup_sheet.png`, cols: 5, rows: 1, frames: 5, fps: 60, loop: false },
        landing: { src: `${WAVE_PATH}landing_sheet.png`, cols: 5, rows: 1, frames: 5, fps: 60, loop: false },
        dash: { src: `${WAVE_PATH}dash_sheet.png`, cols: 6, rows: 3, frames: 18, fps: 60, loop: false },
        guard: { src: `${WAVE_PATH}guard_sheet.png`, cols: 6, rows: 2, frames: 12, fps: 12, loop: true },
        blockHit: { src: `${WAVE_PATH}block_hit_sheet.png`, cols: 4, rows: 1, frames: 4, fps: 60, loop: false },
        buff: { src: `${WAVE_PATH}aura_buff_sheet.png`, cols: 6, rows: 4, frames: 22, fps: 60, loop: false },
        skill: {
          src: `${WAVE_PATH}triple_sword_wave_sheet.png`,
          cols: 6, rows: 6, frames: 36, fps: 60, loop: false
        },
        ultimate: {
          src: `${WAVE_PATH}ultimate_sheet.png`, cols: 4, rows: 4,
          frames: 16, fps: 12, loop: false, renderHeight: 280
        },
        finish: { src: `${WAVE_PATH}empathy_finish_sheet.png`, cols: 6, rows: 4, frames: 24, fps: 15, loop: false },
        ko: { src: `${WAVE_PATH}ko_kneeling_sword_sheet.png`, cols: 8, rows: 6, frames: 48, fps: 30, loop: false },
        ...comboSprites
      }
    }, ENFJ_META);
    this.waveImage = new Image();
    this.waveImage.src = `${WAVE_PATH}sword_wave_projectile.png`;
    this.waveCastElapsed = null;
    this.waveShotsFired = 0;
    this.combo = null;
    this.lastAttack = { light: -1, heavy: -1 };
    this.comboCooldown = 0;
    this.ultimateCastElapsed = null;
    this.ultimateWaveFired = false;
    this.dashElapsed = null;
    this.dashCooldown = 0;
    this.buffCastElapsed = null;
    this.buffCooldown = 0;
    this.buffTimer = 0;
    this.auraOnlyFrame = null;
    this.spriteScaleByState = new Map();
    this.guarding = false;
    this.guardElapsed = 0;
    this.blockHitTimer = 0;
    this.jumpStartupTimer = 0;
    this.landingTimer = 0;
  }

  useSkill(_opponent, context) {
    this.skillAnimTimer = 36 / 60;
    this.waveCastElapsed = 0;
    this.waveShotsFired = 0;
    context.spawnFloatingText(this.getCenterX(), this.y - 18, '三连剑气!', this.color);
  }

  update(dt, input, opponent, context) {
    this.comboCooldown = Math.max(0, this.comboCooldown - dt);
    this.dashCooldown = Math.max(0, this.dashCooldown - dt);
    this.buffCooldown = Math.max(0, this.buffCooldown - dt);
    this.buffTimer = Math.max(0, this.buffTimer - dt);
    this.blockHitTimer = Math.max(0, this.blockHitTimer - dt);
    this.jumpStartupTimer = Math.max(0, this.jumpStartupTimer - dt);
    this.landingTimer = Math.max(0, this.landingTimer - dt);
    const wasGrounded = this.onGround;
    const locked = Boolean(this.combo || this.dashElapsed !== null || this.buffCastElapsed !== null
      || this.waveCastElapsed !== null || this.ultimateAnimTimer > 0);
    this.guarding = Boolean(input.guard && !locked && this.hitstunTimer <= 0);
    super.update(dt, {
      left: !locked && !this.guarding && input.left,
      right: !locked && !this.guarding && input.right,
      up: !locked && !this.guarding && input.up,
      attack: false,
      skill: !locked && !this.guarding && input.rangedAttack,
      ultimate: !locked && !this.guarding && input.ultimate
    }, opponent, context);
    if (wasGrounded && !this.onGround) this.jumpStartupTimer = 5 / 60;
    if (!wasGrounded && this.onGround) this.landingTimer = 5 / 60;

    this.advanceUltimate(dt, context);
    if (this.hitstunTimer > 0 || this.statusEffects.exhausted > 0) {
      this.combo = null;
      this.waveCastElapsed = null;
      this.dashElapsed = null;
      this.buffCastElapsed = null;
      this.guarding = false;
      return;
    }
    if (this.ultimateAnimTimer > 0) return;
    if (this.waveCastElapsed !== null) {
      this.waveCastElapsed += dt * (this.buffTimer > 0 ? 1.3 : 1);
      while (this.waveShotsFired < RELEASE_TIMES.length
        && this.waveCastElapsed >= RELEASE_TIMES[this.waveShotsFired]) {
        this.releaseSwordWave(context, this.waveShotsFired++);
      }
      if (this.waveCastElapsed >= 36 / 60) this.waveCastElapsed = null;
      else this.showFrame('skill', Math.floor(this.waveCastElapsed * 60));
      return;
    }
    if (this.combo) {
      this.advanceCombo(dt, opponent, context);
      return;
    }
    if (this.dashElapsed !== null) {
      this.dashElapsed += dt * 60;
      if (this.dashElapsed >= 5 && this.dashElapsed < 13 && input.lightAttack) {
        this.dashElapsed = null;
        this.startCombo('light');
        return;
      }
      if (this.dashElapsed >= 5 && this.dashElapsed < 13 && input.heavyAttack) {
        this.dashElapsed = null;
        this.startCombo('heavy');
        return;
      }
      if (this.dashElapsed >= 4 && this.dashElapsed < 13) {
        this.x = Math.max(12, Math.min(context.arenaWidth - 12 - this.width, this.x + this.facing * 760 * dt));
        if (this.dashElapsed < 9) this.applyStatus('invincible', 0.04);
      }
      if (this.dashElapsed >= 18) this.dashElapsed = null;
      else this.showFrame('dash', Math.floor(this.dashElapsed));
      return;
    }
    if (this.buffCastElapsed !== null) {
      this.buffCastElapsed += dt * 60;
      if (this.buffCastElapsed >= 22) {
        this.buffTimer = 10;
        this.buffCastElapsed = null;
      } else this.showFrame('buff', Math.floor(this.buffCastElapsed));
      return;
    }
    if (this.blockHitTimer > 0) {
      this.showFrame('blockHit', Math.floor((4 / 60 - this.blockHitTimer) * 60));
      return;
    }
    if (this.guarding) {
      this.guardElapsed += dt;
      this.showFrame('guard', Math.floor(this.guardElapsed * 12) % 12);
      return;
    }
    this.guardElapsed = 0;

    if (this.jumpStartupTimer > 0) {
      this.showFrame('jumpStartup', Math.floor((5 / 60 - this.jumpStartupTimer) * 60));
      return;
    }
    if (this.landingTimer > 0) {
      this.showFrame('landing', Math.floor((5 / 60 - this.landingTimer) * 60));
      return;
    }

    if (input.dash && this.onGround && this.dashCooldown <= 0) {
      const direction = Number(input.right) - Number(input.left);
      if (direction) this.facing = direction;
      this.dashElapsed = 0;
      this.dashCooldown = 0.8;
      this.vx = 0;
      this.showFrame('dash', 0);
    } else if (input.special && this.buffCooldown <= 0) {
      this.buffCastElapsed = 0;
      this.buffCooldown = 12;
      this.applyStatus('superArmor', 0.12);
      this.vx = 0;
      this.showFrame('buff', 0);
    } else if (input.lightAttack && this.comboCooldown <= 0) {
      this.startCombo('light');
    } else if (input.heavyAttack && this.comboCooldown <= 0) {
      this.startCombo('heavy');
    }
  }

  startCombo(kind) {
    const count = COMBOS[kind].length;
    const previous = this.lastAttack[kind];
    const offset = Math.floor(Math.random() * (count - 1)) + 1;
    const index = previous < 0 ? Math.floor(Math.random() * count) : (previous + offset) % count;
    this.lastAttack[kind] = index;
    this.combo = { kind, index, elapsed: 0, hit: false };
    this.vx = 0;
    this.showFrame(`${kind}${index + 1}`, 0);
  }

  advanceCombo(dt, opponent, context) {
    const combo = this.combo;
    const stages = COMBOS[combo.kind];
    const stage = stages[combo.index];
    combo.elapsed = Math.min(stage.frames, combo.elapsed + dt * 60 * (this.buffTimer > 0 ? 1.3 : 1));
    if (!combo.hit && combo.elapsed >= stage.active) {
      combo.hit = true;
      const finisher = combo.index === stages.length - 1;
      const reach = stage.reach + (this.buffTimer > 0 ? 14 : 0);
      const box = {
        x: this.facing === 1 ? this.x + this.width - 4 : this.x - reach + 4,
        y: this.y + 8, width: reach, height: this.height - 12
      };
      if (context.rectsOverlap(box, opponent.getHurtbox())) {
        const hit = opponent.takeDamage(stage.damage,
          this.facing * (finisher ? 390 : 210), finisher ? -230 : -100,
          this, context, combo.kind === 'light' ? '连环轻斩!' : '重剑连斩!');
        if (hit && finisher) context.triggerHitstop(combo.kind === 'light' ? 6 : 8);
        if (hit && this.buffTimer > 0) context.spawnParticles?.(
          opponent.getCenterX(), opponent.getCenterY(), '#bef264', 5);
      }
    }
    if (combo.elapsed >= stage.frames) {
      this.combo = null;
      this.comboCooldown = 0.16;
    } else this.showFrame(`${combo.kind}${combo.index + 1}`, Math.floor(combo.elapsed));
  }

  showFrame(state, frame) {
    this.animState = state;
    const animator = this.spriteAnimator;
    if (!animator) return;
    animator.currentState = state;
    animator.frameIndex = Math.min(Math.max(0, frame), Math.max(0, (animator.animations[state]?.frames.length || 1) - 1));
    animator.timer = 0;
  }

  draw(ctx) {
    this.suppressInvincibilityOutline = this.dashElapsed !== null;
    if (this.buffTimer > 0 && this.buffCastElapsed === null) {
      const aura = this.getAuraOnlyFrame();
      if (aura) {
        ctx.save();
        ctx.translate(this.getCenterX(), this.getCenterY());
        ctx.scale(this.facing, 1);
        ctx.globalAlpha = 0.45 + 0.1 * Math.sin(performance.now() / 160);
        const drawH = Math.min(aura.height, this.spriteHeight) * this.getSpriteRenderScale(aura, 'buff');
        const drawW = aura.width / aura.height * drawH;
        ctx.drawImage(aura, -drawW / 2, this.height / 2 - drawH + this.spriteFootOffset, drawW, drawH);
        ctx.restore();
      }
    }
    super.draw(ctx);
  }

  getAuraOnlyFrame() {
    if (this.auraOnlyFrame) return this.auraOnlyFrame;
    const source = this.spriteAnimator?.animations.buff?.frames[10];
    if (!source) return null;
    const aura = document.createElement('canvas');
    aura.width = source.width;
    aura.height = source.height;
    const ctx = aura.getContext('2d');
    ctx.drawImage(source, 0, 0);
    // 素材包含人物。只保留外围气焰，避免与当前动作中的人物叠出重影。
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.ellipse(aura.width * 0.5, aura.height * 0.51,
      aura.width * 0.28, aura.height * 0.47, 0, 0, Math.PI * 2);
    ctx.fill();
    this.auraOnlyFrame = aura;
    return aura;
  }

  getSpriteRenderScale(_frame, state = this.animState) {
    if (this.spriteScaleByState.has(state)) return this.spriteScaleByState.get(state);
    const idle = this.spriteAnimator?.animations.idle;
    const animation = this.spriteAnimator?.animations[state];
    if (!idle?.loaded || !animation?.loaded) return 1;
    const reference = this.measureHairWidth(idle.frames[0]);
    const widths = animation.frames.map((frame) => this.measureHairWidth(frame)).filter(Boolean).sort((a, b) => a - b);
    if (!reference || !widths.length) return 1;
    const middle = widths[Math.floor(widths.length / 2)];
    const scale = Math.max(0.8, Math.min(1.35, reference / middle));
    this.spriteScaleByState.set(state, scale);
    return scale;
  }

  measureHairWidth(frame) {
    const { width, height } = frame;
    const pixels = frame.getContext('2d').getImageData(0, 0, width, Math.floor(height * 0.62)).data;
    let widest = 0;
    for (let y = 0; y < Math.floor(height * 0.62); y++) {
      let run = 0;
      for (let x = 0; x < width; x++) {
        const p = (y * width + x) * 4;
        const r = pixels[p], g = pixels[p + 1], b = pixels[p + 2];
        const gray = Math.max(r, g, b) - Math.min(r, g, b) < 18;
        if (pixels[p + 3] > 180 && r >= 40 && r < 145 && gray) {
          run++;
          widest = Math.max(widest, run);
        } else run = 0;
      }
    }
    return widest >= 8 ? widest : 0;
  }

  takeDamage(amount, knockbackX, knockbackY, attacker, context, hitLabel = '') {
    const fromFront = !attacker || Math.sign(attacker.getCenterX() - this.getCenterX()) === this.facing;
    if (this.guarding && fromFront) {
      this.blockHitTimer = 4 / 60;
      this.shieldFlashTimer = 0.14;
      context.triggerHitstop(3);
      context.spawnParticles?.(this.getCenterX() + this.facing * 16, this.getCenterY(), '#a3e635', 6);
      this.x = Math.max(12, Math.min(context.arenaWidth - 12 - this.width, this.x - this.facing * 7));
      return false;
    }
    return super.takeDamage(amount, knockbackX, knockbackY, attacker, context, hitLabel);
  }

  releaseSwordWave(context, index) {
    const width = 42;
    const height = 50;
    const image = this.waveImage;
    const direction = this.facing;
    context.spawnProjectile({
      owner: this,
      x: direction === 1 ? this.x + this.width + 2 : this.x - width - 2,
      y: this.y + [4, 15, 26][index],
      width, height,
      vx: direction * (470 + index * 24),
      direction,
      lifetime: 1.15,
      damage: 5,
      knockbackX: 125,
      knockbackY: -85,
      hitLabel: '三连剑气!',
      draw(ctx) {
        ctx.save();
        ctx.translate(this.x + this.width / 2, this.y + this.height / 2);
        ctx.scale(this.direction, 1);
        if (image.complete && image.naturalWidth > 0) {
          ctx.drawImage(image, -26, -30, 52, 60);
        } else {
          ctx.beginPath();
          ctx.arc(4, 0, 23, Math.PI * 0.62, Math.PI * 1.38, true);
          ctx.strokeStyle = '#a3e635';
          ctx.lineWidth = 7;
          ctx.stroke();
        }
        ctx.restore();
      }
    });
  }

  useUltimate(_opponent, context) {
    this.ultimateAnimTimer = 16 / 12;
    this.applyStatus('invincible', 1);
    this.ultimateCastElapsed = 0;
    this.ultimateWaveFired = false;
    context.spawnFloatingText(this.getCenterX(), this.y - 26, '【耀光破阵斩】', '#facc15');
  }

  advanceUltimate(dt, context) {
    if (this.ultimateCastElapsed === null) return;
    this.ultimateCastElapsed += dt;
    // 前八帧高举聚能，第九帧才释放大范围圆弧剑气投掷物。
    if (!this.ultimateWaveFired && this.ultimateCastElapsed >= 8 / 12) {
      this.ultimateWaveFired = true;
      const image = this.waveImage;
      const width = 170;
      const height = 158;
      const direction = this.facing;
      context.spawnProjectile({
        owner: this,
        x: direction === 1 ? this.x + this.width + 2 : this.x - width - 2,
        y: this.y - 50,
        width, height,
        vx: direction * 770,
        direction,
        lifetime: 1.35,
        damage: 28,
        knockbackX: 440,
        knockbackY: -260,
        hitLabel: '耀光破阵斩!',
        onHit(target, ctx) {
          const hit = target.takeDamage(this.damage, direction * this.knockbackX,
            this.knockbackY, this.owner, ctx, this.hitLabel);
          if (hit && target.hp <= 0) ctx.onUltimateKo?.(this.owner, target);
        },
        draw(ctx) {
          ctx.save();
          ctx.translate(this.x + this.width / 2, this.y + this.height / 2);
          ctx.scale(this.direction, 1);
          if (image.complete && image.naturalWidth > 0) {
            ctx.drawImage(image, -110, -103, 220, 206);
          } else {
            ctx.beginPath();
            ctx.arc(0, 0, 72, -Math.PI * 0.72, Math.PI * 0.72, true);
            ctx.strokeStyle = '#a3e635';
            ctx.lineWidth = 20;
            ctx.stroke();
          }
          ctx.restore();
        }
      });
      context.triggerShake(9, 0.18);
    }
    if (this.ultimateCastElapsed >= 16 / 12) this.ultimateCastElapsed = null;
  }
}
