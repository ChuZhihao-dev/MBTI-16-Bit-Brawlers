import { FighterBase } from '../fighter-base.js';

export class INTJ extends FighterBase {
  constructor(config) {
    super({
      ...config,
      id: 'intj',
      name: 'INTJ',
      title: '建筑师 · 紫老头',
      color: '#7c3aed',
      maxHp: 120,
      speed: 280,
      jumpForce: 600,
      skillCdMax: 4.5
    });
  }

  // 死亡凝视：短距紫色激光
  useBasicAttack(_opponent, context) {
    const beamWidth = 84;
    context.spawnProjectile({
      owner: this,
      x: this.facing === 1 ? this.x + this.width : this.x - beamWidth,
      y: this.y + 18,
      width: beamWidth,
      height: 12,
      vx: this.facing * 520,
      lifetime: 0.18,
      damage: 9,
      knockbackX: 180,
      knockbackY: -100,
      color: '#c084fc',
      hitLabel: '逻辑漏洞!'
    });
  }

  // 战术布局：脚下放置隐形陷阱，踩中禁锢 1.5 秒
  useSkill(_opponent, context) {
    context.spawnFloatingText(this.getCenterX(), this.y - 16, '战术布局!', '#c084fc');
    context.spawnProjectile({
      owner: this,
      x: this.getCenterX() - 20,
      y: context.groundY - 10,
      width: 40,
      height: 10,
      lifetime: 6,
      onHit(target, ctx) {
        target.applyStatus('rooted', 1.5);
        target.takeDamage(6, 0, 0, this.owner, ctx, '全在算计中!');
      },
      draw(ctx) {
        ctx.fillStyle = 'rgba(124, 58, 237, 0.35)';
        ctx.fillRect(this.x, this.y, this.width, this.height);
      }
    });
  }

  // 【一切尽在掌握】：无敌 2 秒并闪现至对手身后暴击
  useUltimate(opponent, context) {
    this.applyStatus('invincible', 2.0);
    const offset = opponent.facing === 1 ? -68 : opponent.width + 20;
    this.x = Math.max(16, Math.min(context.arenaWidth - this.width - 16, opponent.x + offset));
    this.facing = opponent.getCenterX() >= this.getCenterX() ? 1 : -1;
    opponent.takeDamage(26, this.facing * 360, -240, this, context, '一切尽在掌握!');
  }

  drawCustom(ctx, halfW, halfH) {
    // 紫框眼镜
    ctx.fillStyle = '#0f172a';
    ctx.strokeStyle = '#c084fc';
    ctx.lineWidth = 2;
    ctx.fillRect(0, -halfH + 16, 18, 10);
    ctx.strokeRect(0, -halfH + 16, 18, 10);
    // 皱眉线条
    ctx.strokeStyle = '#0f172a';
    ctx.beginPath();
    ctx.moveTo(2, -halfH + 12);
    ctx.lineTo(14, -halfH + 15);
    ctx.stroke();
  }
}
