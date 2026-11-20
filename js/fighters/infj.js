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
        attack: { src: 'assets/fighters/infj/frames/attack_sheet.jpeg', frames: 4, fps: 16, loop: false },
        ultimate: {
          src: 'assets/fighters/infj/frames/ult_sheet.jpeg',
          cols: 4,
          rows: 4,
          frames: 16,
          fps: 14,
          loop: false,
          cropInset: 4,
          renderHeight: 280
        }
      }
    });
  }

  // 礼貌微笑：法杖远程发射翡翠光球
  useBasicAttack(_opponent, context) {
    this.attackAnimTimer = 0.28;
    const orbSize = 22;
    context.spawnProjectile({
      owner: this,
      x: this.facing === 1 ? this.x + this.width + 4 : this.x - orbSize - 4,
      y: this.y + 18,
      width: orbSize,
      height: orbSize,
      vx: this.facing * 540,
      lifetime: 0.9,
      damage: 9,
      knockbackX: 210,
      knockbackY: -120,
      color: '#10b981',
      hitLabel: '礼貌微笑:)',
      draw(ctx) {
        const cx = this.x + this.width / 2;
        const cy = this.y + this.height / 2;
        ctx.save();
        ctx.fillStyle = 'rgba(16, 185, 129, 0.28)';
        ctx.beginPath();
        ctx.arc(cx, cy, 15, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#34d399';
        ctx.strokeStyle = '#065f46';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx, cy, 9, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }
    });
  }

  // 共情吸收：1.2 秒绿色护盾，吸收伤害转化为自身 EP
  useSkill(_opponent, context) {
    this.applyStatus('shield', 1.2);
    context.spawnFloatingText(this.getCenterX(), this.y - 16, '共情护盾!', '#34d399');
  }

  // 【Door Slam / 关门大吉】：播放 16 帧关门动画并在身前拍下巨门
  useUltimate(_opponent, context) {
    this.ultimateAnimTimer = 1.15;
    this.applyStatus('invincible', 0.75);
    context.spawnFloatingText(this.getCenterX(), this.y - 24, 'Door Slam!', '#34d399');

    const hitWidth = 110;
    const hitX = this.facing === 1 ? this.x + this.width - 10 : this.x - hitWidth + 10;
    let slamTriggered = false;
    let delay = 0.36;

    context.spawnProjectile({
      owner: this,
      x: hitX,
      y: this.y - 20,
      width: hitWidth,
      height: this.height + 20,
      lifetime: 0.65,
      pierce: true,
      update(dt) {
        delay -= dt;
      },
      onHit(target, ctx) {
        if (slamTriggered || delay > 0) return;
        slamTriggered = true;
        target.statusEffects.invincible = 0;
        target.statusEffects.superArmor = 0;
        target.takeDamage(26, this.owner.facing * 420, -290, this.owner, ctx, '关门大吉!');
      },
      draw() {}
    });
  }
}
