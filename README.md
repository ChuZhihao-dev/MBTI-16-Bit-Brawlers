# Type Fighter // 十六型人格大乱斗

2D 横版快节奏双人格斗小游戏（原生 HTML5 + ES Modules + Canvas 2D）。

## 本地启动方式

由于使用了浏览器原生 ES Modules，请通过本地静态服务器打开（不要直接双击 `index.html`）：

```bash
# 方式 1：Python 内置服务器
python3 -m http.server 8080
# 然后浏览器访问 http://localhost:8080

# 方式 2：VS Code 安装 Live Server 插件后右键 index.html -> Open with Live Server
```

## 统一操作规范

所有角色统一采用以下按键职责（可在顶部 **⏸ 暂停** 按钮或按 `Esc` 打开的“暂停与操作设置”弹窗中自定义键位并本地保存）：

| 操作职责 | 1P 默认按键 | 2P 默认按键（主键盘 / 小键盘均可） |
| :--- | :--- | :--- |
| 左右移动 | `A` / `D` | `←` / `→` |
| 跳跃 | `W` | `↑` |
| 下蹲 / 防御 | `S` | `↓` |
| 普通攻击 | `J` | `1` |
| 角色性格技能 | `K` | `2` |
| 闪避 / 冲刺 | `L` | `3` |
| 小技能 1 | `U` | `4` |
| 小技能 2 | `I` | `5` |
| 终极奥义 | `O` | `6` |

* 顶部 **⏸ 暂停** 按钮可打开“暂停与操作设置”弹窗，包含**音效开关**、**终极奥义演出开关**与 **1P/2P 自定义按键**（支持冲突自动互换与一键恢复默认）；关闭奥义特写不会取消技能伤害或必杀终结演出。

## 角色插件开发指南

所有角色位于 `js/fighters/`，继承 `FighterBase`（`js/fighter-base.js`）：

1. 基类已内置通用的移动、跳跃、**防御（`S` / `↓`）** 与 **闪避（`L` / `3`）** 逻辑；角色只需重写 `useBasicAttack`、`useSkill`、`useUltimate` 与 `drawCustom` 即可快速接入。
2. 如需像 `ISFP`、`ENFJ` 一样为 6 个动作键（`lightAttack`、`heavyAttack`、`dash`、`skill1`/`skill2`、`ultimate`）实现独立动作与精灵表，可在子类中自行接管对应输入并配置动作帧。
3. 新增或修改角色后，在 `js/fighters/index.js` 中注册即可生效；完整美术与数值标准见 `.agents/skills/mbti-fighter-spec/SKILL.md`。
