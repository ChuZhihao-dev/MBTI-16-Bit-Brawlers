import { FighterBase } from '../fighter-base.js';

/**
 * 数据驱动的通用 MBTI 格斗家（用于让全部 16 型人格都可直接上场对战）
 * 后续若某位角色需要高度定制机制，可在 js/fighters/<id>.js 单独新建子类替换
 */
export class GenericMBTIFighter extends FighterBase {
  constructor(config, meta) {
    super({
      ...config,
      id: meta.id,
      name: meta.name,
      title: meta.title,
      color: meta.color,
      maxHp: meta.stats.hp,
      speed: meta.stats.speed,
      jumpForce: meta.stats.jump,
      skillCdMax: meta.skillCd ?? 3.8
    });
    this.meta = meta;
  }

  useBasicAttack(opponent, context) {
    if (this.meta.archetype === 'ranged') {
      context.spawnProjectile({
        owner: this,
        x: this.facing === 1 ? this.x + this.width : this.x - 28,
        y: this.y + 22,
        width: 28,
        height: 14,
        vx: this.facing * 500,
        lifetime: 0.75,
        damage: 8,
        knockbackX: 180,
        knockbackY: -90,
        color: this.color,
        hitLabel: this.meta.basicQuote || '精准输出!'
      });
      return;
    }

    const reach = 52;
    const hitbox = {
      x: this.facing === 1 ? this.x + this.width : this.x - reach,
      y: this.y + 14,
      width: reach,
      height: 44
    };
    if (context.rectsOverlap(hitbox, opponent.getHurtbox())) {
      opponent.takeDamage(9, this.facing * 240, -140, this, context, this.meta.basicQuote || '破防!');
    }
  }

  useSkill(opponent, context) {
    const label = this.meta.moves.skill.name;
    context.spawnFloatingText(this.getCenterX(), this.y - 18, `${label}!`, this.color);

    if (this.meta.skillType === 'dash') {
      this.vx = this.facing * 560;
      const hitbox = {
        x: this.facing === 1 ? this.x + this.width - 10 : this.x - 60,
        y: this.y + 8,
        width: 70,
        height: 58
      };
      if (context.rectsOverlap(hitbox, opponent.getHurtbox())) {
        opponent.takeDamage(14, this.facing * 320, -180, this, context, label);
      }
    } else if (this.meta.skillType === 'shield') {
      this.applyStatus('shield', 1.2);
    } else {
      context.spawnProjectile({
        owner: this,
        x: this.facing === 1 ? this.x + this.width : this.x - 36,
        y: this.y + 16,
        width: 36,
        height: 24,
        vx: this.facing * 440,
        lifetime: 1.1,
        damage: 13,
        knockbackX: 260,
        knockbackY: -160,
        color: this.color,
        hitLabel: label
      });
    }
  }

  useUltimate(opponent, context) {
    const label = this.meta.moves.ultimate.name;
    context.spawnFloatingText(this.getCenterX(), this.y - 26, `【${label}】`, '#facc15');
    this.applyStatus('superArmor', 2.0);
    context.triggerShake(8, 0.2);

    const dist = Math.abs(this.getCenterX() - opponent.getCenterX());
    if (dist < 220) {
      opponent.takeDamage(24, this.facing * 380, -260, this, context, `${label}!`);
    } else {
      context.spawnProjectile({
        owner: this,
        x: opponent.getCenterX() - 30,
        y: -40,
        width: 60,
        height: 60,
        vy: 760,
        lifetime: 1.2,
        damage: 24,
        knockbackX: this.facing * 320,
        knockbackY: -240,
        color: '#facc15',
        hitLabel: `${label}!`
      });
    }
  }

  drawCustom(ctx, halfW, halfH) {
    // 绘制专属眼睛与阵营头饰线条
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(4, -halfH + 16, 10, 8);
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(8, -halfH + 18, 4, 4);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(this.name, 0, halfH - 10);
  }
}

export const MBTI_16_DATA = [
  // NT 分析家（紫）
  {
    id: 'intj',
    name: 'INTJ',
    title: '建筑师 · 紫老头',
    group: 'NT',
    groupName: '分析家',
    color: '#7c3aed',
    stats: { hp: 120, speed: 280, jump: 600 },
    bio: '永远提前算好十步的冷面策划师，最讨厌计划被猪队友打乱。',
    moves: {
      basic: { name: '死亡凝视', desc: '发射短距紫色激光，附带轻微击退。' },
      skill: { name: '战术布局', desc: '脚下放置隐形陷阱，踩中禁锢 1.5 秒。' },
      ultimate: { name: '一切尽在掌握', desc: '无敌 2 秒并闪现至对手身后造成巨额暴击。' }
    }
  },
  {
    id: 'intp',
    name: 'INTP',
    title: '逻辑学家 · 熬夜学者',
    group: 'NT',
    groupName: '分析家',
    color: '#8b5cf6',
    archetype: 'ranged',
    skillType: 'projectile',
    basicQuote: '定义不严谨!',
    stats: { hp: 95, speed: 300, jump: 620 },
    bio: '白天摸鱼发呆、凌晨三点突然在脑内重构宇宙定理的理论狂魔。',
    moves: {
      basic: { name: '概念拆解', desc: '发射紫色逻辑弹幕，质疑对手的存在前提。' },
      skill: { name: '思想实验', desc: '投掷薛定谔的立方体，命中后强力击退。' },
      ultimate: { name: '逻辑闭环', desc: '在对手头顶降下巨型公式砸击。' }
    }
  },
  {
    id: 'entj',
    name: 'ENTJ',
    title: '指挥官 · 霸总本总',
    group: 'NT',
    groupName: '分析家',
    color: '#6d28d9',
    archetype: 'melee',
    skillType: 'dash',
    basicQuote: '太低效了!',
    stats: { hp: 115, speed: 340, jump: 620 },
    bio: '眼里只有 KPI 与最优解，连打架都要先开三分钟复盘会。',
    moves: {
      basic: { name: '雷厉风行', desc: '高伤害近身重拳，打断对手节奏。' },
      skill: { name: '强制对齐', desc: '向前高速突进撞飞对手。' },
      ultimate: { name: '全员加班', desc: '霸体压制并重击周围对手。' }
    }
  },
  {
    id: 'entp',
    name: 'ENTP',
    title: '辩论家 · 杠精',
    group: 'NT',
    groupName: '分析家',
    color: '#a855f7',
    stats: { hp: 95, speed: 360, jump: 660 },
    bio: '不一定要赢，但一定要把你的逻辑链拆得稀碎的快乐抬杠王。',
    moves: {
      basic: { name: '快速反驳', desc: '高频发射“但是…”文字气泡。' },
      skill: { name: '话题转移', desc: '向后瞬移拉开身位。' },
      ultimate: { name: '杠精领域', desc: '全屏降下问号弹幕并使对手左右键反转 3 秒。' }
    }
  },

  // NF 外交家（绿）
  {
    id: 'infj',
    name: 'INFJ',
    title: '提倡者 · 绿老头',
    group: 'NF',
    groupName: '外交家',
    color: '#10b981',
    stats: { hp: 105, speed: 310, jump: 640 },
    bio: '表面微笑倾听一切，心里早已默默记下小本本，忍无可忍就关门大吉。',
    moves: {
      basic: { name: '礼貌微笑', desc: '挥动法杖发射远程翡翠光球。' },
      skill: { name: '共情吸收', desc: '展开绿色护盾，吸收攻击转化为自身 EP。' },
      ultimate: { name: 'Door Slam / 关门大吉', desc: '召唤巨型翡翠石门拍飞对手并清空增益。' }
    }
  },
  {
    id: 'infp',
    name: 'INFP',
    title: '调停者 · 蝴蝶仙子',
    group: 'NF',
    groupName: '外交家',
    color: '#059669',
    archetype: 'ranged',
    skillType: 'shield',
    basicQuote: '我破防了呜',
    stats: { hp: 90, speed: 310, jump: 670 },
    bio: '内心戏能拍一百集连续剧，一边自我内耗一边用眼泪淹没对手。',
    moves: {
      basic: { name: '情绪气泡', desc: '发射自带委屈特效的远程能量团。' },
      skill: { name: '精神回避', desc: '开启短暂护盾，将伤害转化为内耗能量。' },
      ultimate: { name: '小作文轰炸', desc: '召唤千字长文从天而降砸晕对手。' }
    }
  },
  {
    id: 'enfj',
    name: 'ENFJ',
    title: '主人公 · 精神导师',
    group: 'NF',
    groupName: '外交家',
    color: '#14b8a6',
    archetype: 'melee',
    skillType: 'projectile',
    basicQuote: '相信自己!',
    stats: { hp: 110, speed: 340, jump: 640 },
    bio: '随时随地给人灌鸡汤的热血班长，哪怕挨打也要先夸对手拳法真棒。',
    moves: {
      basic: { name: '重剑连段', desc: '轻击五连、重击三连，接招时省去中段起手与收招。' },
      skill: { name: '三连剑气', desc: '连续发射三道圆弧形剑气投掷物。' },
      special: { name: '气焰共鸣', desc: '为自身附加短暂增幅，加快重剑连段。' },
      ultimate: { name: '耀光破阵斩', desc: '蓄力后发射更大、更远的圆弧剑气投掷物。' }
    }
  },
  {
    id: 'enfp',
    name: 'ENFP',
    title: '竞选者 · 快乐小狗',
    group: 'NF',
    groupName: '外交家',
    color: '#34d399',
    stats: { hp: 95, speed: 390, jump: 690 },
    bio: '电量满格时能绕地球跑三圈，三分钟一过立刻原地关机躺平。',
    moves: {
      basic: { name: '热情贴贴', desc: '向前小段冲刺并撞击对手。' },
      skill: { name: '脑洞大开', desc: '随机空投高伤害大锤或无害鲜花。' },
      ultimate: { name: '三分钟热度', desc: '5 秒移速攻速狂暴+霸体，结束后 2 秒电量耗尽。' }
    }
  },

  // SJ 守护者（蓝）
  {
    id: 'istj',
    name: 'ISTJ',
    title: '物流师 · 规则铁壁',
    group: 'SJ',
    groupName: '守护者',
    color: '#3b82f6',
    archetype: 'melee',
    skillType: 'shield',
    basicQuote: '按流程来!',
    stats: { hp: 130, speed: 265, jump: 580 },
    bio: '随身携带《格斗场安全守则》，最不能容忍任何不按套路出牌的行为。',
    moves: {
      basic: { name: '合规铁拳', desc: '稳扎稳打的高防反近战重击。' },
      skill: { name: '制度护盾', desc: '展开蓝盾吸收伤害并补充能量。' },
      ultimate: { name: '流程驳回', desc: '霸体状态将违规对手狠狠击飞。' }
    }
  },
  {
    id: 'isfj',
    name: 'ISFJ',
    title: '守卫者 · 温柔后勤',
    group: 'SJ',
    groupName: '守护者',
    color: '#0ea5e9',
    archetype: 'melee',
    skillType: 'shield',
    basicQuote: '小心着凉!',
    stats: { hp: 120, speed: 285, jump: 600 },
    bio: '嘴上说着“没事我都可以”，其实早就把全场所有人的需求记在心里。',
    moves: {
      basic: { name: '体贴拍打', desc: '温和但扎实的近战反击。' },
      skill: { name: '暖心防护', desc: '开启守护屏障，将攻击化为能量。' },
      ultimate: { name: '母爱/父爱如山', desc: '不可阻挡的厚重冲击波。' }
    }
  },
  {
    id: 'estj',
    name: 'ESTJ',
    title: '总经理 · 纪律主任',
    group: 'SJ',
    groupName: '守护者',
    color: '#2563eb',
    archetype: 'melee',
    skillType: 'dash',
    basicQuote: '站没站相!',
    stats: { hp: 120, speed: 320, jump: 600 },
    bio: '声音比拳头先到现场的执行力天花板，专治各种拖延与摸鱼。',
    moves: {
      basic: { name: '绩效考核', desc: '强硬近身打击，压迫感十足。' },
      skill: { name: '现场督办', desc: '高速冲锋撞击对手。' },
      ultimate: { name: '终极问责', desc: '霸体强攻，将对手彻底击溃。' }
    }
  },
  {
    id: 'esfj',
    name: 'ESFJ',
    title: '执政官 · 社交核心',
    group: 'SJ',
    groupName: '守护者',
    color: '#0284c7',
    archetype: 'ranged',
    skillType: 'projectile',
    basicQuote: '聚餐去不去?',
    stats: { hp: 110, speed: 315, jump: 620 },
    bio: '朋友圈点赞狂魔，连格斗中场休息都要拉对手建一个“相亲相爱群”。',
    moves: {
      basic: { name: '话题投喂', desc: '发射远程社交弹幕。' },
      skill: { name: '热心邀请', desc: '丢出强力聚会邀请函击退对手。' },
      ultimate: { name: '全场买单', desc: '霸气轰击让对手无从招架。' }
    }
  },

  // SP 探险家（黄）
  {
    id: 'istp',
    name: 'ISTP',
    title: '鉴赏家 · 冷静拆家',
    group: 'SP',
    groupName: '探险家',
    color: '#eab308',
    archetype: 'melee',
    skillType: 'dash',
    basicQuote: '就这?',
    stats: { hp: 105, speed: 365, jump: 650 },
    bio: '人狠话不多，能用扳手解决的问题绝对不多说半个废字。',
    moves: {
      basic: { name: '精准点刺', desc: '极快出手的冷酷近战攻击。' },
      skill: { name: '极限闪突', desc: '瞬间贴脸突刺造成重击。' },
      ultimate: { name: '机械拆解', desc: '霸体连斩将对手直接拆散架。' }
    }
  },
  {
    id: 'isfp',
    name: 'ISFP',
    title: '探险家 · 随性画师',
    group: 'SP',
    groupName: '探险家',
    color: '#f59e0b',
    archetype: 'ranged',
    skillType: 'projectile',
    basicQuote: '甩笔点刺!',
    stats: { hp: 95, speed: 340, jump: 660 },
    bio: '审美洁癖患者，打架输赢不重要，但出招姿势一定要足够好看。',
    moves: {
      basic: { name: '甩笔点刺 / 泼墨横扫', desc: '近身轻击可衔接重击。' },
      skill: { name: '颜料弹 / 彩绘突刺', desc: '发射颜料弹牵制对手，或向前突刺爆发。' },
      ultimate: { name: '万象泼彩狂想曲', desc: '聚能后释放大范围泼彩攻击。' }
    }
  },
  {
    id: 'estp',
    name: 'ESTP',
    title: '企业家 · 街头战神',
    group: 'SP',
    groupName: '探险家',
    color: '#d97706',
    archetype: 'melee',
    skillType: 'dash',
    basicQuote: '来单挑啊!',
    stats: { hp: 110, speed: 380, jump: 670 },
    bio: '哪里有热闹就往哪里冲的动作片主角，字典里没有“保守”两个字。',
    moves: {
      basic: { name: '街头直拳', desc: '高爆发近身快拳。' },
      skill: { name: '极限滑铲', desc: '超高速突进撞飞对手。' },
      ultimate: { name: '肾上腺素', desc: '霸体狂暴重拳直接 K.O.！' }
    }
  },
  {
    id: 'esfp',
    name: 'ESFP',
    title: '表演者 · 舞台焦点',
    group: 'SP',
    groupName: '探险家',
    color: '#f97316',
    archetype: 'ranged',
    skillType: 'dash',
    basicQuote: '看我看我!',
    stats: { hp: 100, speed: 370, jump: 680 },
    bio: '只要灯光打在身上就能原地开演唱会，把格斗擂台变成个人巡演现场。',
    moves: {
      basic: { name: '闪光飞吻', desc: '发射华丽的舞台灯光弹。' },
      skill: { name: 'C位抢镜', desc: '华丽冲刺撞开挡路的对手。' },
      ultimate: { name: '安可时刻', desc: '全屏聚光灯爆发终结比赛！' }
    }
  }
];
