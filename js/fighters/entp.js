import { FighterBase } from '../fighter-base.js';

export class ENTP extends FighterBase {
  constructor(config) {
    super({
      ...config,
      id: 'entp',
      name: 'ENTP',
      title: '辩论家 · 杠精',
      color: '#a855f7',
      maxHp: 95,
      speed: 360,
      jumpForce: 660,
      basicCdMax: 0.25,
      skillCdMax: 3.8
    });
  }

  // 快速反驳：高频发射小型文字气泡
  useBasicAttack(_opponent, context) {
    context.spawnProjectile({
      owner: this,
      x: this.facing === 1 ? this.x + this.width : this.x - 24,
      y: this.y + 20,
      width: 24,
      height: 18,
      vx: this.facing * 560,
      lifetime: 0.7,
      damage: 6,
      knockbackX: 140,
      knockbackY: -60,
      color: '#e879f9',
      hitLabel: '未必吧!',
      draw(ctx) {
        ctx.fillStyle = '#f5d0fe';
        ctx.fillRect(this.x, this.y, this.width, this.height);
        ctx.fillStyle = '#581c87';
        ctx.font = 'bold 11px monospace';
        ctx.fillText('但是', this.x + 2, this.y + 13);
      }
    });
  }

  // 话题转移：向后瞬移一段距离
  useSkill(_opponent, context) {
    this.x = Math.max(
      16,
      Math.min(context.arenaWidth - this.width - 16, this.x - this.facing * 140)
    );
    context.spawnFloatingText(this.getCenterX(), this.y - 16, '话题转移!', '#e879f9');
  }

  // 【杠精领域】：全屏问号弹幕 + 混乱（左右键反转）
  useUltimate(opponent, context) {
    context.spawnFloatingText(this.getCenterX(), this.y - 24, '杠精领域!', '#fb7185');
    for (let i = 0; i < 6; i++) {
      const dropX = 60 + i * 160;
      context.spawnProjectile({
        owner: this,
        x: dropX,
        y: -40 - (i % 2) * 50,
        width: 28,
        height: 28,
        vy: 520,
        lifetime: 1.5,
        onHit(target, ctx) {
          target.applyStatus('confused', 3.0);
          target.takeDamage(10, 0, -140, this.owner, ctx, '逻辑混乱!');
        },
        draw(ctx) {
          ctx.fillStyle = '#fb7185';
          ctx.font = 'bold 26px monospace';
          ctx.fillText('?', this.x + 6, this.y + 24);
        }
      });
    }
    opponent.applyStatus('confused', 3.0);
  }

  drawCustom(ctx, halfW, halfH) {
    // 坏笑嘴角
    ctx.strokeStyle = '#fef08a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(8, -halfH + 34, 8, 0.1 * Math.PI, 0.9 * Math.PI);
    ctx.stroke();

    // 手持小喇叭
    ctx.fillStyle = '#facc15';
    ctx.beginPath();
    ctx.moveTo(halfW, 0);
    ctx.lineTo(halfW + 14, -8);
    ctx.lineTo(halfW + 14, 8);
    ctx.closePath();
    ctx.fill();
  }
}
