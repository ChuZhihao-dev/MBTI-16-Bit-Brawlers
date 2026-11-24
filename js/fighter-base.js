import { SpriteAnimator } from './sprite-animator.js';

export class FighterBase {
  constructor(config) {
    this.playerIndex = config.playerIndex; // 1 或 2
    this.id = config.id || 'base';
    this.name = config.name || 'MBTI';
    this.title = config.title || '基础格斗家';
    this.ultimateName = config.ultimateName || '终极奥义';
    this.color = config.color || '#94a3b8';

    // 尺寸与位置
    this.width = config.width || 48;
    this.height = config.height || 76;
    this.x = config.x ?? 200;
    this.y = config.y ?? 360;
    this.vx = 0;
    this.vy = 0;
    this.facing = config.facing ?? 1; // 1 朝右, -1 朝左
    this.onGround = false;

    // 战斗数值
    this.maxHp = config.maxHp ?? 100;
    this.hp = this.maxHp;
    this.maxEp = 100;
    this.ep = 0;
    this.speed = config.speed ?? 320;
    this.jumpForce = config.jumpForce ?? 620;

    // 冷却与动作计时（秒）
    this.basicCd = 0;
    this.basicCdMax = config.basicCdMax ?? 0.35;
    this.skillCd = 0;
    this.skillCdMax = config.skillCdMax ?? 3.5;
    this.dashCd = 0;
    this.dashCdMax = config.dashCdMax ?? 0.85;

    this.attackAnimTimer = 0;
    this.skillAnimTimer = 0;
    this.dashTimer = 0;
    this.dashDir = this.facing;
    this.guarding = false;
    this.dropThroughTimer = 0;
    this.chargeState = null; // { slot: 'skill1'|'skill2', elapsed, maxDuration, level, color, dir }
    this._chargeWaitRelease = { skill1: false, skill2: false };
    this.ultimateAnimTimer = 0;
    this.ultimateAnimDuration = 0;
    this.hitFlashTimer = 0;
    this.shieldFlashTimer = 0;
    this.hitstunTimer = 0;
    this.coyoteTimer = 0;
    this.jumpBufferTimer = 0;
    this.animState = 'idle';
    this.spriteHeight = config.spriteHeight ?? 118;
    this.spriteFootOffset = config.spriteFootOffset ?? 6;
    this.spriteAnimator = config.sprites
      ? new SpriteAnimator(config.sprites, this.spriteHeight)
      : null;

    // 统一状态效果计时器（秒）
    this.statusEffects = {
      rooted: 0,      // 禁锢：无法移动和跳跃
      confused: 0,    // 混乱：左右方向反转
      slowed: 0,      // 减速：颜料命中后短暂降低移速
      invincible: 0,  // 无敌：免疫伤害与击飞
      superArmor: 0,  // 霸体：受击不击飞
      exhausted: 0,   // 虚弱：无法移动与释放技能
      shield: 0       // 共情护盾：吸收伤害并转化为 EP
    };
  }

  getCenterX() {
    return this.x + this.width / 2;
  }

  getCenterY() {
    return this.y + this.height / 2;
  }

  getHurtbox() {
    return { x: this.x, y: this.y, width: this.width, height: this.height };
  }

  applyStatus(name, duration) {
    if (name in this.statusEffects) {
      this.statusEffects[name] = Math.max(this.statusEffects[name], duration);
    }
  }

  gainEp(amount) {
    this.ep = Math.min(this.maxEp, Math.max(0, this.ep + amount));
  }

  update(dt, input, opponent, context) {
    // 1. 冷却与视觉计时器衰减
    this.basicCd = Math.max(0, this.basicCd - dt);
    this.skillCd = Math.max(0, this.skillCd - dt);
    this.dashCd = Math.max(0, this.dashCd - dt);
    this.attackAnimTimer = Math.max(0, this.attackAnimTimer - dt);
    this.skillAnimTimer = Math.max(0, this.skillAnimTimer - dt);
    this.dashTimer = Math.max(0, this.dashTimer - dt);
    this.dropThroughTimer = Math.max(0, this.dropThroughTimer - dt);
    this.ultimateAnimTimer = Math.max(0, this.ultimateAnimTimer - dt);
    this.hitFlashTimer = Math.max(0, this.hitFlashTimer - dt);
    this.shieldFlashTimer = Math.max(0, this.shieldFlashTimer - dt);
    this.hitstunTimer = Math.max(0, this.hitstunTimer - dt);

    if (this.onGround) {
      this.coyoteTimer = 0.09;
    } else {
      this.coyoteTimer = Math.max(0, this.coyoteTimer - dt);
    }

    if (input.up) {
      this.jumpBufferTimer = 0.1;
    } else {
      this.jumpBufferTimer = Math.max(0, this.jumpBufferTimer - dt);
    }

    for (const key of Object.keys(this.statusEffects)) {
      if (this.statusEffects[key] > 0) {
        this.statusEffects[key] = Math.max(0, this.statusEffects[key] - dt);
      }
    }

    const inUltimate = this.ultimateAnimTimer > 0;
    const canAct = !inUltimate && this.statusEffects.exhausted <= 0 && this.hitstunTimer <= 0;

    // 通用闪避（L / 3）
    if (canAct && input.dash && this.dashTimer <= 0 && this.dashCd <= 0 && this.statusEffects.rooted <= 0) {
      const dashInputDir = Number(Boolean(input.right)) - Number(Boolean(input.left));
      this.dashDir = dashInputDir !== 0 ? dashInputDir : this.facing;
      this.facing = this.dashDir;
      this.dashCd = this.dashCdMax;
      this.dashTimer = 0.22;
      this.applyStatus('invincible', 0.16);
      context.sfx?.dash();
      context.spawnAfterimage?.(this, this.color);
      if (context.spawnParticles) {
        context.spawnParticles(this.getCenterX(), this.getCenterY(), this.color, 6);
      }
    }
    if (this.dashTimer > 0 && Math.floor(this.dashTimer * 25) !== Math.floor((this.dashTimer + dt) * 25)) {
      context.spawnAfterimage?.(this, this.color);
    }

    // 通用防御（S / ↓）；站在空中平台时按住 下+跳 可快速穿落
    const onFloatingPlatform = this.onGround && this.y + this.height < context.groundY - 4;
    if (canAct && onFloatingPlatform && input.guard && input.up) {
      this.dropThroughTimer = 0.22;
      this.onGround = false;
      this.y += 4;
      this.jumpBufferTimer = 0;
      this.coyoteTimer = 0;
      this.guarding = false;
    } else if (input.guard !== undefined) {
      this.guarding = Boolean(canAct && this.onGround && input.guard && this.dashTimer <= 0);
    }

    const isDashing = this.dashTimer > 0;
    const canMove = canAct && !isDashing && !this.guarding && this.statusEffects.rooted <= 0;

    // 2. 水平移动（带起步跟手性与受击击退保留）
    if (isDashing && canAct) {
      this.vx = this.dashDir * (this.speed * 2.1);
    } else if (canMove) {
      let moveDir = 0;
      if (input.left) moveDir -= 1;
      if (input.right) moveDir += 1;
      if (this.statusEffects.confused > 0) moveDir *= -1;

      if (moveDir !== 0) {
        this.vx = moveDir * this.speed * (this.statusEffects.slowed > 0 ? 0.65 : 1);
        this.facing = moveDir;
      } else {
        this.vx *= Math.pow(0.0002, dt);
        if (Math.abs(this.vx) < 10) this.vx = 0;
      }

      // 跳跃（支持土狼时间与输入缓冲）
      if (this.jumpBufferTimer > 0 && this.coyoteTimer > 0) {
        this.vy = -this.jumpForce;
        this.onGround = false;
        this.coyoteTimer = 0;
        this.jumpBufferTimer = 0;
      }
    } else {
      this.vx *= Math.pow(0.03, dt);
    }

    // 3. 动作触发（普攻 / 特技 / 终极奥义，兼容统一 6 键与旧 3 键输入）
    if (canAct && !isDashing && !this.guarding) {
      const triggerAttack = input.attack !== undefined ? input.attack : Boolean(input.lightAttack);
      const triggerSkill = input.skill !== undefined
        ? input.skill
        : Boolean(input.heavyAttack || input.skill1 || input.skill2);

      if (triggerAttack && this.basicCd <= 0) {
        this.basicCd = this.basicCdMax;
        this.attackAnimTimer = 0.16;
        if (this.spriteAnimator) {
          this.spriteAnimator.reset('attack');
        }
        this.useBasicAttack(opponent, context);
      }

      if (triggerSkill && this.skillCd <= 0) {
        this.skillCd = this.skillCdMax;
        if (this.spriteAnimator && this.spriteAnimator.hasAnimation('skill')) {
          this.spriteAnimator.reset('skill');
        }
        this.useSkill(opponent, context);
      }

      if (input.ultimate && this.ep >= this.maxEp) {
        this.ep = 0;
        this.vx = 0;
        this.useUltimate(opponent, context);
        if (this.ultimateAnimTimer <= 0) {
          this.ultimateAnimTimer = 1.05;
        }
        this.ultimateAnimDuration = this.ultimateAnimTimer;
        if (this.spriteAnimator) {
          this.spriteAnimator.reset('ultimate');
        }
        if (context.onUltimateStart) {
          context.onUltimateStart(this);
        }
      }
    }

    // 4. 重力与位置积分
    const prevBottom = this.y + this.height;
    this.vy += context.gravity * dt;
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // 5. 单向悬浮平台、主地面与舞台左右边界碰撞
    this.onGround = false;
    if (this.vy >= 0 && this.dropThroughTimer <= 0 && Array.isArray(context.platforms)) {
      const currBottom = this.y + this.height;
      for (const plat of context.platforms) {
        const horizOverlap = this.x + this.width > plat.x + 8 && this.x < plat.x + plat.width - 8;
        if (horizOverlap && prevBottom <= plat.y + 10 && currBottom >= plat.y) {
          this.y = plat.y - this.height;
          this.vy = 0;
          this.onGround = true;
          break;
        }
      }
    }

    if (!this.onGround && this.y + this.height >= context.groundY) {
      this.y = context.groundY - this.height;
      this.vy = 0;
      this.onGround = true;
    }

    const leftBound = context.stageLeft ?? 12;
    const rightBound = (context.stageRight ?? context.arenaWidth - 12) - this.width;
    if (this.x < leftBound) {
      this.x = leftBound;
      this.vx = 0;
    } else if (this.x > rightBound) {
      this.x = rightBound;
      this.vx = 0;
    }

    // 6. 更新当前动画状态与精灵帧
    if (this.ultimateAnimTimer > 0) {
      this.animState = 'ultimate';
    } else if (this.hitstunTimer > 0 && this.spriteAnimator && this.spriteAnimator.hasAnimation('hit')) {
      this.animState = 'hit';
    } else if (this.skillAnimTimer > 0 && this.spriteAnimator && this.spriteAnimator.hasAnimation('skill')) {
      this.animState = 'skill';
    } else if (this.attackAnimTimer > 0) {
      this.animState = 'attack';
    } else if (!this.onGround) {
      this.animState = 'jump';
    } else if (Math.abs(this.vx) > 25) {
      this.animState = 'walk';
    } else {
      this.animState = 'idle';
    }

    if (this.spriteAnimator) {
      this.spriteAnimator.update(dt, this.animState);
    }
  }

  /**
   * 通用受击处理：处理无敌、护盾、霸体、击退、顿帧与震屏
   */
  takeDamage(amount, knockbackX, knockbackY, attacker, context, hitLabel = '') {
    if (this.statusEffects.invincible > 0) {
      context.spawnFloatingText(this.getCenterX(), this.y - 14, 'MISS!', '#a855f7');
      return false;
    }

    if (this.statusEffects.shield > 0) {
      const absorbedEp = Math.round(amount * 1.5);
      this.gainEp(absorbedEp);
      this.shieldFlashTimer = 0.14;
      context.triggerHitstop(2);
      context.triggerShake(3, 0.08);
      if (context.spawnParticles) {
        context.spawnParticles(this.getCenterX(), this.getCenterY(), '#10b981', 8);
      }
      // 近身攻击被格挡时产生轻微弹反击退
      if (attacker && Math.abs(attacker.getCenterX() - this.getCenterX()) < 105) {
        const pushDir = attacker.getCenterX() >= this.getCenterX() ? 1 : -1;
        attacker.vx = pushDir * 200;
      }
      const shieldText = this.id === 'infj' ? `共情吸收 +${absorbedEp}EP` : `护盾吸收 +${absorbedEp}EP`;
      context.spawnFloatingText(this.getCenterX(), this.y - 16, shieldText, '#10b981');
      return false;
    }

    if (this.guarding) {
      const fromFront = !attacker || Math.sign(attacker.getCenterX() - this.getCenterX()) === this.facing || attacker.getCenterX() === this.getCenterX();
      if (fromFront) {
        const chipDamage = Math.max(1, Math.round(amount * 0.3));
        this.hp = Math.max(0, this.hp - chipDamage);
        this.shieldFlashTimer = 0.12;
        this.vx = knockbackX * 0.25;
        this.gainEp(Math.round(amount * 0.5));
        context.triggerHitstop(3);
        context.triggerShake(3, 0.08, Math.sign(knockbackX), 0);
        context.sfx?.guardBlock();
        context.spawnHitSpark?.(this.getCenterX() + this.facing * 18, this.getCenterY(), '#38bdf8', 'guard', -this.facing);
        if (context.spawnParticles) {
          context.spawnParticles(this.getCenterX() + this.facing * 16, this.getCenterY(), '#38bdf8', 6);
        }
        context.spawnFloatingText(this.getCenterX(), this.y - 16, `格挡 -${chipDamage}`, '#38bdf8');
        return true;
      }
    }

    this.hp = Math.max(0, this.hp - amount);
    this.hitFlashTimer = amount >= 11 ? 0.16 : 0.12;
    this.gainEp(Math.round(amount * 0.9));
    if (attacker) {
      attacker.gainEp(Math.round(amount * 1.1));
    }

    if (this.statusEffects.superArmor <= 0) {
      this.vx = knockbackX;
      this.vy = knockbackY;
      this.hitstunTimer = amount >= 11 ? 0.24 : 0.17;
      if (this.spriteAnimator && this.spriteAnimator.hasAnimation('hit')) {
        this.spriteAnimator.reset('hit');
      }
      if (knockbackY < 0) this.onGround = false;
    }

    const hitKind = amount >= 20 ? 'ultimate' : amount >= 11 ? 'heavy' : 'light';
    const hitDir = Math.sign(knockbackX) || (attacker ? attacker.facing : -this.facing);
    context.triggerHitstop(hitKind === 'ultimate' ? 7 : hitKind === 'heavy' ? 5 : 3);
    context.triggerShake(
      hitKind === 'ultimate' ? 11 : hitKind === 'heavy' ? 7 : 4,
      hitKind === 'light' ? 0.11 : 0.18,
      hitDir,
      knockbackY < -140 ? -0.35 : 0
    );
    if (hitKind === 'light') context.sfx?.hitLight();
    else context.sfx?.hitHeavy();
    context.spawnHitSpark?.(
      this.getCenterX() - hitDir * 10,
      this.getCenterY() - 6,
      attacker ? attacker.color : '#fde047',
      hitKind,
      hitDir
    );
    if (context.spawnParticles) {
      context.spawnParticles(
        this.getCenterX(),
        this.getCenterY(),
        attacker ? attacker.color : '#f97316',
        hitKind === 'ultimate' ? 16 : hitKind === 'heavy' ? 11 : 7
      );
    }

    if (hitLabel) {
      context.spawnFloatingText(this.getCenterX(), this.y - 16, hitLabel, '#fde047');
    } else {
      context.spawnFloatingText(this.getCenterX(), this.y - 14, `-${amount}`, '#fb7185');
    }

    return true;
  }

  /**
   * 通用蓄力小技能状态机：子类只需调用 updateChargeSkill(...) 并重写 onChargeSkillRelease(...)
   * 返回 true 表示角色当前正处于蓄力中（用于锁定移动或其它动作）
   */
  updateChargeSkill(dt, input, opponent, context, options = {}) {
    const {
      canStart = true,
      maxDuration = 1.05,
      lv2Time = 0.42,
      lv3Time = 0.95,
      canUseSlot = () => true,
      getSlotColor = () => this.color
    } = options;

    if (!input.skill1Held) this._chargeWaitRelease.skill1 = false;
    if (!input.skill2Held) this._chargeWaitRelease.skill2 = false;

    if (this.hitstunTimer > 0 || this.statusEffects.exhausted > 0 || this.ultimateAnimTimer > 0) {
      this.chargeState = null;
      return false;
    }

    const readAimDir = () => {
      const horiz = Number(Boolean(input.right)) - Number(Boolean(input.left));
      if (input.upHeld || input.up) return 'up';
      if (input.guard) return 'down';
      if (horiz !== 0) return horiz === this.facing ? 'forward' : 'back';
      return null;
    };

    if (this.chargeState) {
      const cs = this.chargeState;
      const stillHeld = cs.slot === 'skill1' ? Boolean(input.skill1Held) : Boolean(input.skill2Held);
      const aimed = readAimDir();
      if (aimed) cs.dir = aimed;
      cs.elapsed = Math.min(cs.maxDuration, cs.elapsed + dt);
      const nextLevel = cs.elapsed >= lv3Time ? 3 : cs.elapsed >= lv2Time ? 2 : 1;
      if (nextLevel > cs.level) {
        cs.level = nextLevel;
        context.sfx?.chargeStep(nextLevel);
        context.spawnHitSpark?.(
          this.getCenterX(),
          this.getCenterY(),
          nextLevel === 3 ? '#fef08a' : cs.color,
          nextLevel === 3 ? 'heavy' : 'light',
          this.facing
        );
      }
      // 蓄力过程向内汇聚能量微粒
      if (Math.random() < (cs.level === 3 ? 0.55 : 0.28) && context.spawnParticles) {
        context.spawnParticles(
          this.getCenterX() + (Math.random() - 0.5) * 44,
          this.getCenterY() + (Math.random() - 0.5) * 44,
          cs.level === 3 ? '#fef08a' : cs.color,
          1
        );
      }
      if (!stillHeld) {
        const chargeInfo = {
          level: cs.level,
          ratio: Math.min(1, cs.elapsed / Math.max(0.01, cs.maxDuration)),
          dir: cs.dir || 'neutral'
        };
        const slot = cs.slot;
        this.chargeState = null;
        this._chargeWaitRelease[slot] = true;
        this.onChargeSkillRelease(slot, chargeInfo, opponent, context);
      }
      return Boolean(this.chargeState);
    }

    if (canStart) {
      const wantSkill1 = Boolean(input.skill1 || (input.skill1Held && !this._chargeWaitRelease.skill1));
      const wantSkill2 = Boolean(input.skill2 || (input.skill2Held && !this._chargeWaitRelease.skill2));
      if (wantSkill1 && canUseSlot('skill1')) {
        this.chargeState = {
          slot: 'skill1',
          elapsed: 0,
          maxDuration,
          level: 1,
          color: getSlotColor('skill1'),
          dir: readAimDir() || 'neutral'
        };
        this.vx = 0;
        return true;
      }
      if (wantSkill2 && canUseSlot('skill2')) {
        this.chargeState = {
          slot: 'skill2',
          elapsed: 0,
          maxDuration,
          level: 1,
          color: getSlotColor('skill2'),
          dir: readAimDir() || 'neutral'
        };
        this.vx = 0;
        return true;
      }
    }
    return false;
  }

  /**
   * 蓄力小技能释放钩子（各角色子类重写以实现完全不同的专属效果与方向派生）
   */
  onChargeSkillRelease(_slot, _chargeInfo, opponent, context) {
    this.useSkill(opponent, context);
  }

  /**
   * 默认近战普攻（子类可重写为激光、弹幕、冲刺等）
   */
  useBasicAttack(opponent, context) {
    const reach = 46;
    const hitbox = {
      x: this.facing === 1 ? this.x + this.width : this.x - reach,
      y: this.y + 16,
      width: reach,
      height: 40
    };

    if (context.rectsOverlap(hitbox, opponent.getHurtbox())) {
      opponent.takeDamage(8, this.facing * 240, -140, this, context, '破防!');
    }
  }

  /**
   * 性格特技（子类重写）
   */
  useSkill(opponent, context) {
    context.spawnFloatingText(this.getCenterX(), this.y - 16, `${this.name} 特技!`, this.color);
  }

  /**
   * 终极奥义（子类重写）
   */
  useUltimate(opponent, context) {
    context.spawnFloatingText(this.getCenterX(), this.y - 24, `${this.name} 终极奥义!`, '#facc15');
  }

  /**
   * 基础几何造型渲染 + 自动朝向翻转后调用 drawCustom(ctx)
   */
  draw(ctx) {
    ctx.save();

    // 脚底阴影
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.beginPath();
    ctx.ellipse(this.getCenterX(), this.y + this.height, this.width * 0.55, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // 围绕角色中心翻转坐标系，受击闪白期间叠加高频微颤（拳拳到肉反馈）
    const vibX = this.hitFlashTimer > 0 ? Math.sin(performance.now() * 0.09) * 4.5 : 0;
    ctx.translate(this.getCenterX() + vibX, this.getCenterY());
    ctx.scale(this.facing, 1);

    const halfW = this.width / 2;
    const halfH = this.height / 2;
    const spriteFrame = this.spriteAnimator
      ? this.spriteAnimator.getCurrentFrame(this.animState)
      : null;

    if (spriteFrame) {
      if (this.hitFlashTimer > 0) {
        ctx.filter = 'brightness(2.5)';
      }
      // 若该动作帧使用高清 renderHeight，则在普通舞台上按 spriteHeight 等比显示
      const drawH = Math.min(spriteFrame.height, this.spriteHeight)
        * (this.getSpriteRenderScale?.(spriteFrame) ?? 1);
      const drawW = (spriteFrame.width / spriteFrame.height) * drawH;
      // 脚底对齐碰撞盒底部 (halfH)
      ctx.drawImage(
        spriteFrame,
        -drawW / 2,
        halfH - drawH + this.spriteFootOffset,
        drawW,
        drawH
      );
      ctx.filter = 'none';
    } else {
      // 躯干底色（受击闪白）
      ctx.fillStyle = this.hitFlashTimer > 0 ? '#ffffff' : this.color;
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 3;
      ctx.fillRect(-halfW, -halfH, this.width, this.height);
      ctx.strokeRect(-halfW, -halfH, this.width, this.height);

      // 简单出拳方块动画
      if (this.attackAnimTimer > 0) {
        ctx.fillStyle = '#fde047';
        ctx.fillRect(halfW - 2, -8, 22, 14);
        ctx.strokeRect(halfW - 2, -8, 22, 14);
      }

      // 子类专属配件与表情
      this.drawCustom(ctx, halfW, halfH);
    }

    // 通用蓄力小技能聚能光环与进度弧（所有角色共享，颜色随角色与档位变化）
    if (this.chargeState) {
      const cs = this.chargeState;
      const ratio = Math.min(1, cs.elapsed / Math.max(0.01, cs.maxDuration));
      const now = performance.now();
      const ringColor = cs.level >= 3 ? '#facc15' : cs.level === 2 ? '#38bdf8' : cs.color;
      ctx.save();
      // 聚能呼吸光圈
      const pulse = 1 + Math.sin(now / (cs.level >= 3 ? 55 : 95)) * 0.08;
      ctx.strokeStyle = ringColor;
      ctx.globalAlpha = 0.45 + ratio * 0.45;
      ctx.lineWidth = cs.level >= 3 ? 4 : 2.5;
      ctx.beginPath();
      ctx.arc(0, 0, (Math.max(halfW, halfH) + 12) * pulse, 0, Math.PI * 2);
      ctx.stroke();

      // 头顶蓄力进度圆弧
      ctx.globalAlpha = 0.92;
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(0, -halfH - 20, 11, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * ratio);
      ctx.stroke();
      ctx.restore();
    }

    // 通用格挡护盾光弧（非 ENFJ 时显示）
    if (this.guarding && this.id !== 'enfj') {
      ctx.save();
      ctx.strokeStyle = this.shieldFlashTimer > 0 ? '#fde047' : '#38bdf8';
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(halfW * 0.55, 0, halfH * 0.85, -Math.PI * 0.42, Math.PI * 0.42);
      ctx.stroke();
      ctx.restore();
    }

    // 球形低多边形共情防护罩（包裹整个人物且不遮挡脸部）
    if (this.statusEffects.shield > 0) {
      const now = performance.now();
      const radius = Math.max(halfW, halfH) + 22 + Math.sin(now / 90) * 2.5;
      const domeY = -10;
      const isFlashing = this.shieldFlashTimer > 0;
      ctx.save();
      ctx.translate(0, domeY);

      // 1. 径向渐变球形能量罩（中心通透不遮脸，边缘高亮）
      const domeGrad = ctx.createRadialGradient(0, 0, radius * 0.25, 0, 0, radius);
      if (isFlashing) {
        domeGrad.addColorStop(0, 'rgba(254, 240, 138, 0.12)');
        domeGrad.addColorStop(0.75, 'rgba(250, 204, 21, 0.34)');
        domeGrad.addColorStop(1, 'rgba(245, 158, 11, 0.62)');
      } else {
        domeGrad.addColorStop(0, 'rgba(52, 211, 153, 0.04)');
        domeGrad.addColorStop(0.72, 'rgba(16, 185, 129, 0.18)');
        domeGrad.addColorStop(1, 'rgba(5, 150, 105, 0.45)');
      }
      ctx.fillStyle = domeGrad;
      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, Math.PI * 2);
      ctx.fill();

      // 2. 外圈高对比防护罩边框
      ctx.strokeStyle = isFlashing ? '#f59e0b' : '#10b981';
      ctx.lineWidth = isFlashing ? 4 : 3;
      ctx.stroke();

      // 3. 球面高光弧（玻璃感防护罩）
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.72)';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(0, 0, radius - 6, -Math.PI * 0.82, -Math.PI * 0.42);
      ctx.stroke();

      // 4. 旋转低多边形六角晶格环
      ctx.save();
      ctx.rotate((now / 650) * this.facing);
      ctx.strokeStyle = isFlashing ? 'rgba(255, 255, 255, 0.85)' : 'rgba(110, 231, 183, 0.7)';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        const px = Math.cos(a) * (radius - 4);
        const py = Math.sin(a) * (radius - 4);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.stroke();
      ctx.restore();

      ctx.restore();
    }

    if (this.statusEffects.invincible > 0 && !this.suppressInvincibilityOutline) {
      ctx.strokeStyle = '#c084fc';
      ctx.lineWidth = 2;
      ctx.strokeRect(-halfW - 6, -halfH - 6, this.width + 12, this.height + 12);
    }

    ctx.restore();

    // 头顶状态标签（不随角色朝向镜像翻转）
    ctx.save();
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'center';
    if (this.statusEffects.rooted > 0) {
      ctx.fillStyle = '#a855f7';
      ctx.fillText('禁锢中', this.getCenterX(), this.y - 26);
    } else if (this.statusEffects.confused > 0) {
      ctx.fillStyle = '#fb7185';
      ctx.fillText('混乱?', this.getCenterX(), this.y - 26);
    } else if (this.statusEffects.exhausted > 0) {
      ctx.fillStyle = '#94a3b8';
      ctx.fillText('电量耗尽...', this.getCenterX(), this.y - 26);
    }
    ctx.restore();
  }

  /**
   * 子类自定义绘制（在角色局部坐标系下，原点为角色中心，默认朝右）
   */
  drawCustom(_ctx, _halfW, _halfH) {}
}
