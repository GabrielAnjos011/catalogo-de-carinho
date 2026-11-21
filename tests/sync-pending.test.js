import test from 'node:test';
import assert from 'node:assert/strict';
import { clearPending, clearSynced, hasPending, markPending } from '../src/sync-pending.js';

test('uma gravação nova não é marcada como enviada por confirmação antiga', () => {
  const data = new Map();
  globalThis.localStorage = {
    getItem: key => data.get(key) ?? null,
    setItem: (key, value) => data.set(key, value)
  };
  markPending('a', 'carro', 100);
  markPending('a', 'carro', 200);
  clearPending('a', 'carro', 100);
  assert.equal(hasPending('a'), true);
  clearSynced('a', 150);
  assert.equal(hasPending('a'), true);
  clearPending('a', 'carro', 200);
  assert.equal(hasPending('a'), false);
  delete globalThis.localStorage;
});
