import { FighterBase } from '../fighter-base.js';

export class ENFP extends FighterBase {
  constructor(config) {
    super({
      ...config,
      id: 'enfp',
      name: 'ENFP',
      title: '竞选者 · 快乐小狗',
      color: '#34d399',
      maxHp: 95,
      speed: 390,
      jumpForce: 690,
      skillCdMax: 3.2
    });
    this.frenzyTimer = 0;
  }

  update(dt, input, opponent, context) {
    if (this.frenzyTimer > 0) {
      this.frenzyTimer -= dt;
      if (this.frenzyTimer <= 0) {
        this.frenzyTimer = 0;
        this.speed = 390;
        this.basicCdMax = 0.35;
        this.applyStatus('exhausted', 2.0);
        context.spawnFloatingText(this.getCenterX(), this.y - 20, '电量耗尽...', '#94a3b8');
      }
    }
    super.update(dt, input, opponent, context);
  }

  // 热情贴贴：向前小段冲刺并撞击
  useBasicAttack(opponent, context) {
    this.vx = this.facing * 460;
    const hitbox = {
      x: this.facing === 1 ? this.x + this.width - 6 : this.x - 40,
      y: this.y + 12,
      width: 46,
      height: 54
    };
    if (context.rectsOverlap(hitbox, opponent.getHurtbox())) {
      opponent.takeDamage(9, this.facing * 260, -160, this, context, '热情贴贴!');
    }
  }

  // 脑洞大开：随机召唤大锤（高伤）或鲜花（低伤整活）
  useSkill(opponent, context) {
    const isHammer = Math.random() < 0.65;
    context.spawnProjectile({
      owner: this,
      x: opponent.getCenterX() - 18,
      y: -30,
      width: 36,
      height: 36,
      vy: 640,
      lifetime: 1.2,
      damage: isHammer ? 18 : 3,
      knockbackX: isHammer ? 300 : 80,
      knockbackY: isHammer ? -220 : -80,
      hitLabel: isHammer ? '脑洞大锤!' : '送你一朵花~',
      draw(ctx) {
        ctx.fillStyle = isHammer ? '#ef4444' : '#f472b6';
        ctx.fillRect(this.x, this.y, this.width, this.height);
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 2;
        ctx.strokeRect(this.x, this.y, this.width, this.height);
      }
    });
  }

  // 【三分钟热度】：5 秒移速/攻速翻倍 + 霸体，结束后 2 秒电量耗尽
  useUltimate(_opponent, context) {
    this.frenzyTimer = 5.0;
    this.speed = 540;
    this.basicCdMax = 0.18;
    this.applyStatus('superArmor', 5.0);
    context.spawnFloatingText(this.getCenterX(), this.y - 24, '三分钟热度!!', '#fde047');
  }

  drawCustom(ctx, _halfW, halfH) {
    // 彩虹光环
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(0, -halfH - 10, 18, 5, 0, 0, Math.PI * 2);
    ctx.stroke();

    // 星星眼
    ctx.fillStyle = '#fef08a';
    ctx.fillRect(4, -halfH + 16, 10, 10);
  }
}
