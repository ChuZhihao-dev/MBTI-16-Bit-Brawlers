---
name: mbti-fighter-spec
description: >-
  Standards and workflow for developing MBTI fighters, sprite sheets, animation
  frame rates, combat stats, Final Smash ultimate cutscenes, and UI/SFX in
  MBTI-16-Bit-Brawlers (Type Fighter). Use this skill whenever creating or
  updating a character, importing or generating portraits/sprite sheets, tuning
  animation FPS or hitboxes, or verifying a fighter before completion.
---

# MBTI 格斗家制作与开发规范（Type Fighter）

在为《十六型人格大乱斗》新增角色、制作精灵表、调整动作帧率或扩展战斗演出时，严格遵循本规范。

---

## 一、美术与精灵表规范

### 1. 目录与文件命名
每个角色目录为 `assets/fighters/<id>/`（`<id>` 全小写，如 `intj`、`infj`、`isfp`）：
- `concept/portrait.png`：选人立绘，统一 **3:4 比例**（推荐 `132×176`），无底部文字说明。
- `frames/walk_sheet.jpeg`：行走/奔跑序列（待机默认复用第 1 帧）。
- `frames/jump_sheet.jpeg`：跳跃序列。
- `frames/attack_sheet.jpeg`：普攻出招序列。
- `frames/ult_sheet.jpeg`：终极奥义序列（4×4 共 16 帧）。

### 2. 画风、背景与朝向铁律
- **画风**：统一 16Personalities **低多边形扁平几何风**（Flat Low-Poly），无粗黑描边。
- **背景**：纯白 `#FFFFFF`，无渐变或地面重阴影；由 `js/sprite-animator.js` 自动从四边泛洪移除白底（保留角色内部白色细节）。
- **朝向**：所有精灵表统一**面朝右侧（Right）**，向左移动或作为 2P 时由 `FighterBase.draw` 自动镜像翻转。
- **生图提示词模板**：需要生成精灵表时，阅读 [AI 精灵表生图提示词模板](./references/sprite-prompts.md)。

---

## 二、帧率与打击感规范（参考拳皇 / 任天堂明星大乱斗）

遵循**“60 FPS 引擎逻辑帧 + 10~18 FPS 关键原画帧 + 顿帧/震屏”**原则，而非匀速 60 帧绘图：
- **底层物理与输入**：由 `requestAnimationFrame` 保持 **60 FPS** 渲染与碰撞判定。
- **精灵表动作帧率标准**：

| 动作状态 | 网格布局 | 帧数 | 推荐尺寸 | `fps` | `loop` | 关键配置与节奏说明 |
| :--- | :---: | :---: | :---: | :---: | :---: | :--- |
| `idle` | 复用 `walk_sheet` | 1（或 4） | 同 `walk` | `6 ~ 8` | `true` | 单帧配置 `useFirstFrameOnly: true`；4 帧用于微呼吸 |
| `walk` | `4×1` 横向 | 4~6 | `16:9` / `4:1` | `10 ~ 12` | `true` | 脚底基线对齐，步态连贯 |
| `jump` | `4×1` 横向 | 4 | `16:9` / `4:1` | `8 ~ 10` | `false` | 蓄力 → 起跳 → 滞空 → 落地 |
| `attack` | `4×1` 横向 | 4 | `16:9` / `4:1` | `14 ~ 18` | `false` | 短促凌厉，整套动作控制在 `0.22s ~ 0.30s` |
| `skill` | `4×1` 横向（可选） | 4~6 | `16:9` / `4:1` | `12 ~ 15` | `false` | 有明显起手，方便对手预判 |
| `ultimate` | **`4×4` 宫格** | **16** | **`1024×1024`** | **`12 ~ 14`** | `false` | 必配 `cropInset: 4~5` 去网格线，`renderHeight: 280` 供全屏高清演出 |

- **节奏与打击感技巧**：
  - 优先保证“起手快 → 命中瞬间高潮帧清晰（配合 `triggerHitstop(3~5)` 与 `triggerShake`）→ 收招利落”。
  - 如需进阶节奏，可在 `SpriteAnimator` 扩展每帧不等停留时长（如 4 帧攻击 `[0.04, 0.04, 0.12, 0.08]`），突出发力顿挫感。

---

## 三、数值平衡、大招演出与胜负规则

### 1. 角色数值红线
- **HP**：`90 ~ 130`（SJ/防御型偏高，SP/敏捷型偏低）
- **移速（`speed`）**：`260 ~ 360`
- **跳跃力（`jumpForce`）**：`580 ~ 680`
- **伤害与冷却**：
  - 普攻：`7 ~ 10` 伤害，CD `0.30 ~ 0.40s`
  - 特技：`12 ~ 16` 伤害或护盾/控制/位移，CD `3.2 ~ 4.5s`
  - 终极奥义：总伤害 `24 ~ 30`，消耗 `100 EP`，施法期间锁定移动并赋予 `0.75 ~ 1.0s` `invincible` 或 `superArmor`

### 2. 终极奥义演出与帧同步
- 施放 `ultimate` 时，由 `js/engine.js` 的 `drawUltimateShowcase` 自动接管 **FINAL SMASH 全屏电影特写**（暗化舞台 + 放射集中线 + 中央 `292px` 高清帧播放 + 电影上下遮幅与进度条 + 暂停比赛倒计时）。
- **判定同步公式**：`命中延迟秒数 = 目标高潮帧序号（从 0 起算） / fps`。
  - 例：`16 帧 @ 12 fps` 总时长约 `1.35s`，第 7 帧扑击对应 `~0.52s`，第 10~11 帧爆裂对应 `~0.82s`。
- **完整播放原则**：不得因目标血量归零而中断大招播放（当前版本已移除血量归零即刻结束逻辑；未来若开启正式 K.O. 模式，也必须等待 `ultimateAnimTimer <= 0` 后再结算）。

---

## 四、角色接入标准流程

详细代码模板与基类接口清单见 [角色类标准模板](./references/fighter-template.md)。

1. **放入静态资源**：确保 `assets/fighters/<id>/concept/portrait.png` 与 `assets/fighters/<id>/frames/*.jpeg` 就位。
2. **编写专属角色类**：新建 `js/fighters/<id>.js` 继承 `FighterBase`，配置 `sprites` 并重写 `useBasicAttack`、`useSkill`、`useUltimate`。
3. **同步元数据与注册**：
   - 更新 `js/fighters/roster-16.js` 中该角色的称号、简介、三技能文案与基础数值。
   - 在 `js/fighters/index.js` 引入角色类并注册到 `CUSTOM_CLASSES`。
4. **公共模块边界**：
   - 通用异常状态优先使用基类 `this.applyStatus(type, duration)`（`rooted` / `confused` / `invincible` / `superArmor` / `exhausted` / `shield`）。
   - 音效统一通过 `js/sfx.js` Web Audio 合成器扩展，保持零外部音频依赖。
   - 选人界面的悬停预览、锁定动效、VS 过场、HUD 头像均自动读取 `FIGHTER_ROSTER`，无需为单个角色硬编码 UI。

---

## 五、上线前验收清单（Validation）

完成每个角色或引擎修改后，必须逐项验证：
1. **语法检查**：对所有改动或新增的 JS 文件运行：
   ```bash
   node --check js/fighters/<id>.js js/fighters/index.js js/fighters/roster-16.js
   ```
2. **资源核对**：确认 `portrait.png` 为 3:4 无文字立绘，`ult_sheet.jpeg` 为 4×4 宫格且 `cropInset` 无网格残线。
3. **元数据一致**：核对 `<id>.js` 的 `maxHp / speed / jumpForce / color` 与 `roster-16.js` 完全一致。
4. **双侧朝向与大招完整播放**：确认 1P（朝右）与 2P（朝左）普攻/特技/奥义判定框镜像正确，且奥义 16 帧在中央特写中从第 1 帧完整播至第 16 帧。
