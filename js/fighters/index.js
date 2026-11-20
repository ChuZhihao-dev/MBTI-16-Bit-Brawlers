import { INTJ } from './intj.js';
import { INFJ } from './infj.js';
import { ENTP } from './entp.js';
import { ENFP } from './enfp.js';

export const FIGHTER_ROSTER = [
  {
    id: 'intj',
    name: 'INTJ',
    title: '建筑师 · 紫老头',
    color: '#7c3aed',
    desc: '移速慢但血厚。激光普攻 + 隐形禁锢陷阱 + 绝境预判暴击。',
    FighterClass: INTJ
  },
  {
    id: 'infj',
    name: 'INFJ',
    title: '提倡者 · 绿老头',
    color: '#10b981',
    desc: '均衡型浮空。法杖挥击 + 共情护盾吸能 + 巨型关门大吉。',
    FighterClass: INFJ
  },
  {
    id: 'entp',
    name: 'ENTP',
    title: '辩论家 · 杠精',
    color: '#a855f7',
    desc: '高机动弹幕流。气泡反驳 + 后撤瞬移 + 全屏混乱问号雨。',
    FighterClass: ENTP
  },
  {
    id: 'enfp',
    name: 'ENFP',
    title: '竞选者 · 快乐小狗',
    color: '#34d399',
    desc: '极速突进型。热情贴贴 + 随机空投 + 五秒狂暴后电量耗尽。',
    FighterClass: ENFP
  }
];

export function createFighter(id, config) {
  const entry = FIGHTER_ROSTER.find((f) => f.id === id) || FIGHTER_ROSTER[0];
  return new entry.FighterClass(config);
}
