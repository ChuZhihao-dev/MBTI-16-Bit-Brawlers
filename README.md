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

## 操作说明

* **1P**：`A` / `D` 左右移动，`W` 跳跃，`J` 普通攻击，`K` 性格特技，`L` 终极奥义
* **2P**：`←` / `→` 左右移动，`↑` 跳跃，`U`（或小键盘 `1`）普通攻击，`I`（或小键盘 `2`）性格特技，`O`（或小键盘 `3`）终极奥义

## 角色插件开发指南

所有角色位于 `js/fighters/`，继承 `FighterBase`（`js/fighter-base.js`），只需关注：

1. `useBasicAttack(opponent, context)`：普通攻击
2. `useSkill(opponent, context)`：性格特技
3. `useUltimate(opponent, context)`：终极奥义
4. `drawCustom(ctx, halfW, halfH)`：Canvas 专属配件与表情绘制

新增或修改角色后，在 `js/fighters/index.js` 中注册即可生效。
