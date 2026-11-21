import React, { useMemo, useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { releases } from './catalog';
import { seriesProgress } from './series-progress';

export default function SeriesProgress({ cars, onOpen }) {
  const groups = useMemo(() => seriesProgress(cars, releases), [cars]);
  const [showAll, setShowAll] = useState(false);
  if (!groups.length && !cars.length) return null;

  return <section className="series-progress" aria-label="Progresso por série">
    <div className="series-progress-head"><div><span className="eyebrow">SUAS SÉRIES</span><h2>Progresso por série</h2><p>Versões que você tem entre os lançamentos desta biblioteca.</p></div>{groups.length > 3 && <button type="button" onClick={() => setShowAll(value => !value)}>{showAll ? 'Ver menos' : `Ver todas (${groups.length})`}</button>}</div>
    {!groups.length ? <div className="series-progress-empty"><strong>Suas séries aparecerão aqui</strong><p>Vincule um carrinho a um lançamento da biblioteca para acompanhar as versões que faltam.</p><button type="button" onClick={() => onOpen(null)}>Explorar lançamentos <ChevronRight size={15}/></button></div> : <div className="series-progress-grid">{(showAll ? groups : groups.slice(0, 3)).map(group => {
      const percent = Math.round(group.owned / group.total * 100);
      return <button type="button" className="series-progress-card" key={group.key} onClick={() => onOpen(group)} aria-label={`${group.series} ${group.year}: ${group.owned} de ${group.total} versões catalogadas. Explorar série`}>
        <span className="series-progress-copy"><strong>{group.series}</strong><small>{group.year} · {group.owned} de {group.total} versões catalogadas</small></span><span className="series-progress-number">{percent}%</span>
        <span className="series-progress-track" aria-hidden="true"><span style={{ width: `${percent}%` }}/></span><span className="series-progress-link">Explorar série <ChevronRight size={15}/></span>
      </button>;
    })}</div>}
  </section>;
}
