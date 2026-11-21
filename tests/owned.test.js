import test from 'node:test';
import assert from 'node:assert/strict';
import { ownedMatch } from '../src/search.js';
import { countAiAttempt, readAiUsage, setAiBudget } from '../src/ai-usage.js';

test('impede código repetido, mas não confunde versões de códigos diferentes', () => {
  const cars = [{ id: 'one', model: 'Porsche 993 GT2', code: 'CGB69', catalogId: '2015-CGB69', year: '2015', series: 'Porsche Series', color: 'Prata' }];
  assert.equal(ownedMatch(cars, { code: 'cgb69' })?.id, 'one');
  assert.equal(ownedMatch(cars, { code: 'CGB69-N7C5' })?.id, 'one');
  assert.equal(ownedMatch(cars, { catalogId: '2015-CGB69' })?.id, 'one');
  assert.equal(ownedMatch(cars, { model: 'Porsche 993 GT2', code: 'OUT11' }), null);
  assert.equal(ownedMatch(cars, { id: 'one', code: 'CGB69' }), null);
});

test('contador da IA guarda tentativas e meta apenas neste aparelho', () => {
  const data = new Map();
  globalThis.localStorage = {
    getItem: key => data.get(key) ?? null,
    setItem: (key, value) => data.set(key, value)
  };
  setAiBudget('user-a', 20);
  countAiAttempt('user-a');
  assert.equal(readAiUsage('user-a').attempts, 1);
  assert.equal(readAiUsage('user-a').budget, 20);
  assert.equal(readAiUsage('user-b').attempts, 0);
  delete globalThis.localStorage;
});
