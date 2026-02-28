export type Division = 'makuuchi' | 'juryo' | 'makushita' | 'sandanme' | 'jonidan' | 'jonokuchi';

export type CareerSummary = {
  rikishiId: string;
  shikona: string;
  heya: string | null;
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

export type TimelineItem = {
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

export type KimariteBreakdownItem = {
  kimariteId: string;
  count: number;
  percentage: number;
};

export type KimariteStats = {
  rikishiId: string;
  totalWins: number;
  totalLosses: number;
  winKimarite: KimariteBreakdownItem[];
  lossKimarite: KimariteBreakdownItem[];
  mostUsedKimarite: string | null;
};

export type HeadToHead = {
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

export type DivisionStandingRow = {
  rikishiId: string;
  shikona: string;
  rank: string;
  wins: number;
  losses: number;
  winPercentage: number;
  kimariteBreakdown: Array<{ kimariteId: string; count: number }>;
};

export type BashoDivisionSummary = { bouts: number };

export type BashoSummary = {
  bashoId: string;
  divisions: {
    makuuchi: BashoDivisionSummary;
    juryo: BashoDivisionSummary;
    makushita: BashoDivisionSummary;
    sandanme: BashoDivisionSummary;
    jonidan: BashoDivisionSummary;
    jonokuchi: BashoDivisionSummary;
  };
};

export type Bout = {
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

export type GetRikishiResponse = CareerSummary;
export type GetRikishiTimelineResponse = TimelineItem[];
export type GetRikishiRankProgressionResponse = RankProgressionItem[];
export type GetRikishiKimariteResponse = KimariteStats;
export type GetBashoResponse = BashoSummary;
export type GetBoutsByDivisionResponse = Bout[];
export type GetHeadToHeadResponse = HeadToHead;
export type GetDivisionStandingsResponse = DivisionStandingRow[];

export type GetRikishiComparisonResponse = {
  rikishiA: { rikishiId: string; shikona: string; heya: string | null };
  rikishiB: { rikishiId: string; shikona: string; heya: string | null };
  headToHead: HeadToHead;
  commonBashoCount: number;
  kimarite: {
    a: KimariteStats;
    b: KimariteStats;
  };
  recentForm: {
    a: TimelineItem[];
    b: TimelineItem[];
  };
  lastMatch: HeadToHead['lastMatch'];
};

export type ApiErrorResponse = {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  retryAfterSeconds?: number;
};