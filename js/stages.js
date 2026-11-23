export const STAGES = {
  sky_colosseum: {
    id: 'sky_colosseum',
    name: '天空四阵营竞技场',
    backgroundSrc: 'assets/stages/Gemini_Generated_Image_82jfrc82jfrc82jf.jpg',
    width: 1800,
    height: 770,
    groundY: 556,
    stageLeft: 208,
    stageRight: 1592,
    spawnP1X: 560,
    spawnP2X: 1192,
    // 与 sky_colosseum.jpg 原画中三块悬浮石台完全对齐的单向平台
    platforms: [
      { x: 405, y: 404, width: 312 }, // 左侧中层悬浮台
      { x: 1076, y: 404, width: 312 }, // 右侧中层悬浮台
      { x: 743, y: 274, width: 314 } // 中央顶层悬浮台
    ]
  }
};

export const DEFAULT_STAGE_ID = 'sky_colosseum';
