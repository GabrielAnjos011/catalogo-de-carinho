import test from 'node:test';
import assert from 'node:assert/strict';
import { extractHints } from '../src/search.js';

test('encontra o modelo útil no meio do ruído do OCR', () => {
  const result = extractHints('gre 7 ee ad y — 13 A\nwtl Ne Dy 1< all Nee Tees\nNISSAN SKYLINE GT. (4R34) 3 [ED');
  assert.equal(result.model, 'Nissan Skyline GT-R (R34)');
  assert.equal(result.year, '');
  assert.equal(result.code, '');
});

test('separa modelo, ano e código quando estão legíveis', () => {
  const result = extractHints('HOT WHEELS\nPORSCHE 911 GT3 RS\n2024\nHKG52');
  assert.deepEqual({ model: result.model, year: result.year, code: result.code },
    { model: 'PORSCHE 911 GT3 RS', year: '2024', code: 'HKG52' });
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
