import {
  ArrowLeft,
  BarChart3,
  CheckCircle2,
  Globe2,
  MapPin,
  ShieldCheck,
  Sparkles,
  Trophy,
  UsersRound,
} from 'lucide-react';
import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { isFirebaseConfigured } from '../lib/firebase';
import { Button, Logo } from '../components/UI';
import type { UserRole } from '../types';

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.4-.18-2.07H12v3.91h5.38a4.6 4.6 0 0 1-2 3.02v2.54h3.24c1.9-1.75 2.98-4.32 2.98-7.4Z" />
      <path fill="#34A853" d="M12 22c2.7 0 4.98-.9 6.63-2.43l-3.24-2.54c-.9.6-2.05.96-3.39.96-2.61 0-4.82-1.77-5.61-4.14H3.04v2.62A10 10 0 0 0 12 22Z" />
      <path fill="#FBBC05" d="M6.39 13.85A6.01 6.01 0 0 1 6.08 12c0-.64.11-1.27.31-1.85V7.53H3.04A10 10 0 0 0 2 12c0 1.61.39 3.13 1.04 4.47l3.35-2.62Z" />
      <path fill="#EA4335" d="M12 6.01c1.47 0 2.78.5 3.82 1.5l2.87-2.87A9.65 9.65 0 0 0 12 2a10 10 0 0 0-8.96 5.53l3.35 2.62C7.18 7.78 9.39 6.01 12 6.01Z" />
    </svg>
  );
}

export function Login() {
  const { loginGoogle, enterDemo, authLoading } = useApp();
  const [demoOpen, setDemoOpen] = useState(false);

  const chooseDemo = (role: UserRole) => {
    enterDemo(role);
  };

  return (
    <div className="login-page">
      <section className="login-hero">
        <div className="login-hero__grid" />
        <div className="login-hero__top" style={{ marginTop: '50px' }}><Logo /></div>
        <div className="login-hero__content">
          <span className="login-hero__eyebrow"><Sparkles size={15} /> A resenha ficou profissional</span>
          <h1>Seu futebol.<br /><em>Bem organizado.</em></h1>
          <p>Da convocação ao apito final: equipes, partidas, estatísticas e check-in em um só lugar.</p>
          <div className="login-hero__features">
            <span><MapPin size={17} /> Check-in com geolocalização</span>
            <span><BarChart3 size={17} /> Estatísticas em tempo real</span>
            <span><Trophy size={17} /> Gestão de ligas e suspensões</span>
          </div>
        </div>
        <div className="login-score-card">
          <div className="login-score-card__head">
            <span>PRÓXIMA PARTIDA</span>
            <small>AMANHÃ · 19:30</small>
          </div>
          <div className="login-score-card__teams">
            <div><i className="mini-shield mini-shield--lime">BRA</i><strong>Brasil Favela FC</strong></div>
            <span><small>COPA RESENHA</small><b>VS</b></span>
            <div><i className="mini-shield mini-shield--orange">2IR</i><strong>EC 2 Irmãos</strong></div>
          </div>
          <div className="login-score-card__foot"><MapPin size={12} /> Arena Pituaçu</div>
        </div>
        <div className="login-hero__footer">
          <span>© 2026 BABA MANAGER</span>
          <span>Feito para quem leva a resenha a sério.</span>
        </div>
      </section>

      <section className="login-panel">
        <a className="login-back-home" href="/"><ArrowLeft size={17} /> Voltar para o site</a>
        <div className="login-panel__mobile-logo"><Logo /></div>
        <div className="login-card">
          <span className="login-card__icon"><ShieldCheck size={26} /></span>
          <h2>Bem-vindo de volta</h2>
          <p>Entre para acessar sua liga, gerenciar equipes ou confirmar presença.</p>
          <button className="google-button" type="button" onClick={loginGoogle} disabled={!isFirebaseConfigured || authLoading}>
            <GoogleIcon />
            {authLoading ? 'Conectando...' : 'Continuar com Google'}
          </button>
          {!isFirebaseConfigured && (
            <div className="config-notice">
              <CheckCircle2 size={16} />
              <span>O modo demo está pronto. Para o login real, adicione as chaves do Firebase no arquivo <b>.env</b>.</span>
            </div>
          )}
          <a className="login-public-link" href="/ligas-publicas"><Globe2 size={18} /> Ver ligas públicas sem entrar</a>
          <div className="login-divider"><span>ou explore a demonstração</span></div>
          {!demoOpen ? (
            <Button variant="secondary" onClick={() => setDemoOpen(true)}>Acessar modo demonstração</Button>
          ) : (
            <div className="demo-roles">
              <button type="button" onClick={() => chooseDemo('manager')}>
                <span><ShieldCheck size={19} /></span>
                <div><strong>Gerenciador</strong><small>Organize partidas e atletas</small></div>
              </button>
              <button type="button" onClick={() => chooseDemo('player')}>
                <span><UsersRound size={19} /></span>
                <div><strong>Jogador</strong><small>Check-in, agenda e ranking</small></div>
              </button>
              <button type="button" onClick={() => chooseDemo('master')}>
                <span><BarChart3 size={19} /></span>
                <div><strong>Master</strong><small>Monitore toda a plataforma</small></div>
              </button>
            </div>
          )}
          <small className="login-terms">Ao continuar, você concorda com os Termos de Uso e a Política de Privacidade.</small>
        </div>
      </section>
    </div>
  );
}
