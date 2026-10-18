import React from 'react';
import { Check, ChevronRight, Sparkles } from 'lucide-react';
import { normalize } from './search';

const fields = [
  ['model', 'Modelo'],
  ['year', 'Ano'],
  ['code', 'Código']
];

export default function OcrReview({ result, form, onApply }) {
  const suggestions = fields.filter(([key]) => result.hints?.[key]);

  return <section className="ocr-review" aria-live="polite">
    <div className="ocr-review-head">
      <span className="ocr-review-icon"><Sparkles size={18}/></span>
      <div>
        <strong>{suggestions.length ? 'Sugestões da embalagem' : 'Leitura da embalagem'}</strong>
        <p>{result.error || (suggestions.length
          ? 'Confira na foto e toque no dado que quiser usar.'
          : 'Não identifiquei nome, ano ou código com clareza. Tente outra foto mais perto do nome ou preencha manualmente.')}</p>
      </div>
    </div>
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
    {result.raw && <details className="ocr-raw"><summary>Ver texto original da leitura</summary><pre>{result.raw}</pre></details>}
  </section>;
}
