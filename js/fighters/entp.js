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

  // 快速反驳：高频交替发射文字气泡
  useBasicAttack(_opponent, context) {
    const words = ['但是', '未必', '真的?'];
    const word = words[Math.floor(Math.random() * words.length)];
    context.spawnProjectile({
      owner: this,
      x: this.facing === 1 ? this.x + this.width : this.x - 32,
      y: this.y + 18,
      width: 32,
      height: 20,
      vx: this.facing * 560,
      lifetime: 0.75,
      damage: 6,
      knockbackX: 140,
      knockbackY: -60,
      color: '#a855f7',
      hitLabel: `${word}!`,
      draw(ctx) {
        ctx.fillStyle = '#faf5ff';
        ctx.strokeStyle = '#7e22ce';
        ctx.lineWidth = 2;
        ctx.fillRect(this.x, this.y, this.width, this.height);
        ctx.strokeRect(this.x, this.y, this.width, this.height);
        ctx.fillStyle = '#581c87';
        ctx.font = 'bold 11px monospace';
        ctx.fillText(word, this.x + 4, this.y + 14);
      }
    });
  }

  // 话题转移：向后瞬移并在原地留下嘲讽假人
  useSkill(_opponent, context) {
    const decoyX = this.x;
    const decoyY = this.y;
    const decoyW = this.width;
    const decoyH = this.height;

    this.x = Math.max(
      16,
      Math.min(context.arenaWidth - this.width - 16, this.x - this.facing * 140)
    );
    context.spawnFloatingText(this.getCenterX(), this.y - 16, '话题转移!', '#a855f7');

    context.spawnProjectile({
      owner: this,
      x: decoyX,
      y: decoyY,
      width: decoyW,
      height: decoyH,
      lifetime: 3.0,
      onHit(target, ctx) {
        target.takeDamage(10, -this.owner.facing * 240, -160, this.owner, ctx, '被钓鱼了!');
      },
      draw(ctx) {
        ctx.save();
        ctx.globalAlpha = 0.65;
        ctx.fillStyle = '#c084fc';
        ctx.strokeStyle = '#581c87';
        ctx.lineWidth = 2;
        ctx.fillRect(this.x, this.y, this.width, this.height);
        ctx.strokeRect(this.x, this.y, this.width, this.height);
        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 11px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('假人', this.x + this.width / 2, this.y + 38);
        ctx.restore();
      }
    });
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
