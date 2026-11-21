import { normalize, searchCars } from './search.js';

const productCode = value => String(value || '').trim().toUpperCase()
  .match(/^([A-Z]{3}\d{2})(?:-[A-Z0-9]{2,5})?$/)?.[1] || '';

export function purchaseMatches(cars, query) {
  const code = productCode(query);
  if (code) {
    const exact = cars.filter(car => productCode(car.code) === code);
    return { kind: exact.length ? 'exact-code' : 'none', matches: exact };
  }
  const matches = searchCars(cars, query);
  const sameModel = matches.filter(car => normalize(car.model) === normalize(query));
  return { kind: matches.length ? sameModel.length ? 'same-model' : 'related' : 'none', matches };
}
