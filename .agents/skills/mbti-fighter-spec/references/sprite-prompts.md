# AI 精灵表生图提示词模板（Sprite Sheet Prompts）

所有角色均以对应的 `assets/fighters/<id>/concept/portrait.png` 作为参考图，保持低多边形扁平几何画风一致。

---

## 1. 行走序列（`walk_sheet.jpeg` · 4×1 横向 4 帧）

```text
Generate a 4-frame horizontal 2D game sprite sheet (4 equal columns, 1 row, wide 16:9 aspect ratio) on a pure solid white (#FFFFFF) background.
Reference character: assets/fighters/<id>/concept/portrait.png (16Personalities <TYPE> low-poly flat-shaded geometric style, preserve exact hair, outfit, colors, and signature props).
Action: Walking / running cycle facing RIGHT across 4 evenly spaced sequential frames (frame 1: right leg forward, frame 2: passing stride, frame 3: left leg forward, frame 4: passing stride).
Keep consistent character proportions, height, and ground baseline across all 4 frames, with clear spacing between frames and NO grid lines, NO text, NO borders, NO floor shadows.
```

## 2. 跳跃序列（`jump_sheet.jpeg` · 4×1 横向 4 帧）

```text
Generate a 4-frame horizontal 2D game sprite sheet (4 equal columns, 1 row, wide 16:9 aspect ratio) on a pure solid white (#FFFFFF) background.
Reference character: assets/fighters/<id>/concept/portrait.png (16Personalities <TYPE> low-poly flat-shaded geometric style).
Action: Jump cycle facing RIGHT across 4 evenly spaced sequential frames (frame 1: crouch anticipation, frame 2: leaping upward, frame 3: mid-air apex pose, frame 4: landing pose).
Keep consistent character proportions and clear spacing between frames, NO grid lines, NO text, NO borders.
```

## 3. 普攻序列（`attack_sheet.jpeg` · 4×1 横向 4 帧）

```text
Generate a 4-frame horizontal 2D game sprite sheet (4 equal columns, 1 row, wide 16:9 aspect ratio) on a pure solid white (#FFFFFF) background.
Reference character: assets/fighters/<id>/concept/portrait.png (16Personalities <TYPE> low-poly flat-shaded geometric style).
Action: <CHARACTER_ATTACK_DESCRIPTION> facing RIGHT across 4 evenly spaced sequential frames (frame 1: wind-up, frame 2: forward lunge / cast, frame 3: peak impact pose with geometric VFX arc, frame 4: follow-through recovery).
Keep consistent character proportions and clear spacing between frames, NO grid lines, NO text, NO borders.
```

## 4. 终极奥义序列（`ult_sheet.jpeg` · 4×4 共 16 帧）

```text
Generate a 4x4 grid (16 sequential frames, 1:1 square aspect ratio, 1024x1024) 2D game ultimate attack sprite sheet on a pure solid white (#FFFFFF) background.
Reference character: assets/fighters/<id>/concept/portrait.png (16Personalities <TYPE> low-poly flat-shaded geometric style).
Action: Dramatic ultimate move "<ULTIMATE_NAME>" facing RIGHT across 16 frames (reading left-to-right, top-to-bottom):
- Row 1 (frames 1-4): Dramatic wind-up and summoning signature prop / energy.
- Row 2 (frames 5-8): Unleashing the main signature phenomenon / summon.
- Row 3 (frames 9-12): Peak impact explosion with vivid geometric shards / burst.
- Row 4 (frames 13-16): Effects dissipating and triumphant recovery stance.
Keep the character anchored in the left half of each cell so the attack VFX extends cleanly to the right without clipping cell edges. NO text.
```

---

## 5. 切图与后处理检查
- 若 4×4 大招图自带细灰网格线，无需手擦：在角色 `sprites.ultimate` 中配置 `cropInset: 4` 或 `5`，`SpriteAnimator` 会自动裁除四边网格线并对纯白背景做泛洪透明化。
- 若从合图拆解 3:4 选人立绘，可使用 `ffmpeg` 裁剪并按阵营底色补边至 `132×176`（精确 `3:4` 比例），避免在 `.poster-thumb` 中被裁剪。
