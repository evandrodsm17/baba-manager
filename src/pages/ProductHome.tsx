import {
  ArrowRight,
  BarChart3,
  CalendarCheck2,
  CheckCircle2,
  ClipboardCheck,
  Globe2,
  LogIn,
  MapPin,
  ShieldCheck,
  Sparkles,
  Trophy,
  UsersRound,
  Zap,
  HelpCircle,
  Box,
} from 'lucide-react';
import { PiSoccerBallFill } from "react-icons/pi";
import { TbRectangleVerticalFilled } from "react-icons/tb";
import { useEffect, useState } from 'react';
import { Badge, Button, Logo } from '../components/UI';
import { useApp } from '../context/AppContext';
import { db } from '../lib/firebase';
import { buildPublicLeagueSnapshot, loadPublicLeagueList } from '../lib/publicLeague';
import { useNavigate } from '../lib/router';
import type { PublicLeagueSnapshot } from '../types';

export function ProductHome() {
  const { currentUser, data, isDemo } = useApp();
  const navigate = useNavigate();
  const [leagues, setLeagues] = useState<PublicLeagueSnapshot[]>([]);
  const [loadingLeagues, setLoadingLeagues] = useState(true);
  const managementPath = currentUser ? '/painel' : '/login';

  useEffect(() => {
    document.title = 'BABA MANAGER · Gestão para futebol amador';
    return () => {
      document.title = 'BABA MANAGER';
    };
  }, []);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoadingLeagues(true);
      try {
        if (isDemo) {
          const demoLeagues = data.leagues
            .filter((league) => league.isPublic)
            .map((league) => buildPublicLeagueSnapshot(data, league).snapshot);
          if (active) setLeagues(demoLeagues);
        } else if (db) {
          const publicLeagues = await loadPublicLeagueList(db);
          if (active) setLeagues(publicLeagues);
        }
      } catch (error) {
        console.error('Falha ao carregar ligas na página inicial:', error);
        if (active) setLeagues([]);
      } finally {
        if (active) setLoadingLeagues(false);
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, [data, isDemo]);

  return (
    <div className="product-page">
      <header className="product-nav">
        <div className="product-nav__inner">
          <a href="/" aria-label="Página inicial"><Logo /></a>
          <nav>
            <a href="#como-funciona"><HelpCircle size={16}/>Como funciona</a>
            <a href="#recursos"><Box size={16}/> Recursos</a>
            <a href="#ligas"><Trophy size={16}/> Ligas públicas</a>
          </nav>
          <Button icon={currentUser ? ArrowRight : LogIn} onClick={() => navigate(managementPath)}>
            {currentUser ? 'Abrir painel' : 'Entrar'}
          </Button>
        </div>
      </header>

      <main>
        <section className="product-hero">
          <div className="product-hero__grid" />
          <div className="product-container product-hero__inner">
            <div className="product-hero__copy">
              <span className="product-eyebrow"><Sparkles size={16} /> A RESENHA FICOU PROFISSIONAL</span>
              <h1>Organize seu baba.<br /><em>Mostre seu futebol.</em></h1>
              <p>Equipes, partidas, check-in, súmulas e ligas completas em uma plataforma feita para o futebol amador.</p>
              <div className="product-hero__actions">
                <Button icon={ArrowRight} onClick={() => navigate(managementPath)}>
                  {currentUser ? 'Ir para o painel' : 'Começar agora'}
                </Button>
                <a href="#ligas"><Globe2 size={18} /> Explorar ligas públicas</a>
              </div>
              <div className="product-hero__proof">
                <span><CheckCircle2 size={16} /> Login com Google</span>
                <span><CheckCircle2 size={16} /> Publicação na Vercel</span>
                <span><CheckCircle2 size={16} /> Dados no Firebase</span>
              </div>
            </div>
            <div className="product-hero__visual">
              <div className="product-hero__glow" />
              <img src="/mascote-baba-manager.png" alt="Mascote oficial do BABA MANAGER segurando um celular e uma prancheta" />
              <div className="product-floating-card product-floating-card--match">
                <span><CalendarCheck2 size={18} /></span>
                <div><small>PRÓXIMA PARTIDA</small><strong>Hoje · 20:00</strong></div>
              </div>
              <div className="product-floating-card product-floating-card--stats">
                <span><BarChart3 size={18} /></span>
                <div><small>LIGA ATUALIZADA</small><strong>Ranking em tempo real</strong></div>
              </div>
            </div>
          </div>
          <div className="product-container product-trust-bar">
            <span><UsersRound size={20} /><b>Elencos</b><small>Jogadores e equipes</small></span>
            <span><MapPin size={20} /><b>Check-in</b><small>Validação por localização</small></span>
            <span><ClipboardCheck size={20} /><b>Súmulas</b><small>Gols, assistências e cartões</small></span>
            <span><Globe2 size={20} /><b>Ligas públicas</b><small>Compartilhe sem exigir login</small></span>
          </div>
        </section>

        <section className="product-section product-how" id="como-funciona">
          <div className="product-container">
            <div className="product-section__heading">
              <span className="product-eyebrow">COMO FUNCIONA</span>
              <h2>Da convocação ao apito final.</h2>
              <p>O BABA MANAGER conecta toda a rotina da sua organização em um único fluxo.</p>
            </div>
            <div className="product-steps">
              <article>
                <b>01</b><span><ShieldCheck size={24} /></span>
                <h3>Monte sua organização</h3>
                <p>Cadastre equipes, jogadores, posições, locais e as regras das suas ligas.</p>
              </article>
              <article>
                <b>02</b><span><CalendarCheck2 size={24} /></span>
                <h3>Gerencie os jogos</h3>
                <p>Agende partidas, confirme presenças e registre a súmula evento por evento.</p>
              </article>
              <article>
                <b>03</b><span><Globe2 size={24} /></span>
                <h3>Compartilhe os resultados</h3>
                <p>Publique classificação, partidas e rankings para jogadores, amigos e torcedores.</p>
              </article>
            </div>
          </div>
        </section>

        <section className="product-section product-features" id="recursos">
          <div className="product-container">
            <div className="product-section__heading">
              <span className="product-eyebrow">TUDO EM CAMPO</span>
              <h2>Mais organização. Mais história.</h2>
              <p>Ferramentas para o gerenciador e uma experiência que valoriza cada jogador.</p>
            </div>
            <div className="product-feature-grid">
              <article className="product-feature product-feature--large">
                <span><ClipboardCheck size={25} /></span>
                <div><small>SÚMULA DIGITAL</small><h3>O placar nasce dos eventos.</h3><p>Gols, assistências opcionais, gol contra, cartões, edição controlada e bloqueio ao finalizar.</p></div>
                <div className="product-event-preview">
                  <span><b>12'</b><PiSoccerBallFill size={20} /><strong>Gol · Cadu</strong><small>Assistência de Luquinhas</small></span>
                  <span><b>37'</b><TbRectangleVerticalFilled size={20} color='yellow' /><strong>Cartão amarelo</strong><small>Controle disciplinar</small></span>
                </div>
              </article>
              <article className="product-feature">
                <span><MapPin size={25} /></span>
                <small>CHECK-IN</small><h3>Presença validada no local.</h3><p>O gerenciador decide quando exigir a geolocalização do jogador.</p>
              </article>
              <article className="product-feature">
                <span><BarChart3 size={25} /></span>
                <small>DESEMPENHO</small><h3>Artilharia e assistências.</h3><p>Rankings automáticos a partir das partidas oficiais de cada liga.</p>
              </article>
              <article className="product-feature product-feature--wide">
                <span><Zap size={25} /></span>
                <div><small>MÚLTIPLOS PAPÉIS</small><h3>Uma conta, vários contextos.</h3><p>A mesma pessoa pode ser gerenciador e jogador em diferentes organizações e equipes.</p></div>
              </article>
            </div>
          </div>
        </section>

        <section className="product-section product-leagues" id="ligas">
          <div className="product-container">
            <div className="product-section__heading product-section__heading--row">
              <div><span className="product-eyebrow">LIGAS PÚBLICAS</span><h2>O futebol da comunidade.</h2><p>Acompanhe campeonatos publicados no BABA MANAGER sem precisar entrar.</p></div>
              <Button variant="secondary" icon={Globe2} onClick={() => navigate('/ligas-publicas')}>Ver todas</Button>
            </div>
            {loadingLeagues ? (
              <div className="product-leagues__loading"><span /><p>Buscando ligas públicas...</p></div>
            ) : leagues.length ? (
              <div className="product-league-grid">
                {leagues.slice(0, 6).map((league) => (
                  <article className="product-league-card" key={league.id}>
                    <div className="product-league-card__media">
                      {league.imageUrl
                        ? <img src={league.imageUrl} alt={`Imagem da liga ${league.name}`} />
                        : <span><Trophy size={35} /></span>}
                      <Badge tone={league.status === 'active' ? 'success' : 'neutral'} dot>{league.status === 'active' ? 'Em andamento' : 'Encerrada'}</Badge>
                    </div>
                    <div className="product-league-card__body">
                      <small>{league.organizationName}</small>
                      <h3>{league.name}</h3>
                      <p>Temporada {league.season}</p>
                      <div><span><b>{league.format === 'draw' ? league.matchCount : league.teamCount}</b> {league.format === 'draw' ? 'babas' : 'equipes'}</span><span><b>{league.finishedMatchCount}</b> jogos</span><span><b>{league.playerCount}</b> atletas</span></div>
                      <button type="button" onClick={() => navigate(`/liga/${league.id}`)}>Acompanhar liga <ArrowRight size={17} /></button>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="product-leagues__empty">
                <span><Trophy size={28} /></span>
                <div><h3>As próximas ligas aparecerão aqui.</h3><p>Quando um gerenciador publicar uma competição, ela ficará disponível nesta vitrine.</p></div>
              </div>
            )}
          </div>
        </section>

        <section className="product-cta">
          <div className="product-container product-cta__inner">
            <div><span className="product-eyebrow">BORA PRO JOGO?</span><h2>Sua liga merece uma gestão à altura.</h2><p>Entre com sua conta Google e comece a organizar o futebol da sua comunidade.</p></div>
            <Button icon={ArrowRight} onClick={() => navigate(managementPath)}>{currentUser ? 'Abrir meu painel' : 'Entrar no BABA MANAGER'}</Button>
          </div>
        </section>
      </main>

      <footer className="product-footer">
        <div className="product-container">
          <Logo />
          <p>Gestão completa para o futebol amador.</p>
          <div><a href="#como-funciona">Como funciona</a><a href="#ligas">Ligas públicas</a><a href="/login">Entrar</a></div>
          <small>© {new Date().getFullYear()} BABA MANAGER</small>
        </div>
      </footer>
    </div>
  );
}
