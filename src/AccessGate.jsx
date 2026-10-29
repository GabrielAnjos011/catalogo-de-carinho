import React from 'react';
import { CarFront, LockKeyhole, LogIn } from 'lucide-react';

export default function AccessGate({ configured, checking, busy, error, email, password, onEmail, onPassword, onSubmit }) {
  return <main className="access-page">
    <section className="access-card" aria-labelledby="access-title">
      <div className="access-brand"><span className="brand-icon"><CarFront size={25}/></span><strong>Garagem</strong></div>
      <div className="access-lock"><LockKeyhole size={27}/></div>
      <span className="eyebrow"><span className="eyebrow-line"/> ACESSO RESTRITO</span>
      <h1 id="access-title">Sua coleção está protegida<span className="accent-dot">.</span></h1>
      <p>Entre com uma conta liberada pelo responsável pela garagem.</p>
      {!configured ? <div className="access-message" role="alert">O Firebase ainda não foi configurado para esta publicação. Consulte o README antes de liberar o acesso.</div>
        : checking ? <div className="access-message" role="status">Verificando seu acesso…</div>
          : <form onSubmit={onSubmit}>
            <label>E-mail<input type="email" autoComplete="username" value={email} onChange={event => onEmail(event.target.value)} placeholder="seu@email.com" required/></label>
            <label>Senha<input type="password" autoComplete="current-password" value={password} onChange={event => onPassword(event.target.value)} placeholder="Sua senha" minLength={6} required/></label>
            {error && <div className="access-message" role="alert">{error}</div>}
            <button className="primary" type="submit" disabled={busy}><LogIn size={18}/>{busy ? 'Verificando…' : 'Entrar na garagem'}</button>
          </form>}
      <small>Contas são criadas e aprovadas pelo responsável. Não há cadastro público.</small>
    </section>
  </main>;
}
