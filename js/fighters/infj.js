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
          cropInset: 4
        }
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
