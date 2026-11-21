import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CarFront, Check, ChevronRight, Plus, Search, X } from 'lucide-react';
import { ownedForRelease, releases, searchReleases } from './catalog';
import { normalize } from './search';
import { purchaseMatches } from './purchase';

const years = [...new Set(releases.map(item => item.year))].sort((a, b) => Number(b) - Number(a));
const mainlineYears = years.filter(year => releases.some(item => item.year === year && item.source.includes('/List_of_')));
const extrasCount = releases.length - releases.filter(item => item.source.includes('/List_of_')).length;
const formatCount = count => count.toLocaleString('pt-BR');

export default function Explore({ cars, query, setQuery, seriesJump, onSelect, onPick, onManual }) {
  const [year, setYear] = useState('Todos');
  const [limit, setLimit] = useState(24);
  const [showAllOwned, setShowAllOwned] = useState(false);
  useEffect(() => { if (seriesJump) { setYear(seriesJump.year); setLimit(24); } }, [seriesJump]);
  const allMatches = useMemo(() => searchReleases(query), [query]);
  const found = useMemo(() => year === 'Todos' ? allMatches : allMatches.filter(item => item.year === year), [allMatches, year]);
  const countByYear = useMemo(() => {
    const counts = new Map(years.map(option => [option, 0]));
    for (const item of allMatches) counts.set(item.year, counts.get(item.year) + 1);
    return counts;
  }, [allMatches]);
  const purchase = normalize(query) ? purchaseMatches(cars, query) : { kind: 'none', matches: [] };
  const owned = purchase.matches;
  const visible = found.slice(0, limit);
  const changeQuery = value => { setQuery(value); setLimit(24); setShowAllOwned(false); };
  const changeYear = value => { setYear(value); setLimit(24); };

  return <section className="explore-page">
    <span className="eyebrow"><span className="eyebrow-line"/> ENCONTRE ANTES DE CADASTRAR</span>
    <h1>Explorar carrinhos<span className="accent-dot">.</span></h1>
    <p className="page-subtitle">Pesquise o nome ou o código da embalagem. Ao encontrar o seu, complete só os detalhes pessoais.</p>
    <label className="explore-search" htmlFor="explore-query"><Search size={21}/>
      <input id="explore-query" type="search" enterKeyHint="search" autoComplete="off" value={query}
        onChange={event => changeQuery(event.target.value)} placeholder="Ex.: Porsche 911 ou HYW18" />
      {query && <button type="button" onClick={() => changeQuery('')} aria-label="Limpar busca"><X size={18}/></button>}
    </label>
    <label className="explore-years" htmlFor="explore-year"><span>Ano do lançamento</span><select id="explore-year" value={year} onChange={event => changeYear(event.target.value)}><option value="Todos">Todos os anos ({formatCount(allMatches.length)})</option>{years.map(option => <option key={option} value={option}>{option} ({formatCount(countByYear.get(option))})</option>)}</select></label>
    {normalize(query) && <div className={`explore-verdict ${purchase.kind}`} role="status">
      {purchase.kind === 'exact-code' ? <Check size={20}/> : purchase.kind === 'none' ? <Search size={20}/> : <AlertTriangle size={20}/>}
      <div><strong>{purchase.kind === 'exact-code' ? 'Este código já está na sua garagem' : purchase.kind === 'same-model' ? 'Você tem este modelo; confira a versão' : purchase.kind === 'related' ? 'Há carrinhos relacionados na sua garagem' : 'Nenhum cadastro correspondente na sua garagem'}</strong>
        <p>{purchase.kind === 'exact-code' ? 'Abra o registro e compare ano, série, foto e cor; alguns códigos podem ser reutilizados.' : purchase.kind === 'none' ? 'Confira também os lançamentos da biblioteca antes de cadastrar.' : 'Compare o código, o ano e a cor da embalagem antes de decidir.'}</p></div>
    </div>}
    <button type="button" className="explore-manual" onClick={() => onManual(query)}><span className="explore-manual-icon"><Plus size={20}/></span><span className="explore-manual-copy"><strong>Cadastrar manualmente</strong><small>Para modelos fora da biblioteca ou de outras marcas</small></span><ChevronRight size={18}/></button>
    {owned.length > 0 && <div className="explore-owned">
      <div className="explore-section-title"><div><small>NA SUA GARAGEM</small><h2>{owned.length === 1 ? '1 registro encontrado' : `${owned.length} registros encontrados`}</h2></div><Check size={19}/></div>
      {(showAllOwned ? owned : owned.slice(0, 4)).map(car => <button type="button" className="explore-owned-row" key={car.id} onClick={() => onSelect(car)}>
        <span className="explore-thumb owned">{car.photo ? <img src={car.photo} alt=""/> : <CarFront size={24}/>}</span>
        <span><strong>{car.model}</strong><small>{[car.year, car.color, car.code].filter(Boolean).join(' · ') || 'Ver detalhes do cadastro'}</small></span><ChevronRight size={18}/>
      </button>)}
      {owned.length > 4 && <button type="button" className="explore-owned-more" onClick={() => setShowAllOwned(value => !value)}>{showAllOwned ? 'Mostrar menos' : `Ver todos os ${owned.length} registros`}</button>}
    </div>}

    <div className="explore-section-title library-title"><div><small>BIBLIOTECA DE LANÇAMENTOS</small><h2>{query ? 'Resultados da biblioteca' : 'Para descobrir e adicionar'}</h2></div><span aria-live="polite">{formatCount(found.length)} {found.length === 1 ? 'registro' : 'registros'}</span></div>
    <p className="explore-scope">Mainline de {mainlineYears.at(-1)} a {mainlineYears[0]} e {extrasCount} lançamentos adicionais verificados. Você também pode cadastrar qualquer carrinho manualmente.</p>
    {visible.length ? <div className="release-list">{visible.map(item => {
      const matches = ownedForRelease(cars, item);
      const photo = matches.find(car => car.photo)?.photo;
      return <button className={`release-row ${matches.length ? 'is-owned' : ''}`} type="button" key={item.id} onClick={() => matches.length ? onSelect(matches[0]) : onPick(item)}>
        <span className="explore-thumb">{photo ? <img src={photo} alt=""/> : <CarFront size={29}/>}</span>
        <span className="release-copy"><strong>{item.model}</strong><small>{item.year} · {item.series}{item.variant ? ` · ${item.variant}` : ''}</small><span className="release-code">{item.code}{item.seriesNo ? ` · ${item.seriesNo}` : ''}</span></span>
        <span className={`release-action ${matches.length ? 'owned' : ''}`}>{matches.length ? <><Check size={15}/> Já tenho</> : <><Plus size={15}/> Adicionar</>}</span>
      </button>;
    })}</div> : <div className="explore-empty"><Search size={27}/><strong>Não encontrei na biblioteca</strong><p>Tente outra parte do nome ou cadastre com os dados da sua embalagem.</p></div>}
    {found.length > visible.length && <button className="secondary explore-more" onClick={() => setLimit(current => current + 24)}>Mostrar mais {Math.min(24, found.length - visible.length)}</button>}
    <p className="explore-credit">Dados das listas anuais da Hot Wheels Wiki: {mainlineYears.map((option, index) => <React.Fragment key={option}>{index > 0 ? ', ' : ''}<a href={`https://hotwheels.fandom.com/wiki/List_of_${option}_Hot_Wheels`} target="_blank" rel="noreferrer">{option}</a></React.Fragment>)}. Adicionais: <a href="https://hotwheels.fandom.com/wiki/Porsche_Series_(2015)" target="_blank" rel="noreferrer">Porsche Series 2015</a> e <a href="https://hotwheels.fandom.com/wiki/Ferrari_599XX" target="_blank" rel="noreferrer">Ferrari 599XX</a>. Adaptados sob <a href="https://creativecommons.org/licenses/by-sa/3.0/" target="_blank" rel="noreferrer">CC BY-SA</a>. Fotos de terceiros não foram reproduzidas.</p>
  </section>;
}
