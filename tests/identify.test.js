import test from 'node:test';
import assert from 'node:assert/strict';
import { findByProductCode, identifyFromFields, identifyFromReadings } from '../src/identify.js';

test('código do gancho encontra o Ford GT do exemplo sem exigir foto', () => {
  const matches = findByProductCode(' jjm05 ');
  assert.equal(findByProductCode('JJM05-N7C5')[0]?.code, 'JJM05');
  assert.equal(matches.length, 1);
  assert.equal(matches[0].model, '2016 Ford GT Race');
  assert.equal(matches[0].year, '2026');
  assert.equal(findByProductCode('027084120134').length, 0);
});

test('frente e verso concordam no modelo e código da biblioteca', () => {
  const result = identifyFromReadings([
    { text: '2016 FORD GT RACE / COURSE', lines: [{ text: '2016 FORD GT RACE / COURSE' }] },
    { text: 'JJM05-N7C5\n2016 FORD GT RACE / COURSE', lines: [{ text: 'JJM05-N7C5' }, { text: '2016 FORD GT RACE / COURSE' }] }
  ]);
  assert.equal(result.candidates[0].item.code, 'JJM05');
  assert.equal(result.candidates[0].code, true);
  assert.equal(result.candidates[0].name, true);
});

test('nome legível retorna versões para escolha sem assumir ano', () => {
  const result = identifyFromReadings([{ text: '2016 FORD GT RACE / COURSE' }]);
  assert.ok(result.candidates.length > 0);
  assert.ok(result.candidates.every(candidate => candidate.item.model === '2016 Ford GT Race'));
});

test('OCR real do exemplo usa nome, série e 8/10 para retirar versões erradas', () => {
  const result = identifyFromReadings([{
    text: '2006 FORD GT RACE / COURSE\nJIMO5-N7C5\n2016 FORD GT RACE / COURSE\nEXOTICARS\n8/10'
  }]);
  assert.equal(result.candidates.length, 1);
  assert.equal(result.candidates[0].item.code, 'JJM05');
  assert.equal(result.candidates[0].series, true);
  assert.equal(result.candidates[0].seriesNo, true);
});

test('campos extraídos por IA vinculam uma versão e preservam apenas sugestões para confirmação', () => {
  const result = identifyFromFields({
    model: '2016 FORD GT RACE / COURSE', code: 'JJM05-N7C5',
    series: 'EXOTICARS', seriesNo: '8/10', collectorNo: '124', color: 'amarelo'
  });
  assert.equal(result.source, 'ai');
  assert.equal(result.candidates.length, 1);
  assert.equal(result.candidates[0].item.code, 'JJM05');
  assert.equal(result.hints.color, 'amarelo');
  assert.equal(result.hints.code, 'JJM05');
});
