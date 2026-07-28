import {
  ArrowLeft,
  CalendarDays,
  ChevronDown,
  ChevronUp,
  Clock3,
  Copy,
  ExternalLink,
  Globe2,
  MapPin,
  Share2,
  ShieldAlert,
  Trophy,
  UsersRound,
  Volleyball,
  RectangleVertical,
  Footprints,
} from 'lucide-react';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Avatar, Badge, Button, EmptyState, Logo, TeamMark } from '../components/UI';
import { useApp } from '../context/AppContext';
import { db } from '../lib/firebase';
import {
  buildPublicLeagueSnapshot,
  loadPublicLeague,
  loadPublicLeagueList,
} from '../lib/publicLeague';
import {
  calculateStandings,
  formatLongDate,
  getPlayerStats,
  playerDisplayName,
} from '../lib/utils';
import { useNavigate } from '../lib/router';
import type {
  MatchEvent,
  PublicLeagueSnapshot,
  PublicMatch,
} from '../types';

interface PublicLeagueDetail {
  league: PublicLeagueSnapshot;
  matches: PublicMatch[];
}

function statusLabel(status: PublicMatch['status']) {
  if (status === 'finished') return 'Finalizada';
  if (status === 'live') return 'Em andamento';
  return 'Agendada';
}

function eventLabel(event: MatchEvent) {
  if (event.type === 'goal') return event.ownGoal ? 'Gol contra' : 'Gol';
  if (event.type === 'assist') return 'Assistência';
  if (event.type === 'yellow') return 'Cartão amarelo';
  return 'Cartão vermelho';
}

export function PublicLeagues({ leagueId }: { leagueId?: string }) {
  const { data, isDemo } = useApp();
  const navigate = useNavigate();
  const [leagues, setLeagues] = useState<PublicLeagueSnapshot[]>([]);
  const [detail, setDetail] = useState<PublicLeagueDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');

    const load = async () => {
      try {
        if (isDemo) {
          const publicLeagues = data.leagues
            .filter((league) => league.isPublic)
            .map((league) => buildPublicLeagueSnapshot(data, league));
          if (!active) return;
          if (leagueId) {
            const publication = publicLeagues.find((item) => item.snapshot.id === leagueId);
            setDetail(publication ? { league: publication.snapshot, matches: publication.matches } : null);
          } else {
            setLeagues(publicLeagues.map((item) => item.snapshot));
          }
          return;
        }
        if (!db) throw new Error('A área pública ainda não foi configurada.');
        if (leagueId) {
          const publication = await loadPublicLeague(db, leagueId);
          if (active) setDetail(publication);
        } else {
          const publications = await loadPublicLeagueList(db);
          if (active) setLeagues(publications);
        }
      } catch (loadError) {
        console.error(loadError);
        if (active) setError('Não foi possível carregar as ligas públicas agora.');
      } finally {
        if (active) setLoading(false);
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, [data, isDemo, leagueId]);

  useEffect(() => {
    document.title = detail
      ? `${detail.league.name} · BABA MANAGER`
      : 'Ligas públicas · BABA MANAGER';
    return () => {
      document.title = 'BABA MANAGER';
    };
  }, [detail]);

  if (loading) {
    return <div className="public-loading"><Logo /><span /><p>Carregando o campeonato...</p></div>;
  }

  if (leagueId) {
    return (
      <PublicLeagueDetailPage
        detail={detail}
        error={error}
        onBack={() => navigate('/ligas-publicas')}
      />
    );
  }

  return (
    <PublicLeagueListPage
      leagues={leagues}
      error={error}
      onOpen={(id) => navigate(`/liga/${id}`)}
    />
  );
}

function PublicHeader({ back }: { back?: () => void }) {
  return (
    <header className="public-header">
      <div className="public-header__inner">
        {back ? (
          <button className="public-back" type="button" onClick={back}><ArrowLeft size={18} /> Todas as ligas</button>
        ) : <Logo />}
        <div className="public-header__brand">{back && <Logo />}</div>
        <a className="public-admin-link" href="/login">Entrar e gerenciar <ExternalLink size={15} /></a>
      </div>
    </header>
  );
}

function PublicLeagueListPage({
  leagues,
  error,
  onOpen,
}: {
  leagues: PublicLeagueSnapshot[];
  error: string;
  onOpen: (id: string) => void;
}) {
  return (
    <div className="public-page">
      <PublicHeader />
      <main className="public-main">
        <section className="public-list-hero">
          <span><Globe2 size={17} /> BABA MANAGER PÚBLICO</span>
          <h1>Acompanhe as ligas<br /><em>fora das quatro linhas.</em></h1>
          <p>Classificações, resultados, súmulas e rankings compartilhados pelas organizações.</p>
        </section>
        {error ? (
          <EmptyState title="Falha ao carregar" description={error} />
        ) : leagues.length ? (
          <section className="public-league-list">
            {leagues.map((league) => (
              <article className="public-league-card" key={league.id}>
                <div className="public-league-card__top">
                  {league.imageUrl
                    ? <img src={league.imageUrl} alt={`Imagem da liga ${league.name}`} />
                    : <span><Trophy size={22} /></span>}
                  <Badge tone={league.status === 'active' ? 'success' : 'neutral'} dot>
                    {league.status === 'active' ? 'Em andamento' : 'Encerrada'}
                  </Badge>
                </div>
                <small>{league.organizationName}</small>
                <h2>{league.name}</h2>
                <p>Temporada {league.season}</p>
                <div className="public-league-card__metrics">
                  <span><Trophy size={20} /><b>{league.teamCount}</b><small>equipes</small></span>
                  <span><CalendarDays size={20} /><b>{league.finishedMatchCount}</b><small>jogos</small></span>
                  <span><UsersRound size={20} /><b>{league.playerCount}</b><small>jogadores</small></span>
                </div>
                <Button icon={ExternalLink} onClick={() => onOpen(league.id)}>Ver página da liga</Button>
              </article>
            ))}
          </section>
        ) : (
          <EmptyState title="Nenhuma liga pública" description="As ligas aparecerão aqui quando seus gerenciadores ativarem o compartilhamento." />
        )}
      </main>
      <PublicFooter />
    </div>
  );
}

function PublicLeagueDetailPage({
  detail,
  error,
  onBack,
}: {
  detail: PublicLeagueDetail | null;
  error: string;
  onBack: () => void;
}) {
  const [expandedMatch, setExpandedMatch] = useState<string | null>(null);
  const [shared, setShared] = useState(false);
  const league = detail?.league;
  const matches = useMemo(
    () => [...(detail?.matches || [])].sort((a, b) => +new Date(b.startsAt) - +new Date(a.startsAt)),
    [detail?.matches],
  );
  const standings = useMemo(
    () => league ? calculateStandings(league, matches) : [],
    [league, matches],
  );
  const stats = useMemo(
    () => league ? getPlayerStats(league.players, matches) : [],
    [league, matches],
  );
  const scorers = useMemo(
    () => [...stats].filter((player) => player.goals > 0).sort((a, b) => b.goals - a.goals || b.assists - a.assists),
    [stats],
  );
  const assists = useMemo(
    () => [...stats].filter((player) => player.assists > 0).sort((a, b) => b.assists - a.assists || b.goals - a.goals),
    [stats],
  );
  const discipline = useMemo(
    () => [...stats].filter((player) => player.yellow > 0 || player.red > 0).sort((a, b) => b.red - a.red || b.yellow - a.yellow),
    [stats],
  );

  const share = async () => {
    if (!league) return;
    const shareData = {
      title: `${league.name} · BABA MANAGER`,
      text: `Acompanhe a classificação e os resultados da ${league.name}.`,
      url: window.location.href,
    };
    try {
      if (navigator.share) await navigator.share(shareData);
      else await navigator.clipboard.writeText(window.location.href);
      setShared(true);
      window.setTimeout(() => setShared(false), 2500);
    } catch {
      setShared(false);
    }
  };

  if (error || !league) {
    return (
      <div className="public-page">
        <PublicHeader back={onBack} />
        <main className="public-main public-main--empty">
          <EmptyState
            title="Liga não encontrada"
            description={error || 'Esta liga não existe, não está publicada ou o link foi desativado.'}
            action={<Button onClick={onBack}>Ver ligas públicas</Button>}
          />
        </main>
        <PublicFooter />
      </div>
    );
  }

  return (
    <div className="public-page">
      <PublicHeader back={onBack} />
      <main className="public-main">
        <section className="public-league-hero">
          {league.imageUrl && <img className="public-league-hero__image" src={league.imageUrl} alt={`Imagem da liga ${league.name}`} />}
          <div className="public-league-hero__content">
            <span className="eyebrow"><Trophy size={15} /> TEMPORADA {league.season}</span>
            <small>{league.organizationName}</small>
            <h1>{league.name}</h1>
            <p>{league.teamCount} equipes · {league.finishedMatchCount} partidas realizadas · {league.playerCount} jogadores</p>
          </div>
          <div className="public-league-hero__actions">
            <Badge tone={league.status === 'active' ? 'success' : 'neutral'} dot>
              {league.status === 'active' ? 'Liga em andamento' : 'Liga encerrada'}
            </Badge>
            <Button variant="secondary" icon={shared ? Copy : Share2} onClick={share}>{shared ? 'Link copiado' : 'Compartilhar liga'}</Button>
          </div>
        </section>

        <section className="public-section">
          <div className="public-section__header"><div><span>CLASSIFICAÇÃO</span><h2>Tabela da liga</h2><p>Somente partidas finalizadas geram pontos.</p></div><Badge tone="lime">3 pts por vitória</Badge></div>
          <div className="panel public-standings table-scroll">
            <div className="table-head"><span>#</span><span>Equipe</span><span>J</span><span>V</span><span>E</span><span>D</span><span>GP</span><span>GC</span><span>SG</span><span>PTS</span></div>
            {standings.map((entry, index) => {
              const team = league.teams.find((item) => item.id === entry.teamId);
              if (!team) return null;
              const balance = entry.goalsFor - entry.goalsAgainst;
              return (
                <div className="table-row" key={entry.teamId}>
                  <strong className={index < 2 ? 'qualified' : ''}>{index + 1}</strong>
                  <div className="team-cell"><TeamMark {...team} size="sm" /><strong>{team.name}</strong></div>
                  <span>{entry.played}</span><span>{entry.wins}</span><span>{entry.draws}</span><span>{entry.losses}</span>
                  <span>{entry.goalsFor}</span><span>{entry.goalsAgainst}</span><span>{balance > 0 ? '+' : ''}{balance}</span><strong>{entry.points}</strong>
                </div>
              );
            })}
          </div>
        </section>

        <section className="public-section">
          <div className="public-section__header"><div><span>DESTAQUES</span><h2>Rankings individuais</h2><p>Estatísticas dos eventos registrados nas súmulas finalizadas.</p></div></div>
          <div className="public-ranking-grid">
            <RankingCard title="Artilharia" subtitle="Gols marcados" icon={<Volleyball size={20} />} players={scorers} metric="goals" league={league} />
            <RankingCard title="Assistências" subtitle="Passes para gol" icon={<Footprints size={20} />} players={assists} metric="assists" league={league} />
            <DisciplineCard players={discipline} league={league} />
          </div>
        </section>

        <section className="public-section">
          <div className="public-section__header"><div><span>JOGOS</span><h2>Partidas e histórico</h2><p>Abra uma partida para consultar todos os eventos da súmula.</p></div><Badge tone="neutral">{matches.length} partidas</Badge></div>
          <div className="public-match-list">
            {matches.length ? matches.map((match) => {
              const home = league.teams.find((team) => team.id === match.homeTeamId);
              const away = league.teams.find((team) => team.id === match.awayTeamId);
              const expanded = expandedMatch === match.id;
              if (!home || !away) return null;
              return (
                <article className={`public-match ${expanded ? 'public-match--expanded' : ''}`} key={match.id}>
                  <div className="public-match__summary">
                    <div className="public-match__meta">
                      <Badge tone={match.status === 'finished' ? 'neutral' : match.status === 'live' ? 'danger' : 'lime'} dot>{statusLabel(match.status)}</Badge>
                      <span><Clock3 size={14} /> {formatLongDate(match.startsAt)}</span>
                      {match.venueName && <span><MapPin size={14} /> {match.venueName}</span>}
                    </div>
                    <div className="public-match__score">
                      <div><TeamMark {...home} size="md" /><strong>{home.name}</strong></div>
                      <b>{match.status === 'scheduled' ? <i>VS</i> : <>{match.homeScore || 0}<i>×</i>{match.awayScore || 0}</>}</b>
                      <div><TeamMark {...away} size="md" /><strong>{away.name}</strong></div>
                    </div>
                    <button type="button" onClick={() => setExpandedMatch(expanded ? null : match.id)}>
                      {expanded ? 'Ocultar súmula' : 'Ver súmula'} {expanded ? <ChevronUp size={17} /> : <ChevronDown size={17} />}
                    </button>
                  </div>
                  {expanded && (
                    <MatchEvents match={match} league={league} />
                  )}
                </article>
              );
            }) : <EmptyState title="Nenhuma partida" description="Os jogos desta liga aparecerão aqui quando forem agendados." />}
          </div>
        </section>

        <section className="public-section">
          <div className="public-section__header"><div><span>PARTICIPANTES</span><h2>Equipes e elencos</h2><p>Jogadores vinculados às equipes desta competição.</p></div></div>
          <div className="public-team-grid">
            {league.teams.map((team) => {
              const players = league.players.filter((player) => player.teamId === team.id);
              return (
                <article className="public-team-card" key={team.id}>
                  <header><TeamMark {...team} size="md" /><div><strong>{team.name}</strong><small>{players.length} jogador{players.length === 1 ? '' : 'es'}</small></div></header>
                  <div>
                    {players.map((player) => (
                      <span key={player.id}><Avatar name={player.name} src={player.photoUrl} size="sm" tone={team.color} /><b>{playerDisplayName(player)}</b><small>{player.shirtNumber ? `#${player.shirtNumber}` : player.positions[0]}</small></span>
                    ))}
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}

function RankingCard({
  title,
  subtitle,
  icon,
  players,
  metric,
  league,
}: {
  title: string;
  subtitle: string;
  icon: ReactNode;
  players: ReturnType<typeof getPlayerStats>;
  metric: 'goals' | 'assists';
  league: PublicLeagueSnapshot;
}) {
  return (
    <section className="panel public-ranking-card">
      <header><div><h3>{title}</h3><p>{subtitle}</p></div><span>{icon}</span></header>
      <div>
        {players.length ? players.map((player, index) => {
          const team = league.teams.find((item) => item.id === player.teamId);
          return (
            <div className="public-ranking-row" key={player.id}>
              <b>{index + 1}</b>
              <Avatar name={player.name} src={player.photoUrl} size="sm" tone={team?.color} />
              <span>
                <strong>{playerDisplayName(player)}</strong>
                <small>{team?.shortName} · {metric === 'goals'
                  ? `${player.assists} assist.`
                  : `${player.goals} ${player.goals === 1 ? 'gol' : 'gols'}`}</small>
              </span>
              <em>{player[metric]}</em>
            </div>
          );
        }) : <EmptyState title={`Sem ${metric === 'goals' ? 'gols' : 'assistências'}`} description="Ainda não há eventos contabilizados." />}
      </div>
    </section>
  );
}

function DisciplineCard({
  players,
  league,
}: {
  players: ReturnType<typeof getPlayerStats>;
  league: PublicLeagueSnapshot;
}) {
  return (
    <section className="panel public-ranking-card">
      <header><div><h3>Disciplina</h3><p>Cartões recebidos</p></div><span><ShieldAlert size={20} /></span></header>
      <div>
        {players.length ? players.map((player, index) => {
          const team = league.teams.find((item) => item.id === player.teamId);
          return (
            <div className="public-ranking-row public-ranking-row--discipline" key={player.id}>
              <b>{index + 1}</b>
              <Avatar name={player.name} src={player.photoUrl} size="sm" tone={team?.color} />
              <span><strong>{playerDisplayName(player)}</strong><small>{team?.shortName}</small></span>
              <div>{player.yellow > 0 && <Badge tone="warning">{player.yellow} A</Badge>}{player.red > 0 && <Badge tone="danger">{player.red} V</Badge>}</div>
            </div>
          );
        }) : <EmptyState title="Sem cartões" description="Nenhum cartão registrado nesta liga." />}
      </div>
    </section>
  );
}

function MatchEvents({
  match,
  league,
}: {
  match: PublicMatch;
  league: PublicLeagueSnapshot;
}) {
  const events = [...match.events].sort((a, b) => a.minute - b.minute);
  return (
    <div className="public-match__events">
      <h3>Súmula da partida</h3>
      {events.length ? events.map((event) => {
        const player = league.players.find((item) => item.id === event.playerId);
        const assist = league.players.find((item) => item.id === event.assistPlayerId);
        const team = league.teams.find((item) => item.id === event.teamId);
        return (
          <div className="public-event" key={event.id}>
            <strong>{event.minute ? `${event.minute}'` : '—'}</strong>
            <span className={`event-icon event-icon--${event.type}`}>{event.type === 'goal' ? <Volleyball size={20} color='white' /> : event.type === 'assist' ? <Trophy size={20} color='white' /> : event.type === 'yellow' ? <RectangleVertical size={20} color='yellow' /> : <RectangleVertical size={20} color='red'  />}</span>
            <div>
              <p><b>{eventLabel(event)}</b> · {player ? playerDisplayName(player) : event.type === 'goal' ? 'Autor não informado' : 'Jogador não informado'}</p>
              <small>{assist ? `Assistência de ${playerDisplayName(assist)} · ` : ''}{event.type === 'goal' ? `Gol para ${team?.shortName || 'equipe'}` : team?.name}</small>
            </div>
          </div>
        );
      }) : <EmptyState title="Súmula sem eventos" description={match.status === 'scheduled' ? 'A partida ainda não começou.' : 'Nenhum evento foi registrado.'} />}
      {match.notes && <p className="public-match__notes"><b>Observações:</b> {match.notes}</p>}
    </div>
  );
}

function PublicFooter() {
  return (
    <footer className="public-footer">
      <Logo />
      <p>Futebol amador organizado, transparente e fácil de compartilhar.</p>
      <a href="/login">Login</a>
      <a href="/">Página Inicial</a>
    </footer>
  );
}
