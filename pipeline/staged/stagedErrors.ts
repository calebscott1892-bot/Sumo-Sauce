import type { Source } from '../snapshots/snapshotTypes.ts';

type ErrorContext = {
  source: Source;
  snapshotSha256: string;
  url: string;
  message: string;
};

export class ParseError extends Error {
  source: Source;

  snapshotSha256: string;

  url: string;

  constructor(ctx: ErrorContext) {
    super(ctx.message);
    this.name = 'ParseError';
    this.source = ctx.source;
    this.snapshotSha256 = ctx.snapshotSha256;
    this.url = ctx.url;
  }
}

export class SchemaError extends Error {
  source: Source;

  snapshotSha256: string;

  url: string;

  constructor(ctx: ErrorContext) {
    super(ctx.message);
    this.name = 'SchemaError';
    this.source = ctx.source;
    this.snapshotSha256 = ctx.snapshotSha256;
    this.url = ctx.url;
  }
}
