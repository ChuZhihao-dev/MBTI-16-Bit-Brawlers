---
name: mbti-fighter-spec
description: >-
  Standards and workflow for developing MBTI fighters, sprite sheets, animation
  frame rates, combat stats, unified controls, optional Final Smash showcases,
  knockout finishers, pause settings, and UI/SFX in MBTI-16-Bit-Brawlers
  (Type Fighter). Use this skill whenever creating or updating a character,
  importing or generating portraits/sprite sheets, tuning animation FPS or
  hitboxes, or verifying a fighter before completion.
---

# MBTI 格斗家制作与开发规范（Type Fighter）

在为《十六型人格大乱斗》新增角色、制作精灵表、调整动作帧率或扩展战斗演出时，严格遵循本规范。**后续新增的所有人物均须采用本文的统一按键与动画流程**；已有角色的旧实现需要在迁移时按本文校正。

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

### 统一按键规范

后续新增角色均按下表绑定。按键职责对所有人物保持一致，具体动作与特效由人物技能设计决定；同一角色在 1P、2P 时只切换输入映射，不改变技能职责。

| 操作 | 1P | 2P |
| :--- | :--- | :--- |
| 左右移动 | `A` / `D` | `←` / `→` |
| 跳跃 | `W` | `↑` |
| 防御类 | `S` | `↓` |
| 轻击 | `J` | `4` |
| 重击 | `K` | `5` |
| 冲刺 / 闪避 | `L` | `6` |
| 远程攻击 | `U` | `7` |
| 专属技能 | `I` | `8` |
| 必杀 | `O` | `9` |

- `L` / `6` 为独立的冲刺或闪避输入；具体朝向可结合当前移动方向和人物朝向确定。
- `S` / `↓` 为防御类输入，具体格挡姿态、持续方式及受击反馈按人物设计实现。
- 2P 的 `4`～`9` 指数字键；实现时应兼容主键盘数字键与对应小键盘数字键，避免键盘布局差异影响双人对战。

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
- **终极奥义特写为可选项**：玩家在暂停窗口中通过“终极奥义演出”开关选择是否显示。开启时，施放 `ultimate` 由 `js/engine.js` 的 `drawUltimateShowcase` 接管 **FINAL SMASH 全屏电影特写**（暗化舞台 + 放射集中线 + 中央 `292px` 高清帧播放 + 电影上下遮幅与进度条 + 暂停比赛倒计时）；关闭时跳过该全屏特写，仍须执行必杀的伤害、判定和必要的角色动作。
- **判定同步公式**：`命中延迟秒数 = 目标高潮帧序号（从 0 起算） / fps`。
  - 例：`16 帧 @ 12 fps` 总时长约 `1.35s`，第 7 帧扑击对应 `~0.52s`，第 10~11 帧爆裂对应 `~0.82s`。
- **必杀终结流程**：仅在必杀技使对手血量降至 `0` 时，先显示 `GAME OVER` **1 秒**，随后播放获胜人物的**专属奥义终结演出**的全部动作帧；动作帧播放完毕后停留在终帧 **1 秒**，最后才判定该局结束并进入结果界面。普通攻击或其他技能造成的击败不触发这段专属奥义终结演出。
- **演出顺序与完整性**：若终极奥义特写开关开启，须先完整播放现有终极奥义特写，再进入上述 `GAME OVER → 专属奥义终结演出 → 终帧停留 → 结算` 流程；若开关关闭，跳过特写但保留终结流程。不得因血量归零提前截断特写或专属终结帧。比赛倒计时、角色输入及战斗判定在终结流程中暂停，避免重复击败或提前结算。

### 3. 暂停窗口与演出开关

- 将当前**音效按钮的位置**改为**暂停按钮**。点击暂停后暂停对局并显示小窗口，窗口内提供“音效开关”和“终极奥义演出开关”；关闭窗口或继续游戏后恢复对局。
- 音效开关继续控制现有街机音效；终极奥义演出开关只控制现有全屏终极奥义特写，不取消必杀技能效果，也不跳过必杀击败后的专属奥义终结演出。
- 暂停期间冻结比赛倒计时、角色动作、飞行道具与战斗判定；窗口可清晰显示两个开关的当前状态。

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
4. **双侧朝向与大招完整播放**：确认 1P（朝右）与 2P（朝左）普攻/特技/奥义判定框镜像正确；开启终极奥义特写时，确认奥义 16 帧在中央特写中从第 1 帧完整播至第 16 帧。
5. **统一按键**：分别用 1P 与 2P 测试移动、跳跃、防御、轻击、重击、冲刺/闪避、远程攻击、专属技能和必杀，确认按键与上表一致，2P 数字键主键盘和小键盘均可用。
6. **暂停与演出选项**：确认原音效按钮位置显示暂停按钮；暂停窗口有音效与终极奥义演出两个开关；暂停时战斗和计时冻结；关闭特写后必杀伤害与终结演出仍正常执行。
7. **必杀击败结算**：确认必杀造成 `HP=0` 后依次显示 `GAME OVER` 1 秒、完整播放专属奥义终结帧、终帧停留 1 秒，再进入结果界面；开启与关闭终极奥义特写时均按正确顺序执行。
