import React from 'react';
import { Check, ChevronRight, Sparkles } from 'lucide-react';
import { normalize } from './search';

const fields = [['model', 'Modelo'], ['code', 'Código do produto'], ['year', 'Ano explícito']];

export default function OcrReview({ result, form, onApply, onUseExisting }) {
  const suggestions = fields.filter(([key]) => result.hints?.[key]);
  const existing = result.existing;

  return <section className="ocr-review" aria-live="polite">
    <div className="ocr-review-head">
      <span className="ocr-review-icon"><Sparkles size={18}/></span>
      <div>
        <strong>{existing ? 'Encontrado na sua garagem' : suggestions.length ? 'Sugestões da embalagem' : 'Leitura da embalagem'}</strong>
        <p>{result.error || (suggestions.length
          ? 'Confira cada dado impresso antes de usar. A leitura da imagem pode falhar.'
          : 'Não identifiquei dados com segurança. Fotografe só o nome, bem de perto e com boa luz.')}</p>
      </div>
    </div>
    {existing && <div className="ocr-existing">
      <span>CÓDIGO {result.hints.code} · NO SEU ACERVO</span>
      <strong>{existing.model}</strong>
      <p>{[existing.series, existing.year, existing.color].filter(Boolean).join(' · ') || 'Dados já cadastrados neste aparelho'}</p>
      <button type="button" className="secondary" onClick={() => onUseExisting(existing)}><Check size={16}/> Usar dados deste cadastro</button>
    </div>}
    {suggestions.length > 0 && <div className="ocr-suggestions">
      {suggestions.map(([key, label]) => {
        const value = result.hints[key];
        const applied = normalize(form[key]) === normalize(value);
        return <button type="button" className={`ocr-suggestion ${applied ? 'applied' : ''}`} key={key} disabled={applied} onClick={() => onApply(key, value)}>
          <span className="ocr-suggestion-copy"><small>{label}</small><strong>{value}</strong></span>
          <span className="ocr-suggestion-action">{applied ? <><Check size={15}/> No formulário</> : <>{form[key] ? 'Substituir' : 'Usar'} <ChevronRight size={16}/></>}</span>
        </button>;
      })}
    </div>}
    {result.raw && <details className="ocr-raw"><summary>Ver texto lido na foto</summary><pre>{result.raw}</pre></details>}
  </section>;
}
