import { FighterBase } from '../fighter-base.js';

export class INFJ extends FighterBase {
  constructor(config) {
    super({
      ...config,
      id: 'infj',
      name: 'INFJ',
      title: '提倡者 · 绿老头',
      color: '#10b981',
      maxHp: 105,
      speed: 310,
      jumpForce: 640,
      skillCdMax: 4.0,
      spriteHeight: 112,
      sprites: {
        idle: { src: 'assets/fighters/infj/frames/walk_sheet.jpeg', frames: 4, useFirstFrameOnly: true },
        walk: { src: 'assets/fighters/infj/frames/walk_sheet.jpeg', frames: 4, fps: 10 },
        jump: { src: 'assets/fighters/infj/frames/jump_sheet.jpeg', frames: 4, fps: 8, loop: false },
        attack: { src: 'assets/fighters/infj/frames/attack_sheet.jpeg', frames: 4, fps: 16, loop: false }
      }
    });
  }

  // 礼貌微笑：中距离法杖挥击
  useBasicAttack(opponent, context) {
    this.attackAnimTimer = 0.28;
    const reach = 58;
    const hitbox = {
      x: this.facing === 1 ? this.x + this.width : this.x - reach,
      y: this.y + 10,
      width: reach,
      height: 52
    };
    if (context.rectsOverlap(hitbox, opponent.getHurtbox())) {
      opponent.takeDamage(9, this.facing * 230, -150, this, context, '礼貌微笑:)');
    }
  }

  // 共情吸收：1.2 秒绿色护盾，吸收伤害转化为自身 EP
  useSkill(_opponent, context) {
    this.applyStatus('shield', 1.2);
    context.spawnFloatingText(this.getCenterX(), this.y - 16, '共情护盾!', '#34d399');
  }

  // 【Door Slam / 关门大吉】：在对手面前拍下巨门
  useUltimate(opponent, context) {
    const doorX = opponent.getCenterX() - 28;
    context.spawnProjectile({
      owner: this,
      x: doorX,
      y: opponent.y - 160,
      width: 56,
      height: 110,
      vy: 900,
      lifetime: 0.45,
      onHit(target, ctx) {
        target.statusEffects.invincible = 0;
        target.statusEffects.superArmor = 0;
        target.takeDamage(24, this.owner.facing * 380, -280, this.owner, ctx, '关门大吉!');
      },
      draw(ctx) {
        ctx.fillStyle = '#475569';
        ctx.fillRect(this.x, this.y, this.width, this.height);
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 3;
        ctx.strokeRect(this.x, this.y, this.width, this.height);
      }
    });
  }

  drawCustom(ctx, halfW, halfH) {
    // 翡翠兜帽尖角
    ctx.fillStyle = '#059669';
    ctx.beginPath();
    ctx.moveTo(-halfW, -halfH);
    ctx.lineTo(halfW, -halfH);
    ctx.lineTo(-halfW - 10, -halfH - 14);
    ctx.closePath();
    ctx.fill();

    // 微笑假面眼睛
    ctx.fillStyle = '#ecfdf5';
    ctx.fillRect(4, -halfH + 18, 12, 8);
  }
}
