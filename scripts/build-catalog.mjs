import { writeFile } from 'node:fs/promises';

const years = Array.from({ length: 2026 - 2017 + 1 }, (_, index) => 2017 + index);
const output = new URL('../src/catalog-data.json', import.meta.url);

function plain(value) {
  return value
    .replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, '$2')
    .replace(/\[\[([^\]]+)\]\]/g, '$1')
    .replace(/\{\{[^{}]*\}\}/g, '')
    .replace(/<br\s*\/?\s*>/gi, ' ')
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&').replace(/&#39;|&apos;/g, "'").replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, ' ').replace(/'{2,5}/g, '').replace(/\s+/g, ' ').trim();
}

function parseYear(wikitext, year) {
  const section = wikitext.match(/^==[^\n]*#1-(?:250|365)[^\n]*==([\s\S]*?)\n\|\}/m);
  if (!section) throw new Error(`Tabela Mainline de ${year} não encontrada.`);
  const rows = section[1].split(/\n\|-\s*\n/);
  const result = [];
  const seen = new Set();
  for (const row of rows) {
    const cells = row.split(/\r?\n/).filter(line => /^\|(?![-}])/.test(line)).map(line => line.slice(1).trim());
    if (cells.length < 5) continue;
    const code = plain(cells[0]).toUpperCase();
    if (!/^[A-Z]{3}[0-9]{2}$/.test(code) || seen.has(code)) continue;
    const rawName = plain(cells[2]);
    const variant = rawName.match(/\((?:[2-9](?:nd|rd|th) Color)(?:\s*-\s*[^)]+)?\)$/i)?.[0].slice(1, -1) || '';
    const model = variant ? rawName.slice(0, -(variant.length + 2)).trim() : rawName;
    if (!model || model.length > 100 || /^(?:TBD|unknown|unconfirmed)$/i.test(model)) continue;
    const seriesCell = cells[3].replace(/^\s*(?:bgcolor|style)\s*=.*?\|\s*/i, '');
    const series = plain(seriesCell).replace(/New for \d{4}!/gi, '')
      .replace(/(?:Super )?Treasure Hunt/gi, '')
      .replace(/(?:Target|Walmart|Kroger|Dollar General|Kmart) Exclusive/gi, '').trim() || 'Mainline';
    const collectorNo = plain(cells[1]).replace(/\D/g, '');
    const seriesNo = plain(cells[4]);
    result.push({ id: `${year}-${code}`, code, model, variant, year: String(year),
      series, seriesNo: /^\d+\/\d+$/.test(seriesNo) ? seriesNo : '',
      collectorNo: collectorNo ? String(Number(collectorNo)) : '', line: 'Mainline',
      source: `https://hotwheels.fandom.com/wiki/List_of_${year}_Hot_Wheels` });
    seen.add(code);
  }
  if (result.length < 200) throw new Error(`Poucos registros válidos em ${year}: ${result.length}`);
  return result;
}

const catalog = [];
for (const year of years) {
  const url = `https://hotwheels.fandom.com/api.php?action=parse&page=List_of_${year}_Hot_Wheels&prop=wikitext&format=json`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Não foi possível consultar a lista de ${year}: HTTP ${response.status}`);
  const payload = await response.json();
  const wikitext = payload?.parse?.wikitext?.['*'];
  if (!wikitext) throw new Error(`A API não devolveu a lista de ${year}.`);
  const entries = parseYear(wikitext, year);
  console.log(`${year}: ${entries.length} lançamentos Mainline`);
  catalog.push(...entries);
}
await writeFile(output, `${JSON.stringify(catalog)}\n`);
console.log(`Catálogo: ${catalog.length} lançamentos, sem imagens.`);
