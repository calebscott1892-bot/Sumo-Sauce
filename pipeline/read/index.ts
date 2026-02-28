export {
  getRikishiById,
  getBashoById,
  getBoutsByBashoAndDivision,
  getHeadToHead,
  getCareerTimeline,
  getRankProgression,
  getDivisionStandings,
  getKimariteStats,
} from './service.ts';

export { closeReadPrisma } from './db.ts';
export type {
  RikishiReadModel,
  BashoReadModel,
  BoutReadModel,
  HeadToHeadReadModel,
  CareerTimelineItem,
  RankProgressionItem,
  DivisionStandingItem,
  KimariteStatsReadModel,
  Division,
} from './types.ts';
