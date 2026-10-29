import test from 'node:test';
import assert from 'node:assert/strict';
import { extractHints, findExactCodeMatch } from '../src/search.js';

test('encontra o modelo útil no meio do ruído do OCR', () => {
  const result = extractHints('gre 7 ee ad y — 13 A\nwtl Ne Dy 1< all Nee Tees\nNISSAN SKYLINE GT. (4R34) 3 [ED');
  assert.equal(result.model, 'Nissan Skyline GT-R (R34)');
  assert.equal(result.year, '');
  assert.equal(result.code, '');
});

test('extrai modelo e código sem confundir data solta com ano da edição', () => {
  const result = extractHints('HOT WHEELS\nPORSCHE 911 GT3 RS\n2024\nHKG52');
  assert.deepEqual({ model: result.model, year: result.year, code: result.code },
    { model: 'PORSCHE 911 GT3 RS', year: '', code: 'HKG52' });
});

test('tolera as trocas de letras vistas na foto enviada', () => {
  assert.equal(extractHints('NISSAN SKYLINE OT (4834)').model, 'Nissan Skyline GT-R (R34)');
});

test('não inventa sugestão a partir de texto sem dados úteis', () => {
  const result = extractHints('gre 7 ee ad y — 13 A');
  assert.equal(result.model, '');
  assert.equal(result.year, '');
  assert.equal(result.code, '');
});

test('mostra nome como hipótese mesmo com baixa confiança, mas não escolhe código ambíguo', () => {
  const result = extractHints({ text: 'PORSCHE 911 GT3 RS\nHKG52\nFYC78', lines: [
    { text: 'PORSCHE 911 GT3 RS', confidence: 42 },
    { text: 'HKG52', confidence: 96 },
    { text: 'FYC78', confidence: 94 }
  ] });
  assert.equal(result.model, 'PORSCHE 911 GT3 RS');
  assert.equal(result.code, '');
  assert.equal(extractHints({ text: 'PORSCHE 911 GT3 RS', lines: [] }).model, 'PORSCHE 911 GT3 RS');
});

test('aceita nome sem marca em foto de perto sem bloquear pela confiança', () => {
  const reading = { text: 'BONE SHAKER', lines: [{ text: 'BONE SHAKER', confidence: 92 }] };
  assert.equal(extractHints(reading).model, '');
  assert.equal(extractHints(reading, { closeup: true }).model, 'BONE SHAKER');
  assert.equal(extractHints({ text: 'BONE SHAKER', lines: [{ text: 'BONE SHAKER', confidence: 71 }] }, { closeup: true }).model, 'BONE SHAKER');
});

test('reaproveita cadastro apenas quando código e modelo são inequívocos', () => {
  const cars = [
    { id: '1', model: 'Porsche 911 GT3 RS', code: 'HKG52' },
    { id: '2', model: 'Porsche 911 GT3 RS', code: 'HKG52' }
  ];
  assert.equal(findExactCodeMatch(cars, 'hkg52', '3')?.id, '1');
  assert.equal(findExactCodeMatch(cars, 'HKG52', '1')?.id, '2');
  assert.equal(findExactCodeMatch([...cars, { id: '3', model: 'Outro modelo', code: 'HKG52' }], 'HKG52', '4'), null);
});
