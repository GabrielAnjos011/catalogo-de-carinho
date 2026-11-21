import { matchReleaseByCode, searchReleases, suggestReleasesFromOcr } from './catalog.js';
import { normalize } from './search.js';

const productCode = /\b[A-Z]{3}\d{2}\b/g;

export function findByProductCode(value) {
  const code = String(value || '').trim().toUpperCase();
  const base = code.match(/^([A-Z]{3}\d{2})(?:-[A-Z0-9]{2,5})?$/)?.[1];
  return base ? matchReleaseByCode(base) : [];
}

export function identifyFromReadings(readings) {
  const lines = [...new Set(readings.flatMap(reading => [
    ...(reading?.lines || []).map(line => String(line.text || '')),
    ...String(reading?.text || '').split(/\r?\n/)
  ]).map(line => line.trim()).filter(Boolean))];
  const text = lines.join('\n').toUpperCase();
  const codes = [...new Set(text.match(productCode) || [])];
  const byCode = codes.flatMap(findByProductCode);
  const names = lines.map(line => line.replace(/\s*\/\s*(?:COURSE|CURSO)\b.*$/i, '').trim())
    .filter(line => line.length >= 7 && line.length <= 55 && !/hot wheels|mattel|warning|attention|www\.|made in|copyright/i.test(line));
  const lineText = normalize(lines.join(' '));
  const seriesNo = [...text.matchAll(/\b\d{1,2}\s*\/\s*\d{1,2}\b/g)].map(match => match[0].replace(/\s/g, ''));
  const collectorNo = [...text.matchAll(/\b(\d{1,3})\s*\/\s*250\b/g)].map(match => match[1]);
  const exactNames = names.flatMap(line => searchReleases(line)
    .filter(item => normalize(item.model) === normalize(line)));
  const byName = exactNames.length ? exactNames
    : names.flatMap(line => suggestReleasesFromOcr({ text: line }));
  const ranked = new Map();
  for (const item of byName) ranked.set(item.id, { item, code: false, name: true });
  for (const item of byCode) ranked.set(item.id, { item, code: true, name: ranked.get(item.id)?.name || false });
  const candidates = [...ranked.values()].map(candidate => ({
    ...candidate,
    series: lineText.includes(normalize(candidate.item.series)),
    seriesNo: seriesNo.includes(candidate.item.seriesNo),
    collectorNo: collectorNo.includes(candidate.item.collectorNo)
  })).sort((a, b) =>
    Number(b.code) - Number(a.code)
    || Number(b.name) - Number(a.name)
    || Number(b.series && b.seriesNo) - Number(a.series && a.seriesNo)
    || Number(b.series) - Number(a.series)
    || Number(b.seriesNo) - Number(a.seriesNo)
    || Number(b.collectorNo) - Number(a.collectorNo)
    || Number(b.item.year) - Number(a.item.year));
  const best = candidates[0];
  const reliable = best && (best.code && best.name || best.name && best.series && best.seriesNo || best.name && best.series && best.collectorNo);
  const filtered = reliable ? candidates.filter(candidate =>
    candidate.code && candidate.name || candidate.name && candidate.series && candidate.seriesNo || candidate.name && candidate.series && candidate.collectorNo)
    : candidates.slice(0, 8);
  return { candidates: filtered, codes, seriesNo, names: names.slice(0, 5), raw: lines.join('\n').trim() };
}

export function identifyFromFields(fields) {
  const model = String(fields?.model || '').trim().slice(0, 80);
  const code = String(fields?.code || '').trim().toUpperCase();
  const series = String(fields?.series || '').trim().slice(0, 60);
  const seriesNo = String(fields?.seriesNo || '').trim().replace(/\s/g, '');
  const collectorNo = String(fields?.collectorNo || '').trim();
  const color = String(fields?.color || '').trim().slice(0, 40);
  const safeCode = code.match(/^([A-Z]{3}\d{2})(?:-[A-Z0-9]{2,5})?$/)?.[1] || '';
  const safeSeriesNo = /^\d{1,2}\/\d{1,2}$/.test(seriesNo) ? seriesNo : '';
  const safeCollectorNo = /^\d{1,3}$/.test(collectorNo) ? collectorNo : '';
  const text = [model, safeCode, series, safeSeriesNo,
    safeCollectorNo ? `${safeCollectorNo}/250` : ''].filter(Boolean).join('\n');
  return { ...identifyFromReadings([{ text }]), source: 'ai',
    hints: { model, code: safeCode, series, seriesNo: safeSeriesNo, collectorNo: safeCollectorNo, color } };
}
