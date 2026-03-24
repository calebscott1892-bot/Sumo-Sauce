export type SnapshotSource = 'jsa' | 'sumodb';

export const BOUT_DIVISIONS = [
  'makuuchi',
  'juryo',
  'makushita',
  'sandanme',
  'jonidan',
  'jonokuchi',
] as const;

export type BoutDivision = (typeof BOUT_DIVISIONS)[number];

export type BoutDay = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15;
export const BOUT_DAYS: BoutDay[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];

export type RequiredSnapshot = {
  source: SnapshotSource;
  kind: 'banzuke' | 'rikishi' | `bouts.day${BoutDay}`;
  url: string;
  contentTypeHint: 'text/html' | 'application/json';
};

function toSumodbDivisionParam(division: BoutDivision): string {
  switch (division) {
    case 'makuuchi':
      return 'Makuuchi';
    case 'juryo':
      return 'Juryo';
    case 'makushita':
      return 'Makushita';
    case 'sandanme':
      return 'Sandanme';
    case 'jonidan':
      return 'Jonidan';
    case 'jonokuchi':
      return 'Jonokuchi';
    default:
      return division;
  }
}

export function requiredSnapshotsForBasho(bashoId: string): RequiredSnapshot[] {
  const id = String(bashoId || '').trim();

  const base: RequiredSnapshot[] = [
    {
      source: 'jsa',
      kind: 'banzuke',
      url: `https://www.sumo.or.jp/EnHonbashoBanzuke/${id}`,
      contentTypeHint: 'text/html',
    },
    {
      source: 'sumodb',
      kind: 'rikishi',
      url: `https://sumodb.sumogames.de/Banzuke.aspx?b=${id}`,
      contentTypeHint: 'text/html',
    },
  ];

  const bouts: RequiredSnapshot[] = BOUT_DAYS.map((day) => ({
    source: 'sumodb',
    kind: `bouts.day${day}` as const,
    url: `https://sumodb.sumogames.de/Results.aspx?b=${id}&d=${day}`,
    contentTypeHint: 'text/html',
  }));

  return [...base, ...bouts];
}
