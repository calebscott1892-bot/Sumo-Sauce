#!/usr/bin/env node
import assert from 'node:assert/strict';

import { generateBashoRange, validateBashoId } from '../pipeline/ingest/bashoRange.ts';

function expectThrow(fn, label) {
  let threw = false;
  try {
    fn();
  } catch {
    threw = true;
  }
  assert.equal(threw, true, `Expected throw: ${label}`);
}

const one = generateBashoRange('200001', '200001');
assert.deepEqual(one, ['200001']);

const six = generateBashoRange('200001', '200011');
assert.deepEqual(six, ['200001', '200003', '200005', '200007', '200009', '200011']);

const wrap = generateBashoRange('199911', '200003');
assert.deepEqual(wrap, ['199911', '200001', '200003']);

assert.equal(validateBashoId('202501'), '202501');

expectThrow(() => validateBashoId('202502'), 'invalid month');
expectThrow(() => validateBashoId('foo'), 'invalid format');
expectThrow(() => generateBashoRange('202511', '202501'), 'reverse range');

process.stdout.write(`${JSON.stringify({ ok: true, cases: 7 })}\n`);
