import React, { useMemo, useState } from 'react';
import { CarFront, Check, ChevronRight, Plus, Search, X } from 'lucide-react';
import { ownedForRelease, releases, searchReleases } from './catalog';
import { normalize, searchCars } from './search';

const years = [...new Set(releases.map(item => item.year))].sort((a, b) => Number(b) - Number(a));
const formatCount = count => count.toLocaleString('pt-BR');

export default function Explore({ cars, query, setQuery, onSelect, onPick, onManual }) {
  const [year, setYear] = useState('Todos');
  const [limit, setLimit] = useState(24);
  const allMatches = useMemo(() => searchReleases(query), [query]);
  const found = useMemo(() => year === 'Todos' ? allMatches : allMatches.filter(item => item.year === year), [allMatches, year]);
  const countByYear = useMemo(() => {
    const counts = new Map(years.map(option => [option, 0]));
    for (const item of allMatches) counts.set(item.year, counts.get(item.year) + 1);
    return counts;
  }, [allMatches]);
  const owned = normalize(query) ? searchCars(cars, query) : [];
  const visible = found.slice(0, limit);
  const changeQuery = value => { setQuery(value); setLimit(24); };
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
    <button type="button" className="explore-manual" onClick={() => onManual(query)}><span className="explore-manual-icon"><Plus size={20}/></span><span className="explore-manual-copy"><strong>Cadastrar manualmente</strong><small>Para modelos fora da biblioteca ou de outras marcas</small></span><ChevronRight size={18}/></button>

    {owned.length > 0 && <div className="explore-owned">
      <div className="explore-section-title"><div><small>NA SUA GARAGEM</small><h2>{owned.length === 1 ? 'Você já tem este carrinho' : `Você tem ${owned.length} resultados`}</h2></div><Check size={19}/></div>
      {owned.slice(0, 4).map(car => <button type="button" className="explore-owned-row" key={car.id} onClick={() => onSelect(car)}>
        <span className="explore-thumb owned">{car.photo ? <img src={car.photo} alt=""/> : <CarFront size={24}/>}</span>
        <span><strong>{car.model}</strong><small>{[car.year, car.color, car.code].filter(Boolean).join(' · ') || 'Ver detalhes do cadastro'}</small></span><ChevronRight size={18}/>
      </button>)}
    </div>}

    <div className="explore-section-title library-title"><div><small>BIBLIOTECA DE LANÇAMENTOS</small><h2>{query ? 'Resultados da biblioteca' : 'Para descobrir e adicionar'}</h2></div><span aria-live="polite">{formatCount(found.length)} {found.length === 1 ? 'registro' : 'registros'}</span></div>
    <p className="explore-scope">Mainline de {years.at(-1)} a {years[0]}. Você também pode cadastrar qualquer carrinho manualmente.</p>
    {visible.length ? <div className="release-list">{visible.map(item => {
      const matches = ownedForRelease(cars, item);
      const photo = matches.find(car => car.photo)?.photo;
      return <button className={`release-row ${matches.length ? 'is-owned' : ''}`} type="button" key={item.id} onClick={() => onPick(item)}>
        <span className="explore-thumb">{photo ? <img src={photo} alt=""/> : <CarFront size={29}/>}</span>
        <span className="release-copy"><strong>{item.model}</strong><small>{item.year} · {item.series}{item.variant ? ` · ${item.variant}` : ''}</small><span className="release-code">{item.code}{item.seriesNo ? ` · ${item.seriesNo}` : ''}</span></span>
        <span className={`release-action ${matches.length ? 'owned' : ''}`}>{matches.length ? <><Check size={15}/> Tenho</> : <><Plus size={15}/> Tenho</>}</span>
      </button>;
    })}</div> : <div className="explore-empty"><Search size={27}/><strong>Não encontrei na biblioteca</strong><p>Tente outra parte do nome ou cadastre com os dados da sua embalagem.</p></div>}
    {found.length > visible.length && <button className="secondary explore-more" onClick={() => setLimit(current => current + 24)}>Mostrar mais {Math.min(24, found.length - visible.length)}</button>}
    <p className="explore-credit">Dados das listas anuais da Hot Wheels Wiki: {years.map((option, index) => <React.Fragment key={option}>{index > 0 ? ', ' : ''}<a href={`https://hotwheels.fandom.com/wiki/List_of_${option}_Hot_Wheels`} target="_blank" rel="noreferrer">{option}</a></React.Fragment>)}. Adaptados em 29/10/2026 sob <a href="https://creativecommons.org/licenses/by-sa/3.0/" target="_blank" rel="noreferrer">CC BY-SA</a>. Fotos de terceiros não foram reproduzidas.</p>
  </section>;
}
