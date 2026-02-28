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

export type RequiredSnapshot = {
  source: SnapshotSource;
  kind: 'banzuke' | 'rikishi' | `bouts.${BoutDivision}`;
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

  const bouts: RequiredSnapshot[] = BOUT_DIVISIONS.map((division) => ({
    source: 'sumodb',
    kind: `bouts.${division}`,
    url: `https://sumodb.sumogames.de/Results.aspx?b=${id}&d=${toSumodbDivisionParam(division)}`,
    contentTypeHint: 'text/html',
  }));

  return [...base, ...bouts];
}
