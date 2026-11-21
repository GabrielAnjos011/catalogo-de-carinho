const productCode = value => String(value || '').trim().toUpperCase()
  .match(/^([A-Z]{3}\d{2})(?:-[A-Z0-9]{2,5})?$/)?.[1] || '';

export function seriesProgress(cars, releases) {
  const groups = new Map();
  const ownedIds = new Set(cars.map(car => car.catalogId).filter(Boolean));
  const legacyCodes = new Set(cars.filter(car => !car.catalogId && productCode(car.code) && car.year)
    .map(car => `${productCode(car.code)}::${car.year}`));
  const legacyWithoutYear = new Set(cars.filter(car => !car.catalogId && productCode(car.code) && !car.year)
    .map(car => productCode(car.code)));
  const codeFrequency = new Map();
  for (const release of releases) codeFrequency.set(release.code, (codeFrequency.get(release.code) || 0) + 1);
  for (const release of releases) {
    if (!release.series || !release.year) continue;
    const key = `${release.year}::${release.series}`;
    if (!groups.has(key)) groups.set(key, {
      key, year: release.year, series: release.series, total: 0, owned: 0
    });
    const group = groups.get(key);
    group.total += 1;
    if (ownedIds.has(release.id) || (release.code && (legacyCodes.has(`${release.code}::${release.year}`)
      || codeFrequency.get(release.code) === 1 && legacyWithoutYear.has(release.code)))) group.owned += 1;
  }
  return [...groups.values()].filter(group => group.owned > 0 && group.total > 1)
    .sort((a, b) => b.owned / b.total - a.owned / a.total
      || b.owned - a.owned || Number(b.year) - Number(a.year) || a.series.localeCompare(b.series));
}
