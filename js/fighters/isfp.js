import { FighterBase } from '../fighter-base.js';

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
      spriteHeight: 118,
      sprites: {
        idle: { src: 'assets/fighters/isfp/frames/walk_sheet.jpeg', frames: 4, useFirstFrameOnly: true },
        walk: { src: 'assets/fighters/isfp/frames/walk_sheet.jpeg', frames: 4, fps: 10 },
        jump: { src: 'assets/fighters/isfp/frames/walk_sheet.jpeg', frames: 4, useFirstFrameOnly: true },
        attack: { src: 'assets/fighters/isfp/frames/attack_sheet.jpeg', frames: 4, fps: 16, loop: false },
        ultimate: {
          src: 'assets/fighters/isfp/frames/ult_sheet.jpeg',
          cols: 4,
          rows: 4,
          frames: 16,
          fps: 12,
          loop: false,
          cropInset: 5,
          renderHeight: 280
        }
      }
    });
  }

  // 颜料飞溅：发射绚丽的远程色彩弹
  useBasicAttack(_opponent, context) {
    this.attackAnimTimer = 0.28;
    const palette = ['#f59e0b', '#ec4899', '#06b6d4', '#84cc16'];
    const mainColor = palette[Math.floor(Math.random() * palette.length)];
    const size = 22;

    context.spawnProjectile({
      owner: this,
      x: this.facing === 1 ? this.x + this.width + 4 : this.x - size - 4,
      y: this.y + 20,
      width: size,
      height: size,
      vx: this.facing * 520,
      lifetime: 0.85,
      damage: 8,
      knockbackX: 190,
      knockbackY: -100,
      color: mainColor,
      hitLabel: '看我心情~',
      draw(ctx) {
        const cx = this.x + this.width / 2;
        const cy = this.y + this.height / 2;
        ctx.save();
        ctx.fillStyle = mainColor;
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx, cy, 9, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#fef08a';
        ctx.beginPath();
        ctx.arc(cx - 3, cy - 3, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    });
  }

  // 灵感爆发：投掷高饱和度艺术冲击波
  useSkill(_opponent, context) {
    this.attackAnimTimer = 0.34;
    context.spawnFloatingText(this.getCenterX(), this.y - 18, '灵感爆发!', '#f59e0b');

    const waveW = 42;
    const waveH = 34;
    context.spawnProjectile({
      owner: this,
      x: this.facing === 1 ? this.x + this.width + 2 : this.x - waveW - 2,
      y: this.y + 14,
      width: waveW,
      height: waveH,
      vx: this.facing * 450,
      lifetime: 1.05,
      damage: 14,
      knockbackX: 280,
      knockbackY: -170,
      color: '#ec4899',
      hitLabel: '审美暴击!',
      draw(ctx) {
        const cx = this.x + this.width / 2;
        const cy = this.y + this.height / 2;
        ctx.save();
        const colors = ['#f59e0b', '#ec4899', '#38bdf8'];
        colors.forEach((c, idx) => {
          ctx.fillStyle = c;
          ctx.strokeStyle = '#0f172a';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(cx + (idx - 1) * 7, cy + (idx % 2 === 0 ? -4 : 4), 10 - idx, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        });
        ctx.restore();
      }
    });
  }

  // 【行为艺术】：播放 16 帧作画召唤彩虹灵犬扑击与几何爆裂终结动画
  useUltimate(_opponent, context) {
    this.ultimateAnimTimer = 1.35;
    this.applyStatus('invincible', 0.95);
    context.spawnFloatingText(this.getCenterX(), this.y - 26, '【行为艺术】', '#facc15');

    const facing = this.facing;
    const hitWidth = 145;
    const hitX = facing === 1 ? this.x + this.width - 12 : this.x - hitWidth + 12;

    let elapsed = 0;
    let pounceDone = false;
    let burstDone = false;
    let shardWaveSpawned = false;

    // 1. 近中距离跟随动画帧的二段判定（第 7 帧灵犬扑出 + 第 11 帧几何爆裂）
    context.spawnProjectile({
      owner: this,
      x: hitX,
      y: this.y - 24,
      width: hitWidth,
      height: this.height + 24,
      lifetime: 1.05,
      pierce: true,
      update(dt) {
        elapsed += dt;
        // 保持判定框贴合小画家身前
        this.x = this.owner.facing === 1
          ? this.owner.x + this.owner.width - 12
          : this.owner.x - hitWidth + 12;
        this.y = this.owner.y - 24;

        // 第 10~11 帧（约 0.82s）几何爆裂，向前额外释放彩虹碎片冲击波
        if (!shardWaveSpawned && elapsed >= 0.82) {
          shardWaveSpawned = true;
          context.triggerShake(9, 0.24);
          const shardColors = ['#ef4444', '#f59e0b', '#38bdf8', '#ec4899', '#84cc16'];
          for (let i = 0; i < 3; i++) {
            const c = shardColors[i % shardColors.length];
            context.spawnProjectile({
              owner: this.owner,
              x: this.owner.facing === 1 ? this.owner.x + this.owner.width + 24 : this.owner.x - 48,
              y: this.owner.y + 8 + i * 20,
              width: 26,
              height: 20,
              vx: this.owner.facing * (540 + i * 45),
              vy: (i - 1) * 70,
              lifetime: 0.65,
              damage: 7,
              knockbackX: 280,
              knockbackY: -180,
              color: c,
              hitLabel: '色彩崩解!',
              draw(ctx) {
                ctx.save();
                ctx.fillStyle = c;
                ctx.strokeStyle = '#0f172a';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(this.x + this.width / 2, this.y);
                ctx.lineTo(this.x + this.width, this.y + this.height);
                ctx.lineTo(this.x, this.y + this.height - 4);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
                ctx.restore();
              }
            });
          }
        }
      },
      onHit(target, ctx) {
        if (!pounceDone && elapsed >= 0.52 && elapsed < 0.82) {
          pounceDone = true;
          target.takeDamage(10, this.owner.facing * 180, -140, this.owner, ctx, '画中具象!');
        } else if (!burstDone && elapsed >= 0.82) {
          burstDone = true;
          target.statusEffects.invincible = 0;
          target.statusEffects.superArmor = 0;
          target.takeDamage(18, this.owner.facing * 430, -300, this.owner, ctx, '行为艺术!');
        }
      },
      draw() {}
    });
  }
}
