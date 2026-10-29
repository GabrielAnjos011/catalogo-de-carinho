import test from 'node:test';
import assert from 'node:assert/strict';
import { releases, searchReleases, ownedForRelease, suggestReleasesFromOcr } from '../src/catalog.js';

test('catálogo contém lançamentos com código único de 2017 a 2026', () => {
  assert.equal(releases.length, 4284);
  assert.deepEqual([...new Set(releases.map(item => item.year))].sort(),
    ['2017', '2018', '2019', '2020', '2021', '2022', '2023', '2024', '2025', '2026']);
  assert.equal(new Set(releases.map(item => item.id)).size, releases.length);
  assert.ok(releases.every(item => item.model && item.code && item.year && item.series && item.source));
  assert.equal(releases.find(item => item.code === 'DTX10')?.model, 'Aristo Rat');
  assert.equal(releases.find(item => item.code === 'FYC11')?.series, 'Factory Fresh');
});

test('busca por nome parcial e código e distingue lançamentos', () => {
  const results = searchReleases('Porche 911');
  assert.ok(results.length > 3);
  assert.ok(results.every(item => /porsche 911/i.test(item.model)));
  const code = searchReleases('HYW18');
  assert.equal(code[0]?.model, 'Mazda MX-5 Miata');
  assert.equal(code[0]?.year, '2025');
});

test('marca como possuído só quando código ou vínculo do catálogo conferem', () => {
  const item = releases.find(release => release.code === 'HYW18');
  const cars = [{ model: item.model, year: item.year, code: '' }, { model: item.model, year: item.year, code: 'HYW18' }];
  assert.equal(ownedForRelease(cars, item).length, 1);
});

test('OCR usa código exato e tolera grafia imperfeita do modelo', () => {
  assert.equal(suggestReleasesFromOcr({ text: 'HYW18' })[0]?.model, 'Mazda MX-5 Miata');
  assert.ok(suggestReleasesFromOcr({ text: 'PORCHE 911 GT3' }).some(item => /Porsche 911 GT3/i.test(item.model)));
});
