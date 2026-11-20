# 角色类标准代码模板（Fighter Template）

新增精修角色时，参考 [infj.js](../../../../js/fighters/infj.js) 与 [isfp.js](../../../../js/fighters/isfp.js)，按以下模板创建 `js/fighters/<id>.js`：

```javascript
import { FighterBase } from '../fighter-base.js';

export class XXXX extends FighterBase {
  constructor(config) {
    super({
      ...config,
      id: 'xxxx',
      name: 'XXXX',
      title: '官方称号 · 梗昵称',
      color: '#f59e0b',       // 与 roster-16.js 保持一致
      maxHp: 100,             // 红线：90 ~ 130
      speed: 320,             // 红线：260 ~ 360
      jumpForce: 630,         // 红线：580 ~ 680
      skillCdMax: 3.6,        // 红线：3.2 ~ 4.5
      spriteHeight: 118,
      sprites: {
        idle: { src: 'assets/fighters/xxxx/frames/walk_sheet.jpeg', frames: 4, useFirstFrameOnly: true },
        walk: { src: 'assets/fighters/xxxx/frames/walk_sheet.jpeg', frames: 4, fps: 10 },
        jump: { src: 'assets/fighters/xxxx/frames/jump_sheet.jpeg', frames: 4, fps: 8, loop: false },
        attack: { src: 'assets/fighters/xxxx/frames/attack_sheet.jpeg', frames: 4, fps: 16, loop: false },
        ultimate: {
          src: 'assets/fighters/xxxx/frames/ult_sheet.jpeg',
          cols: 4,
          rows: 4,
          frames: 16,
          fps: 12,
          loop: false,
          cropInset: 5,
          renderHeight: 280   // FINAL SMASH 中央高清演出尺寸
        }
      }
    });
  }

  // 普攻（7 ~ 10 伤害）
  useBasicAttack(opponent, context) {
    this.attackAnimTimer = 0.28;
    // 可参考 FighterBase 默认近战或 spawnProjectile 远程弹幕
  }

  // 特技（12 ~ 16 伤害或护盾/控制/位移）
  useSkill(opponent, context) {
    context.spawnFloatingText(this.getCenterX(), this.y - 18, '特技名!', this.color);
  }

  // 终极奥义（总伤 24 ~ 30，判定延迟与 16 帧动画高潮帧对齐）
  useUltimate(_opponent, context) {
    this.ultimateAnimTimer = 1.35; // 16 / 12 ≈ 1.33s
    this.applyStatus('invincible', 0.9);
    context.spawnFloatingText(this.getCenterX(), this.y - 26, '【奥义名】', '#facc15');

    let elapsed = 0;
    let hitDone = false;
    const hitWidth = 140;

    context.spawnProjectile({
      owner: this,
      x: this.facing === 1 ? this.x + this.width - 10 : this.x - hitWidth + 10,
      y: this.y - 20,
      width: hitWidth,
      height: this.height + 20,
      lifetime: 1.0,
      pierce: true,
      update(dt) {
        elapsed += dt;
        this.x = this.owner.facing === 1
          ? this.owner.x + this.owner.width - 10
          : this.owner.x - hitWidth + 10;
      },
      onHit(target, ctx) {
        if (hitDone || elapsed < 0.75) return; // 第 9 帧命中（9 / 12 = 0.75s）
        hitDone = true;
        target.statusEffects.invincible = 0;
        target.statusEffects.superArmor = 0;
        target.takeDamage(26, this.owner.facing * 420, -290, this.owner, ctx, '奥义命中!');
      },
      draw() {}
    });
  }
}
```

---

## 基类与引擎可用接口速查

### `FighterBase` 状态效果（`this.applyStatus(type, seconds)`）
- `invincible`：无敌（受击弹出 `MISS!`）
- `superArmor`：霸体（受击扣血但不被击退和打断）
- `shield`：吸收护盾（格挡伤害并转化为 `1.5×` EP）
- `rooted`：禁锢（无法移动/跳跃，仍可攻击）
- `confused`：混乱（左右移动反转）
- `exhausted`：虚弱（无法移动与出招）

### 引擎 `context` 回调
- `context.rectsOverlap(a, b)`：矩形碰撞检测
- `context.spawnProjectile(proj)`：生成飞行道具 / 延迟判定框 / 陷阱
- `context.spawnFloatingText(x, y, text, color)`：生成梗文字浮动弹幕
- `context.spawnParticles(x, y, color, count)`：生成打击像素粒子
- `context.triggerHitstop(frames)`：触发顿帧（轻击 3 帧，重击/大招 5 帧）
- `context.triggerShake(intensity, duration)`：触发屏幕震动
