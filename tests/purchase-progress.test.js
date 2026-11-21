import test from 'node:test';
import assert from 'node:assert/strict';
import { purchaseMatches } from '../src/purchase.js';
import { seriesProgress } from '../src/series-progress.js';

const cars = [
  { id: '1', model: 'Porsche 993 GT2', code: 'CGB69', year: '2015', series: 'Porsche Series' },
  { id: '2', model: 'Porsche 993 GT2', code: 'GRY84', year: '2021', series: 'HW Exotics' }
];

test('consulta de compra distingue código exato, mesmo modelo e sem resultado', () => {
  assert.equal(purchaseMatches(cars, 'CGB69-N7C5').kind, 'exact-code');
  assert.equal(purchaseMatches(cars, 'CGB69-N7C5').matches.length, 1);
  assert.equal(purchaseMatches(cars, 'Porsche 993 GT2').kind, 'same-model');
  assert.equal(purchaseMatches(cars, 'Ferrari 599XX').kind, 'none');
});

test('progresso conta versões da biblioteca uma vez, mesmo com quantidade maior', () => {
  const releases = [
    { id: 'a', year: '2015', series: 'Porsche Series', code: 'CGB69' },
    { id: 'b', year: '2015', series: 'Porsche Series', code: 'CGB70' },
    { id: 'c', year: '2021', series: 'HW Exotics', code: 'GRY84' }
  ];
  assert.deepEqual(seriesProgress([{ ...cars[0], quantity: 3 }], releases)
    .map(({ year, series, owned, total }) => ({ year, series, owned, total })),
  [{ year: '2015', series: 'Porsche Series', owned: 1, total: 2 }]);
});

test('código reutilizado em outro ano não completa uma edição diferente', () => {
  const releases = [
    { id: '2021-GRX17', year: '2021', series: 'HW Screen Time', code: 'GRX17' },
    { id: '2021-OTHER', year: '2021', series: 'HW Screen Time', code: 'OTH11' },
    { id: '2023-GRX17', year: '2023', series: 'HW Screen Time', code: 'GRX17' },
    { id: '2023-OTHER', year: '2023', series: 'HW Screen Time', code: 'OTH12' }
  ];
  const groups = seriesProgress([{ catalogId: '2021-GRX17', code: 'GRX17', year: '2021' }], releases);
  assert.deepEqual(groups.map(group => group.year), ['2021']);
});
