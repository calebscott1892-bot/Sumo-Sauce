export {
  getRikishiById,
  getBashoById,
  getBoutsByBashoAndDivision,
  getHeadToHead,
  getCareerTimeline,
  getRankProgression,
  getDivisionStandings,
  getKimariteStats,
  getRikishiComparison,
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
  RikishiComparisonReadModel,
  Division,
} from './types.ts';
