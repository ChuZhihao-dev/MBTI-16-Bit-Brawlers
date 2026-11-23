import { GenericMBTIFighter, MBTI_16_DATA } from './roster-16.js';

const ENFJ_META = MBTI_16_DATA.find((fighter) => fighter.id === 'enfj');
const WAVE_PATH = 'assets/fighters/enfj/frames/reduced_v2/';
const KEYFRAME_PATH = `${WAVE_PATH}keyframes/`;
const RELEASE_TIMES = [11 / 60, 14 / 60, 17 / 60];
const ENFJ_SPRITE = { autoCropVertical: true, trimToContent: true, backgroundThreshold: 210 };
const SPRITE_FRAMES = { idle: 4, walk: 4, jump: 6, jumpStartup: 4, landing: 4,
  dash: 6, guard: 4, blockHit: 4, buff: 8, skill: 10, ultimate: 10, finish: 4, ko: 8 };
const COMBOS = {
  light: [
    { duration: 10, frames: 4, frameStarts: [0, 1, 3, 7], active: 3, reach: 54, damage: 7 },
    { duration: 11, frames: 4, frameStarts: [0, 2, 4, 8], active: 4, reach: 62, damage: 7 },
    { duration: 13, frames: 4, frameStarts: [0, 2, 5, 9], active: 5, reach: 68, damage: 8 },
    { duration: 15, frames: 4, frameStarts: [0, 3, 6, 11], active: 6, reach: 76, damage: 8 },
    { duration: 20, frames: 4, frameStarts: [0, 4, 8, 15], active: 8, reach: 86, damage: 10 }
  ],
  heavy: [
    { duration: 22, frames: 5, frameStarts: [0, 4, 7, 9, 17], active: 9, reach: 82, damage: 11 },
    { duration: 25, frames: 5, frameStarts: [0, 4, 7, 10, 19], active: 10, reach: 96, damage: 12 },
    { duration: 28, frames: 5, frameStarts: [0, 4, 8, 11, 21], active: 11, reach: 100, damage: 14 }
  ]
};
const comboSprites = Object.fromEntries(Object.entries(COMBOS).flatMap(([kind, stages]) =>
  stages.map((stage, index) => [`${kind}${index + 1}`, {
    src: `${KEYFRAME_PATH}${kind === 'light' ? 'light_attack' : 'heavy_attack'}_${index + 1}_sheet.png`,
    cols: stage.frames, rows: 1, frames: stage.frames, fps: 15, loop: false,
    ...ENFJ_SPRITE
  }])));

export class ENFJ extends GenericMBTIFighter {
  constructor(config) {
    super({
      ...config,
      spriteHeight: 94,
      spriteFootOffset: 0,
      sprites: {
        idle: { src: `${WAVE_PATH}idle_sheet.png`, cols: 4, frames: 4, fps: 6, loop: true, ...ENFJ_SPRITE },
        walk: { src: `${WAVE_PATH}walk_sheet.png`, cols: 4, frames: 4, fps: 12, loop: true, ...ENFJ_SPRITE },
        jump: { src: `${WAVE_PATH}jump_air_sheet.png`, cols: 6, frames: 6, fps: 12, loop: false, ...ENFJ_SPRITE },
        jumpStartup: { src: `${WAVE_PATH}jump_startup_sheet.png`, cols: 4, frames: 4, fps: 12, loop: false, ...ENFJ_SPRITE },
        landing: { src: `${WAVE_PATH}landing_sheet.png`, cols: 4, frames: 4, fps: 12, loop: false, ...ENFJ_SPRITE },
        dash: { src: `${WAVE_PATH}dash_sheet.png`, cols: 6, frames: 6, fps: 20, loop: false, ...ENFJ_SPRITE },
        guard: { src: `${WAVE_PATH}guard_sheet.png`, cols: 4, frames: 4, fps: 6, loop: true, ...ENFJ_SPRITE },
        blockHit: { src: `${WAVE_PATH}block_hit_sheet.png`, cols: 4, frames: 4, fps: 15, loop: false, ...ENFJ_SPRITE },
        buff: { src: `${WAVE_PATH}aura_buff_sheet.png`, cols: 8, frames: 8, fps: 20, loop: false, ...ENFJ_SPRITE },
        skill: { src: `${WAVE_PATH}triple_sword_wave_sheet.png`, cols: 10, frames: 10, fps: 17, loop: false, ...ENFJ_SPRITE },
        ultimate: { src: `${WAVE_PATH}ultimate_clean_sheet.png`, cols: 10, frames: 10,
          fps: 12, loop: false, renderHeight: 280, ...ENFJ_SPRITE, removeWhiteBg: false },
        finish: { src: `${KEYFRAME_PATH}empathy_finish_sheet.png`, cols: SPRITE_FRAMES.finish,
          frames: SPRITE_FRAMES.finish, fps: 6, loop: false, ...ENFJ_SPRITE },
        ko: { src: `${WAVE_PATH}ko_kneeling_sword_sheet.png`, cols: 8, frames: 8, fps: 12, loop: false, ...ENFJ_SPRITE },
        ...comboSprites
      }
    }, ENFJ_META);
    this.waveImage = new Image();
    this.waveImage.src = `${WAVE_PATH}sword_wave_projectile.png`;
    this.ultimateWaveImage = new Image();
    this.ultimateWaveImage.src = `${WAVE_PATH}ultimate_projectile.png`;
    this.waveCastElapsed = null;
    this.waveShotsFired = 0;
    this.combo = null;
    this.lastAttack = { light: -1, heavy: -1 };
    this.comboCooldown = 0;
    this.ultimateCastElapsed = null;
    this.ultimateWaveFired = false;
    this.ultimateOutlineTimer = 0;
    this.dashElapsed = null;
    this.dashCooldown = 0;
    this.buffCastElapsed = null;
    this.buffCooldown = 0;
    this.buffTimer = 0;
    this.auraOnlyFrame = null;
    this.spriteScaleByFrame = new WeakMap();
    this.idleHairWidth = null;
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
    this.ultimateOutlineTimer = Math.max(0, this.ultimateOutlineTimer - dt);
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
    const triggerSkill1 = Boolean(input.skill1 ?? input.rangedAttack);
    const triggerSkill2 = Boolean(input.skill2 ?? input.special);
    super.update(dt, {
      left: !locked && !this.guarding && input.left,
      right: !locked && !this.guarding && input.right,
      up: !locked && !this.guarding && input.up,
      attack: false,
      skill: !locked && !this.guarding && triggerSkill1,
      ultimate: !locked && !this.guarding && input.ultimate
    }, opponent, context);
    if (wasGrounded && !this.onGround) this.jumpStartupTimer = 4 / 15;
    if (!wasGrounded && this.onGround) this.landingTimer = 4 / 15;

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
      else this.showFrame('skill', Math.floor(this.waveCastElapsed / (36 / 60) * SPRITE_FRAMES.skill));
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
        const leftBound = context.stageLeft ?? 12;
        const rightBound = (context.stageRight ?? context.arenaWidth - 12) - this.width;
        this.x = Math.max(leftBound, Math.min(rightBound, this.x + this.facing * 760 * dt));
        if (this.dashElapsed < 9) this.applyStatus('invincible', 0.04);
        const f = Math.floor(this.dashElapsed);
        if ((f === 4 || f === 7 || f === 10) && this._lastDashGhostFrame !== f) {
          this._lastDashGhostFrame = f;
          context.spawnAfterimage?.(this, '#84cc16');
        }
      }
      if (this.dashElapsed >= 18) this.dashElapsed = null;
      else this.showFrame('dash', Math.floor(this.dashElapsed / 18 * SPRITE_FRAMES.dash));
      return;
    }
    if (this.buffCastElapsed !== null) {
      this.buffCastElapsed += dt * 60;
      if (this.buffCastElapsed >= 22) {
        this.buffTimer = 10;
        this.buffCastElapsed = null;
      } else this.showFrame('buff', Math.floor(this.buffCastElapsed / 22 * SPRITE_FRAMES.buff));
      return;
    }
    if (this.blockHitTimer > 0) {
      this.showFrame('blockHit', Math.floor((4 / 60 - this.blockHitTimer) * 60));
      return;
    }
    if (this.guarding) {
      this.guardElapsed += dt;
      this.showFrame('guard', Math.floor(this.guardElapsed * 6) % SPRITE_FRAMES.guard);
      return;
    }
    this.guardElapsed = 0;

    if (this.jumpStartupTimer > 0) {
      this.showFrame('jumpStartup', Math.floor((4 / 15 - this.jumpStartupTimer) * 15));
      return;
    }
    if (this.landingTimer > 0) {
      this.showFrame('landing', Math.floor((4 / 15 - this.landingTimer) * 15));
      return;
    }

    if (input.dash && this.onGround && this.dashCooldown <= 0) {
      const direction = Number(input.right) - Number(input.left);
      if (direction) this.facing = direction;
      this.dashElapsed = 0;
      this._lastDashGhostFrame = -1;
      this.dashCooldown = 0.8;
      this.vx = 0;
      context.sfx?.dash();
      context.spawnAfterimage?.(this, '#84cc16');
      this.showFrame('dash', 0);
    } else if (triggerSkill2 && this.buffCooldown <= 0) {
      this.buffCastElapsed = 0;
      this.buffCooldown = 12;
      this.applyStatus('superArmor', 0.12);
      this.vx = 0;
      context.sfx?.buff();
      context.spawnHitSpark?.(this.getCenterX(), this.getCenterY(), '#bef264', 'heavy', this.facing);
      this.showFrame('buff', 0);
    } else if (input.lightAttack && this.comboCooldown <= 0) {
      context.sfx?.whoosh(false);
      this.startCombo('light');
    } else if (input.heavyAttack && this.comboCooldown <= 0) {
      context.sfx?.whoosh(true);
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
    const speedMult = this.buffTimer > 0 ? 1.3 : 1;
    combo.elapsed = Math.min(stage.duration, combo.elapsed + dt * 60 * speedMult);

    // 重击发力段顺势向前踏步推进（踏步劈斩力量感）
    if (combo.kind === 'heavy' && combo.elapsed >= stage.active - 3 && combo.elapsed <= stage.active + 3) {
      const stepSpeed = combo.index === 2 ? 140 : (combo.index === 1 ? 160 : 120);
      const leftBound = context.stageLeft ?? 12;
      const rightBound = (context.stageRight ?? context.arenaWidth - 12) - this.width;
      this.x = Math.max(leftBound, Math.min(rightBound, this.x + this.facing * stepSpeed * dt));
    }

    if (!combo.hit && combo.elapsed >= stage.active) {
      combo.hit = true;
      const isHeavy = combo.kind === 'heavy';
      const finisher = combo.index === stages.length - 1;
      const reach = stage.reach + (this.buffTimer > 0 ? 14 : 0);
      const box = {
        x: this.facing === 1 ? this.x + this.width - 4 : this.x - reach + 4,
        y: this.y + 8, width: reach, height: this.height - 12
      };
      if (context.rectsOverlap(box, opponent.getHurtbox())) {
        let knockX, knockY, hitLabel;
        if (isHeavy) {
          if (combo.index === 0) {
            // 重击 1：沉肩蓄力重劈，强力砸地削硬直
            knockX = 260;
            knockY = -90;
            hitLabel = '沉肩重劈!';
          } else if (combo.index === 1) {
            // 重击 2：低身旋身重扫，扫飞推进
            knockX = 330;
            knockY = -140;
            hitLabel = '回旋重斩!';
          } else {
            // 重击 3：双臂贯力挑飞终结，大挑空升天
            knockX = 420;
            knockY = -340;
            hitLabel = '破势升天挑!';
          }
        } else {
          knockX = finisher ? 390 : 210;
          knockY = finisher ? -230 : -100;
          hitLabel = finisher ? '连环贯穿击!' : '快速连击!';
        }

        const hit = opponent.takeDamage(
          stage.damage,
          this.facing * knockX,
          knockY,
          this,
          context,
          hitLabel
        );

        if (hit) {
          // 强化顿帧与屏幕微震（打击顿挫感）
          if (isHeavy) {
            if (combo.index === 0) {
              context.triggerHitstop?.(6);
              context.triggerShake?.(5, 0.1, this.facing, 0.3);
              context.sfx?.hitHeavy?.();
              context.spawnHitSpark?.(opponent.getCenterX(), opponent.getCenterY(), '#facc15', 'heavy', this.facing);
              context.spawnParticles?.(opponent.getCenterX(), opponent.getCenterY(), '#fef08a', 8);
            } else if (combo.index === 1) {
              context.triggerHitstop?.(8);
              context.triggerShake?.(7, 0.12, this.facing, 0);
              context.sfx?.hitHeavy?.();
              context.spawnHitSpark?.(opponent.getCenterX(), opponent.getCenterY(), '#a3e635', 'heavy', this.facing);
              context.spawnParticles?.(opponent.getCenterX(), this.y + this.height - 8, '#bef264', 12);
            } else {
              // 终极重挑：强力顿帧 + 垂直大震动 + 巨量冲击碎光
              context.triggerHitstop?.(11);
              context.triggerShake?.(10, 0.18, 0.3, -1);
              context.sfx?.hitHeavy?.();
              context.spawnHitSpark?.(opponent.getCenterX(), opponent.getCenterY() - 10, '#facc15', 'heavy', this.facing);
              context.spawnParticles?.(opponent.getCenterX(), opponent.getCenterY(), '#fde047', 16);
            }
          } else {
            // 轻击顿帧
            if (finisher) {
              context.triggerHitstop?.(6);
              context.triggerShake?.(4, 0.08);
              context.spawnHitSpark?.(opponent.getCenterX(), opponent.getCenterY(), '#a3e635', 'slash', this.facing);
            }
          }

          if (this.buffTimer > 0) {
            context.spawnParticles?.(opponent.getCenterX(), opponent.getCenterY(), '#bef264', 6);
          }
        }
      }
    }
    if (combo.elapsed >= stage.duration) {
      this.combo = null;
      this.comboCooldown = 0.16;
    } else {
      let frame = 0;
      while (frame + 1 < stage.frames && combo.elapsed >= stage.frameStarts[frame + 1]) frame++;
      this.showFrame(`${combo.kind}${combo.index + 1}`, frame);
    }
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
    this.suppressInvincibilityOutline = this.dashElapsed !== null
      || this.ultimateOutlineTimer > 0;
    if (this.buffTimer > 0 && this.buffCastElapsed === null) {
      const aura = this.getAuraOnlyFrame();
      if (aura) {
        ctx.save();
        ctx.translate(this.getCenterX(), this.getCenterY());
        ctx.scale(this.facing, 1);
        ctx.globalAlpha = 0.45 + 0.1 * Math.sin(performance.now() / 160);
        const drawH = Math.min(aura.height, this.spriteHeight) * this.getSpriteRenderScale(aura);
        const drawW = aura.width / aura.height * drawH;
        ctx.drawImage(aura, -drawW / 2, this.height / 2 - drawH + this.spriteFootOffset, drawW, drawH);
        ctx.restore();
      }
    }
    super.draw(ctx);
  }

  getAuraOnlyFrame() {
    if (this.auraOnlyFrame) return this.auraOnlyFrame;
    const source = this.spriteAnimator?.animations.buff?.frames[SPRITE_FRAMES.buff - 1];
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

  getSpriteRenderScale(frame) {
    if (this.spriteScaleByFrame.has(frame)) return this.spriteScaleByFrame.get(frame);
    const idle = this.spriteAnimator?.animations.idle;
    if (!idle?.loaded) return 1;
    this.idleHairWidth ??= this.measureHairWidth(idle.frames[0]);
    const source = frame === this.auraOnlyFrame
      ? this.spriteAnimator?.animations.buff?.frames[SPRITE_FRAMES.buff - 1]
      : frame;
    const hairWidth = source && this.measureHairWidth(source)
      * (Math.min(source.height, this.spriteHeight) / source.height);
    if (!this.idleHairWidth || !hairWidth) return 1;
    // 图片本身的披风、剑气占幅不同，禁止头宽误差把整个人物放大。
    const scale = Math.max(0.95, Math.min(1.05, this.idleHairWidth / hairWidth));
    this.spriteScaleByFrame.set(frame, scale);
    return scale;
  }

  measureHairWidth(frame) {
    const { width, height } = frame;
    const pixels = frame.getContext('2d').getImageData(0, 0, width, height).data;
    let widest = 0;
    for (let y = 0; y < height * 0.82; y++) {
      let left = width;
      let right = -1;
      let count = 0;
      for (let x = 0; x < width; x++) {
        const p = (y * width + x) * 4;
        const r = pixels[p], g = pixels[p + 1], b = pixels[p + 2];
        const gray = Math.max(r, g, b) - Math.min(r, g, b) < 35;
        if (pixels[p + 3] > 180 && r >= 35 && r < 155 && gray) {
          left = Math.min(left, x);
          right = Math.max(right, x);
          count++;
        }
      }
      const span = right - left + 1;
      if (count >= 8 && span <= width * 0.55) widest = Math.max(widest, span);
    }
    return widest >= 8 ? widest : 0;
  }

  takeDamage(amount, knockbackX, knockbackY, attacker, context, hitLabel = '') {
    const fromFront = !attacker || Math.sign(attacker.getCenterX() - this.getCenterX()) === this.facing;
    if (this.guarding && fromFront) {
      this.blockHitTimer = 4 / 60;
      this.shieldFlashTimer = 0.14;
      context.triggerHitstop(4);
      context.triggerShake(4, 0.09, Math.sign(knockbackX), 0);
      context.sfx?.guardBlock();
      context.spawnHitSpark?.(this.getCenterX() + this.facing * 20, this.getCenterY(), '#a3e635', 'guard', -this.facing);
      context.spawnParticles?.(this.getCenterX() + this.facing * 16, this.getCenterY(), '#a3e635', 7);
      const leftBound = context.stageLeft ?? 12;
      const rightBound = (context.stageRight ?? context.arenaWidth - 12) - this.width;
      this.x = Math.max(leftBound, Math.min(rightBound, this.x - this.facing * 7));
      return false;
    }
    return super.takeDamage(amount, knockbackX, knockbackY, attacker, context, hitLabel);
  }

  releaseSwordWave(context, index) {
    context.sfx?.whoosh(index === 2);
    const width = 42;
    const height = 50;
    const image = this.waveImage;
    const direction = this.facing < 0 ? -1 : 1;
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
        // 图片原素材中，波峰凸面朝左(C形状)；飞行时圆弧凸面向外破风，向人物朝向推进：
        // direction > 0 (朝右) 时水平翻转为 ) 凸面朝右；direction < 0 (朝左) 时保持 ( 凸面朝左。
        ctx.scale(-this.direction, 1);
        if (image.complete && image.naturalWidth > 0) {
          ctx.drawImage(image, -26, -30, 52, 60);
        } else {
          ctx.beginPath();
          ctx.arc(4, 0, 23, -Math.PI * 0.42, Math.PI * 0.42, false);
          ctx.strokeStyle = '#a3e635';
          ctx.lineWidth = 7;
          ctx.stroke();
        }
        ctx.restore();
      }
    });
  }

  useUltimate(_opponent, context) {
    this.ultimateAnimTimer = SPRITE_FRAMES.ultimate / 12;
    this.applyStatus('invincible', 1);
    this.ultimateOutlineTimer = 1;
    this.ultimateCastElapsed = 0;
    this.ultimateWaveFired = false;
    context.spawnFloatingText(this.getCenterX(), this.y - 26, '【耀光破阵斩】', '#facc15');
  }

  advanceUltimate(dt, context) {
    if (this.ultimateCastElapsed === null) return;
    this.ultimateCastElapsed += dt;
    // 起手蓄力后，在第五帧释放加宽的圆弧剑气投掷物。
    if (!this.ultimateWaveFired && this.ultimateCastElapsed >= 5 / 12) {
      this.ultimateWaveFired = true;
      const image = this.ultimateWaveImage;
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
    if (this.ultimateCastElapsed >= SPRITE_FRAMES.ultimate / 12) this.ultimateCastElapsed = null;
  }
}
