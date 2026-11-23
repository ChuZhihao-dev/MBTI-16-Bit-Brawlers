/**
 * 精灵表加载与动画播放器
 * 支持横向多帧切片，并自动通过边缘泛洪填充移除纯白背景（保留角色内部的白色高光/胡须等细节）
 */
export class SpriteAnimator {
  constructor(animationsConfig = {}, targetHeight = 128) {
    this.targetHeight = targetHeight;
    this.animations = {};
    this.currentState = 'idle';
    this.frameIndex = 0;
    this.timer = 0;

    for (const [state, cfg] of Object.entries(animationsConfig)) {
      this.loadAnimation(state, cfg);
    }
  }

  loadAnimation(state, cfg) {
    const entry = {
      frames: [],
      fps: cfg.fps ?? 10,
      frameDurations: Array.isArray(cfg.frameDurations) ? cfg.frameDurations : null,
      loop: cfg.loop ?? true,
      loaded: false
    };
    this.animations[state] = entry;

    const img = new Image();
    img.onload = () => {
      const cols = cfg.cols ?? cfg.frames ?? 4;
      const rows = cfg.rows ?? 1;
      const totalFrames = cfg.frames ?? cols * rows;
      const srcFrameW = Math.floor(img.width / cols);
      const srcFrameH = Math.floor(img.height / rows);
      const inset = cfg.cropInset ?? 0;
      const cropW = Math.max(1, srcFrameW - inset * 2);
      const cropH = Math.max(1, srcFrameH - inset * 2);
      const dstH = cfg.renderHeight ?? this.targetHeight;
      const dstW = Math.max(1, Math.round((cropW / cropH) * dstH));

      const sliceCount = cfg.useFirstFrameOnly ? 1 : totalFrames;
      const frameStart = cfg.frameStart ?? 0;
      for (let frame = 0; frame < sliceCount; frame++) {
        const i = frameStart + frame;
        const col = i % cols;
        const row = Math.floor(i / cols);
        const off = document.createElement('canvas');
        off.width = dstW;
        off.height = dstH;
        const octx = off.getContext('2d');
        octx.drawImage(
          img,
          col * srcFrameW + inset,
          row * srcFrameH + inset,
          cropW,
          cropH,
          0,
          0,
          dstW,
          dstH
        );

        if (cfg.removeWhiteBg !== false) {
          this.removeBorderWhiteBg(octx, dstW, dstH);
        }
        entry.frames.push(cfg.trimToContent ? this.trimToContent(off, dstH) : off);
      }
      entry.loaded = true;
    };
    img.src = cfg.src;
  }

  /** 仅在角色显式启用时，将每帧的可见内容等高缩放并裁掉透明留边。 */
  trimToContent(frame, targetHeight) {
    const ctx = frame.getContext('2d');
    const { data } = ctx.getImageData(0, 0, frame.width, frame.height);
    let left = frame.width;
    let right = -1;
    let top = frame.height;
    let bottom = -1;
    for (let y = 0; y < frame.height; y++) {
      for (let x = 0; x < frame.width; x++) {
        if (data[(y * frame.width + x) * 4 + 3] < 32) continue;
        left = Math.min(left, x);
        right = Math.max(right, x);
        top = Math.min(top, y);
        bottom = Math.max(bottom, y);
      }
    }
    if (right < left || bottom < top) return frame;
    const cropWidth = right - left + 1;
    const cropHeight = bottom - top + 1;
    const normalized = document.createElement('canvas');
    normalized.height = targetHeight;
    normalized.width = Math.max(1, Math.round(cropWidth / cropHeight * targetHeight));
    normalized.getContext('2d').drawImage(
      frame, left, top, cropWidth, cropHeight,
      0, 0, normalized.width, normalized.height
    );
    return normalized;
  }

  /**
   * 从画布四边泛洪移除纯白/近白背景，避免误伤角色内部的白色区域（如白胡须）
   */
  removeBorderWhiteBg(ctx, w, h) {
    const imgData = ctx.getImageData(0, 0, w, h);
    const data = imgData.data;
    const visited = new Uint8Array(w * h);
    const queue = new Int32Array(w * h);
    let head = 0;
    let tail = 0;

    const isNearWhite = (idx) => {
      const p = idx * 4;
      return data[p] >= 232 && data[p + 1] >= 232 && data[p + 2] >= 232;
    };

    const enqueue = (x, y) => {
      if (x < 0 || x >= w || y < 0 || y >= h) return;
      const idx = y * w + x;
      if (visited[idx] || !isNearWhite(idx)) return;
      visited[idx] = 1;
      queue[tail++] = idx;
    };

    for (let x = 0; x < w; x++) {
      enqueue(x, 0);
      enqueue(x, h - 1);
    }
    for (let y = 0; y < h; y++) {
      enqueue(0, y);
      enqueue(w - 1, y);
    }

    while (head < tail) {
      const idx = queue[head++];
      data[idx * 4 + 3] = 0;
      const x = idx % w;
      const y = (idx - x) / w;
      enqueue(x + 1, y);
      enqueue(x - 1, y);
      enqueue(x, y + 1);
      enqueue(x, y - 1);
    }

    ctx.putImageData(imgData, 0, 0);
  }

  update(dt, state) {
    if (state !== this.currentState) {
      this.currentState = state;
      this.frameIndex = 0;
      this.timer = 0;
    }

    const anim = this.animations[this.currentState] || this.animations.idle;
    if (!anim || !anim.loaded || anim.frames.length <= 1) return;

    const getFrameDuration = (idx) => {
      if (anim.frameDurations && anim.frameDurations.length > 0) {
        return anim.frameDurations[Math.min(idx, anim.frameDurations.length - 1)];
      }
      return 1 / anim.fps;
    };

    this.timer += dt;
    let frameDuration = getFrameDuration(this.frameIndex);
    while (this.timer >= frameDuration) {
      this.timer -= frameDuration;
      if (anim.loop) {
        this.frameIndex = (this.frameIndex + 1) % anim.frames.length;
      } else {
        this.frameIndex = Math.min(anim.frames.length - 1, this.frameIndex + 1);
        if (this.frameIndex === anim.frames.length - 1) {
          this.timer = 0;
          break;
        }
      }
      frameDuration = getFrameDuration(this.frameIndex);
    }
  }

  reset(state) {
    if (state) {
      this.currentState = state;
    }
    this.frameIndex = 0;
    this.timer = 0;
  }

  hasAnimation(state) {
    const anim = this.animations[state];
    return Boolean(anim && anim.loaded && anim.frames.length > 0);
  }

  getCurrentFrame(state) {
    const anim = this.animations[state] || this.animations.idle;
    if (!anim || !anim.loaded || anim.frames.length === 0) return null;
    const idx = Math.min(this.frameIndex, anim.frames.length - 1);
    return anim.frames[idx];
  }
}
