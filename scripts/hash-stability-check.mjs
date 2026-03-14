#!/usr/bin/env node
import assert from 'node:assert/strict';
import { hashStableJson, stableStringify } from '../pipeline/hash.ts';

const left = { a: 1, b: 2 };
const right = { b: 2, a: 1 };

const leftHash = hashStableJson(left);
const rightHash = hashStableJson(right);

assert.equal(
  leftHash,
  rightHash,
  `Expected equal stable hashes, got left=${leftHash} right=${rightHash}`
);

process.stdout.write(
  `${JSON.stringify({
    ok: true,
    left: stableStringify(left),
    right: stableStringify(right),
    hash: leftHash,
  })}\n`
);
