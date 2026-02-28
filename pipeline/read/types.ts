export const DIVISION_ORDER = [
  'makuuchi',
  'juryo',
  'makushita',
  'sandanme',
  'jonidan',
  'jonokuchi',
] as const;

export type Division = (typeof DIVISION_ORDER)[number];

export type RikishiReadModel = {
  rikishiId: string;
  shikona: string;
  heya?: string;
  debutBasho: string;
  retirementBasho: string | null;
  careerRecord: {
    totalWins: number;
    totalLosses: number;
    totalAbsences: number;
  };
  highestRank: {
    division: Division;
    rank: string;
    bashoId: string;
  };
};

export type BashoReadModel = {
  bashoId: string;
  divisions: {
    makuuchi: { bouts: number };
    juryo: { bouts: number };
    makushita: { bouts: number };
    sandanme: { bouts: number };
    jonidan: { bouts: number };
    jonokuchi: { bouts: number };
  };
};

export type BoutReadModel = {
  boutId: string;
  bashoId: string;
  division: Division;
  day: number;
  boutNo: number;
  eastRikishiId: string;
  westRikishiId: string;
  winnerRikishiId: string | null;
  kimariteId: string | null;
};

export type HeadToHeadReadModel = {
  rikishiA: string;
  rikishiB: string;
  totalMatches: number;
  rikishiAWins: number;
  rikishiBWins: number;
  lastMatch: {
    bashoId: string;
    division: Division;
    day: number;
    winnerRikishiId: string | null;
  } | null;
};

export type CareerTimelineItem = {
  bashoId: string;
  division: Division;
  rank: string;
  wins: number;
  losses: number;
};

export type RankProgressionItem = {
  bashoId: string;
  division: Division;
  rank: string;
  wins: number;
  losses: number;
  kachiKoshi: boolean;
  makeKoshi: boolean;
  yusho: boolean;
};

export type KimariteCount = {
  kimariteId: string;
  count: number;
};

export type DivisionStandingItem = {
  rikishiId: string;
  shikona: string;
  rank: string;
  wins: number;
  losses: number;
  winPercentage: number;
  kimariteBreakdown: KimariteCount[];
};

export type KimaritePercentageItem = {
  kimariteId: string;
  count: number;
  percentage: number;
};

export type KimariteStatsReadModel = {
  rikishiId: string;
  totalWins: number;
  totalLosses: number;
  winKimarite: KimaritePercentageItem[];
  lossKimarite: KimaritePercentageItem[];
  mostUsedKimarite: string | null;
};
