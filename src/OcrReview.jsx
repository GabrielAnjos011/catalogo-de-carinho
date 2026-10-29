import React from 'react';
import { Check, ChevronRight, Sparkles } from 'lucide-react';
import { normalize } from './search';

const fields = [['model', 'Modelo'], ['code', 'Código do produto'], ['year', 'Ano explícito']];

export default function OcrReview({ result, form, onApply, onUseExisting, onPickRelease }) {
  const suggestions = fields.filter(([key]) => result.hints?.[key]);
  const existing = result.existing;
  const candidates = result.candidates || [];
  const rawLines = (result.raw || '').split(/\r?\n/).map(line => line.trim())
    .filter(line => line.length >= 5 && line.length <= 55 && !/hot wheels|mattel|warning|made in|www\./i.test(line)).slice(0, 4);

  return <section className="ocr-review" aria-live="polite">
    <div className="ocr-review-head">
      <span className="ocr-review-icon"><Sparkles size={18}/></span>
      <div>
        <strong>{existing ? 'Encontrado na sua garagem' : candidates.length ? 'Escolha o carrinho encontrado' : suggestions.length ? 'Texto da embalagem' : 'Leitura da embalagem'}</strong>
        <p>{result.error || (candidates.length
          ? 'Compare com a embalagem. Toque no modelo certo para usar os dados da biblioteca.'
          : suggestions.length ? 'Confira o texto e toque apenas no dado correto.'
            : result.raw ? 'O texto foi lido, mas não encontrei um modelo confiável. Você pode aproveitar uma linha abaixo ou pesquisar manualmente.'
              : 'Não consegui ler texto. Tente uma foto bem iluminada, de frente e mais próxima do nome.')}</p>
      </div>
    </div>
    {existing && <div className="ocr-existing">
      <span>CÓDIGO {result.hints.code} · NO SEU ACERVO</span>
      <strong>{existing.model}</strong>
      <p>{[existing.series, existing.year, existing.color].filter(Boolean).join(' · ') || 'Dados já cadastrados neste aparelho'}</p>
      <button type="button" className="secondary" onClick={() => onUseExisting(existing)}><Check size={16}/> Usar dados deste cadastro</button>
    </div>}
    {candidates.length > 0 && <div className="ocr-candidates"><span>RESULTADOS DA BIBLIOTECA</span>{candidates.map(item => <button type="button" key={item.id} onClick={() => onPickRelease(item)}><strong>{item.model}</strong><small>{item.year} · {item.series} · {item.code}</small><ChevronRight size={17}/></button>)}</div>}
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
    {!suggestions.length && !candidates.length && rawLines.length > 0 && <div className="ocr-raw-choices"><span>TEXTO QUE CONSEGUI LER</span>{rawLines.map((line, index) => <button type="button" key={`${index}-${line}`} onClick={() => onApply('model', line)}>{line}<ChevronRight size={16}/></button>)}</div>}
    {result.raw && <details className="ocr-raw"><summary>Ver texto lido na foto</summary><pre>{result.raw}</pre></details>}
  </section>;
}
