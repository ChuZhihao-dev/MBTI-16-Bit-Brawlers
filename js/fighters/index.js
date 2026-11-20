import { INTJ } from './intj.js';
import { INFJ } from './infj.js';
import { ENTP } from './entp.js';
import { ENFP } from './enfp.js';
import { ISFP } from './isfp.js';
import { GenericMBTIFighter, MBTI_16_DATA } from './roster-16.js';

const CUSTOM_CLASSES = {
  intj: INTJ,
  infj: INFJ,
  entp: ENTP,
  enfp: ENFP,
  isfp: ISFP
};

export const FIGHTER_ROSTER = MBTI_16_DATA.map((meta) => {
  const CustomClass = CUSTOM_CLASSES[meta.id];
  return {
    ...meta,
    posterPath: `assets/fighters/${meta.id}/concept/portrait.png`,
    FighterClass: CustomClass || class extends GenericMBTIFighter {
      constructor(config) {
        super(config, meta);
      }
    }
  };
});

export function getFighterMeta(id) {
  return FIGHTER_ROSTER.find((f) => f.id === id) || FIGHTER_ROSTER[0];
}

export function createFighter(id, config) {
  const entry = getFighterMeta(id);
  return new entry.FighterClass({
    ...config,
    ultimateName: entry.moves?.ultimate?.name || '终极奥义',
    posterPath: entry.posterPath
  });
}
