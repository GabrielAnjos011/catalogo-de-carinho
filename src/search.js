export function normalize(value = '') {
  return String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/porche/g, 'porsche').replace(/[^a-z0-9]+/g, ' ').trim();
}

export function searchCars(cars, query) {
  const terms = normalize(query).split(' ').filter(Boolean);
  if (!terms.length) return cars;
  return cars.filter(car => {
    const haystack = normalize([car.model, car.maker, car.series, car.year, car.color, car.code, car.notes].join(' '));
    return terms.every(term => haystack.includes(term));
  });
}

export function possibleDuplicates(cars, target) {
  const model = normalize(target.model);
  if (!model || model.length < 3) return [];
  return cars.filter(car => car.id !== target.id && normalize(car.model) === model)
    .sort((a, b) => Number(normalize(a.year) === normalize(target.year)) - Number(normalize(b.year) === normalize(target.year)));
}

const brand = /\b(?:nissan|porsche|porche|bmw|ford|chevrolet|chevy|ferrari|lamborghini|honda|toyota|dodge|mercedes(?:[- ]benz)?|volkswagen|vw|audi|mazda|subaru|mclaren|bugatti|aston martin|jeep|tesla|alfa romeo|fiat|renault|peugeot|cadillac|corvette|acura|lexus|hyundai|kia|pontiac|buick|mini|volvo|jaguar|land rover)\b/i;
const packaging = /hot wheels|mattel|guarantee|warning|attention|collect them|for ages|made in|facebook|instagram|youtube|www\.|assortment|asst\b|copyright|\b[0-9]+\s*\/\s*[0-9]+\b|\bupc\b|\bbarcode\b|\bhw (?:exotics|imports|race day|art cars|dream garage)\b/i;
const skuPattern = /\b[A-Z]{3}[0-9]{2}\b/g;

function cleanModel(value) {
  return value.replace(/[^\p{L}\p{N}\s'./()\-]/gu, ' ').replace(/\s+/g, ' ').trim()
    .replace(/\s+(?:[0-9]{4}|[A-Z]{3}[0-9]{2})$/i, '').trim();
}

function modelFromLine(line, closeup) {
  if (packaging.test(line)) return '';
  const match = brand.exec(line);
  if (match) {
    const tail = line.slice(match.index);
    if (/^nissan\s+skyline/i.test(tail) && /\b(?:gt|ot)[.\-\s]*\(?4?[r8]34\)?/i.test(tail)) return 'Nissan Skyline GT-R (R34)';
    const cleaned = cleanModel(tail.slice(0, 52));
    return cleaned.split(/\s+/).length >= 2 ? cleaned : '';
  }
  // Sem marca conhecida, só uma foto de perto legível justifica sugerir um nome.
  if (!closeup || line.length < 7 || line.length > 42 || /\d{4}|[<>_=]/.test(line)) return '';
  const cleaned = cleanModel(line);
  const words = cleaned.split(/\s+/);
  if (words.length < 2 || words.length > 6 || words.some(word => word.length > 16)) return '';
  if ((cleaned.match(/[a-z]{3,}/gi) || []).length < 2) return '';
  const letters = line.replace(/[^A-Za-z]/g, '');
  if (!letters || (letters.match(/[A-Z]/g) || []).length / letters.length < 0.7) return '';
  return cleaned;
}

export function extractHints(reading, { closeup = false } = {}) {
  const text = typeof reading === 'string' ? reading : reading?.text || '';
  const structured = typeof reading !== 'string';
  const lines = structured
    ? (reading?.lines || []).map(line => ({ text: String(line.text || '').trim(), confidence: Number(line.confidence) || 0 }))
    : text.split(/\r?\n/).map(line => ({ text: line.trim(), confidence: 100 }));
  const legible = lines.filter(line => line.text && line.confidence >= 60);
  const models = legible.map(line => ({ ...line, value: modelFromLine(line.text, closeup && line.confidence >= 85) }))
    .filter(line => line.value).sort((a, b) => b.confidence - a.confidence);
  const codeCandidates = legible.filter(line => line.confidence >= 85).flatMap(line => {
    if (/\basst\b|assortment|\bcase\b/i.test(line.text)) return [];
    return [...line.text.toUpperCase().matchAll(skuPattern)].map(match => match[0]);
  });
  const codes = [...new Set(codeCandidates)];
  // Uma data de copyright ou o ano do veículo não é o ano desta edição.
  const year = legible.map(line => line.text.match(/\b(?:ano|year|release year)\s*[:\-]?\s*(20\d{2})\b/i)?.[1]).find(Boolean) || '';
  return { model: models[0]?.value || '', year, code: codes.length === 1 ? codes[0] : '', raw: text.trim() };
}

export function findExactCodeMatch(cars, code, excludeId) {
  if (!/^[A-Z]{3}[0-9]{2}$/.test(String(code).toUpperCase())) return null;
  const matches = cars.filter(car => car.id !== excludeId && String(car.code || '').toUpperCase() === code.toUpperCase());
  if (!matches.length || new Set(matches.map(car => normalize(car.model))).size !== 1) return null;
  return matches[0];
}
