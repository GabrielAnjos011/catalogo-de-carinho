import catalog from './catalog-data.json' with { type: 'json' };
import { normalize } from './search.js';

export const releases = catalog;

export function searchReleases(query, year = 'Todos') {
  const terms = normalize(query).split(' ').filter(Boolean);
  const result = catalog.filter(item => {
    if (year !== 'Todos' && item.year !== year) return false;
    if (!terms.length) return true;
    const haystack = normalize([item.model, item.code, item.year, item.series, item.variant, item.collectorNo].join(' '));
    return terms.every(term => haystack.includes(term));
  });
  if (!terms.length) return result.sort((a, b) => Number(b.year) - Number(a.year) || Number(a.collectorNo) - Number(b.collectorNo));
  const needle = normalize(query);
  return result.sort((a, b) => {
    const score = item => item.code.toLowerCase() === needle ? 0
      : normalize(item.model) === needle ? 1
      : normalize(item.model).startsWith(needle) ? 2 : 3;
    return score(a) - score(b) || Number(b.year) - Number(a.year) || a.model.localeCompare(b.model);
  });
}

export function ownedForRelease(cars, release) {
  return cars.filter(car => car.catalogId === release.id || (car.code && car.code.toUpperCase() === release.code));
}

export function matchReleaseByCode(code) {
  const needle = String(code || '').trim().toUpperCase();
  return catalog.filter(item => item.code === needle);
}

function editDistance(a, b) {
  const previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i += 1) {
    let diagonal = previous[0];
    previous[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const old = previous[j];
      previous[j] = Math.min(previous[j] + 1, previous[j - 1] + 1, diagonal + Number(a[i - 1] !== b[j - 1]));
      diagonal = old;
    }
  }
  return previous[b.length];
}

export function suggestReleasesFromOcr(reading) {
  const text = typeof reading === 'string' ? reading : reading?.text || '';
  const code = text.toUpperCase().match(/\b[A-Z]{3}[0-9]{2}\b/g) || [];
  const exact = [...new Set(code)].flatMap(matchReleaseByCode);
  if (exact.length) return exact.slice(0, 6);
  const lines = (reading?.lines?.length ? reading.lines.map(line => line.text) : text.split(/\r?\n/))
    .map(normalize).filter(line => line.length >= 6 && line.length <= 55 && !/hot wheels|mattel|warning|made in|www/.test(line)).slice(0, 20);
  if (!lines.length) return [];
  const candidates = catalog.map(item => {
    const model = normalize(item.model);
    const score = Math.max(...lines.map(line => {
      if (line.includes(model)) return 1;
      if (model.includes(line) && line.length >= 8) return line.length / model.length;
      if (Math.abs(line.length - model.length) > Math.max(line.length, model.length) * 0.32) return 0;
      const distance = editDistance(line, model);
      return 1 - distance / Math.max(line.length, model.length);
    }));
    return { item, score };
  }).filter(candidate => candidate.score >= 0.68)
    .sort((a, b) => b.score - a.score || Number(b.item.year) - Number(a.item.year));
  const unique = [];
  const seen = new Set();
  for (const { item } of candidates) {
    if (seen.has(item.model)) continue;
    unique.push(item); seen.add(item.model);
    if (unique.length === 6) break;
  }
  return unique;
}
