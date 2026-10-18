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

export function extractHints(text) {
  const lines = text.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  const ignored = /hot wheels|mattel|guarantee|warning|attention|collect them|for ages|made in|facebook|instagram|youtube|www\.|\b\d+\s*\/\s*\d+\b/i;
  const brand = /\b(?:nissan|porsche|bmw|ford|chevrolet|chevy|ferrari|lamborghini|honda|toyota|dodge|mercedes|volkswagen|audi|mazda|subaru|mclaren|bugatti|aston martin)\b/i;
  const branded = lines.map(line => {
    const found = brand.exec(line);
    if (!found) return '';
    const tail = line.slice(found.index);
    if (/^nissan\s+skyline/i.test(tail) && /\b(?:gt|ot)[.\-\s]*\(?4?[r8]34\)?/i.test(tail)) return 'Nissan Skyline GT-R (R34)';
    const end = tail.indexOf(')');
    return (end > 0 ? tail.slice(0, end + 1) : tail).slice(0, 48);
  }).filter(Boolean);
  const fallback = lines.filter(line => !ignored.test(line) && line.length <= 48 &&
    (line.match(/[a-z]{3,}/gi) || []).length >= 2 &&
    (line.match(/[^a-z0-9\s'./()\-]/gi) || []).length <= 2);
  const model = (branded[0] || fallback[0] || '').replace(/[^\w\s'./()\-]/g, ' ').replace(/\s+/g, ' ').trim();
  const year = text.match(/\b(19[5-9]\d|20[0-3]\d)\b/);
  const code = text.match(/\b[A-Z]{2,3}[0-9]{2,4}\b/);
  return { model, year: year?.[0] || '', code: code?.[0] || '', raw: text.trim() };
}
