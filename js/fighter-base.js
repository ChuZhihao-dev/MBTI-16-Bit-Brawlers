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

    this.attackAnimTimer = 0;
    this.skillAnimTimer = 0;
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
    this.attackAnimTimer = Math.max(0, this.attackAnimTimer - dt);
    this.skillAnimTimer = Math.max(0, this.skillAnimTimer - dt);
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
    const canMove = canAct && this.statusEffects.rooted <= 0;

    // 2. 水平移动（带起步跟手性与受击击退保留）
    if (canMove) {
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

    // 3. 动作触发（普攻 / 特技 / 终极奥义）
    if (canAct) {
      if (input.attack && this.basicCd <= 0) {
        this.basicCd = this.basicCdMax;
        this.attackAnimTimer = 0.16;
        if (this.spriteAnimator) {
          this.spriteAnimator.reset('attack');
        }
        this.useBasicAttack(opponent, context);
      }

      if (input.skill && this.skillCd <= 0) {
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
    this.vy += context.gravity * dt;
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // 5. 地面与左右空气墙碰撞
    if (this.y + this.height >= context.groundY) {
      this.y = context.groundY - this.height;
      this.vy = 0;
      this.onGround = true;
    }

    if (this.x < 12) {
      this.x = 12;
      this.vx = 0;
    } else if (this.x + this.width > context.arenaWidth - 12) {
      this.x = context.arenaWidth - 12 - this.width;
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

    this.hp = Math.max(0, this.hp - amount);
    this.hitFlashTimer = 0.12;
    this.gainEp(Math.round(amount * 0.9));
    if (attacker) {
      attacker.gainEp(Math.round(amount * 1.1));
    }

    if (this.statusEffects.superArmor <= 0) {
      this.vx = knockbackX;
      this.vy = knockbackY;
      this.hitstunTimer = 0.18;
      if (this.spriteAnimator && this.spriteAnimator.hasAnimation('hit')) {
        this.spriteAnimator.reset('hit');
      }
      if (knockbackY < 0) this.onGround = false;
    }

    context.triggerHitstop(amount >= 18 ? 5 : 3);
    context.triggerShake(amount >= 18 ? 9 : 4, 0.14);
    if (context.spawnParticles) {
      context.spawnParticles(
        this.getCenterX(),
        this.getCenterY(),
        attacker ? attacker.color : '#f97316',
        amount >= 18 ? 14 : 7
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

    // 围绕角色中心翻转坐标系，子类只需按“面朝右”绘制即可
    ctx.translate(this.getCenterX(), this.getCenterY());
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

    // 状态特效外框
    if (this.statusEffects.shield > 0) {
      const radius = Math.max(halfW, halfH) + 12 + Math.sin(performance.now() / 80) * 2;
      const isFlashing = this.shieldFlashTimer > 0;
      ctx.save();
      // 半透明能量罩填充
      ctx.fillStyle = isFlashing
        ? 'rgba(250, 204, 21, 0.35)'
        : 'rgba(16, 185, 129, 0.18)';
      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, Math.PI * 2);
      ctx.fill();

      // 外圈高对比护盾边框
      ctx.strokeStyle = isFlashing ? '#f59e0b' : '#059669';
      ctx.lineWidth = isFlashing ? 4 : 3;
      ctx.stroke();

      // 旋转虚线能量环
      ctx.rotate((performance.now() / 400) * this.facing);
      ctx.setLineDash([10, 8]);
      ctx.strokeStyle = isFlashing ? '#ffffff' : '#34d399';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, radius - 5, 0, Math.PI * 2);
      ctx.stroke();
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
