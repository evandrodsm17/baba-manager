import {
  Award,
  CalendarCheck2,
  Handshake,
  ShieldAlert,
  Target,
  ThumbsDown,
  ThumbsUp,
} from 'lucide-react';
import { PiSoccerBallFill } from 'react-icons/pi';
import { Avatar, Badge, Button, EmptyState, PageHeader, StatCard, TeamMark } from '../components/UI';
import { useApp } from '../context/AppContext';
import {
  formatLongDate,
  getMatchTeams,
  playerDisplayName,
  playerParticipatedInMatch,
} from '../lib/utils';
import { useNavigate } from '../lib/router';

export function Performance() {
  const { data, currentUser } = useApp();
  const navigate = useNavigate();
  const player = data.players.find((item) => item.id === currentUser?.playerId);

  if (!player) {
    return (
      <>
        <PageHeader eyebrow="MEU DESEMPENHO" title="Histórico do jogador" description="Acompanhe seus números e partidas." />
        <EmptyState title="Perfil não encontrado" description="Seu acesso ainda não está associado a um jogador desta organização." />
      </>
    );
  }

  const matches = data.matches
    .filter((match) => match.status === 'finished' && playerParticipatedInMatch(match, player, data.checkins))
    .sort((a, b) => +new Date(b.startsAt) - +new Date(a.startsAt));
  const events = matches.flatMap((match) => match.events);
  const goals = events.filter((event) => event.type === 'goal' && !event.ownGoal && event.playerId === player.id).length;
  const assists = events.filter((event) => (
    (event.type === 'goal' && event.assistPlayerId === player.id)
    || (event.type === 'assist' && event.playerId === player.id)
  )).length;
  const yellow = events.filter((event) => event.type === 'yellow' && event.playerId === player.id).length;
  const red = events.filter((event) => event.type === 'red' && event.playerId === player.id).length;
  const highlights = matches.flatMap((match) => match.highlights || []).filter((highlight) => highlight.playerId === player.id);
  const positiveHighlights = highlights.filter((item) => item.tone === 'positive').length;
  const negativeHighlights = highlights.filter((item) => item.tone === 'negative').length;
  const currentTeam = data.teams.find((team) => team.id === player.teamId);

  return (
    <>
      <PageHeader
        eyebrow="MEU DESEMPENHO"
        title={`Os números de ${playerDisplayName(player)}`}
        description="Histórico consolidado das partidas em que você participou."
      />

      <div className="stat-grid performance-stat-grid">
        <StatCard label="Partidas" value={matches.length} hint="participações registradas" icon={CalendarCheck2} />
        <StatCard label="Gols" value={goals} hint="gols contra não contam" icon={Target} tone="orange" />
        <StatCard label="Assistências" value={assists} hint="passes para gol" icon={Handshake} tone="blue" />
        <StatCard label="Cartões" value={yellow + red} hint={`${yellow} amarelos · ${red} vermelhos`} icon={ShieldAlert} tone="purple" />
      </div>

      <section className="panel performance-summary">
        <div>
          <Avatar name={player.name} src={player.photoUrl} tone={currentTeam?.color} />
          <span>
            <strong>{player.name}</strong>
            <small>{player.positions.join(' · ')} · {currentTeam?.name || player.teamName || 'Atleta sem equipe fixa'}</small>
          </span>
        </div>
        <div className="performance-summary__highlights">
          <Badge tone="success"><ThumbsUp size={14} />{positiveHighlights} destaque{positiveHighlights === 1 ? '' : 's'} positivo{positiveHighlights === 1 ? '' : 's'}</Badge>
          <Badge tone="danger"><ThumbsDown size={14} />{negativeHighlights} destaque{negativeHighlights === 1 ? '' : 's'} negativo{negativeHighlights === 1 ? '' : 's'}</Badge>
        </div>
      </section>

      <section className="panel performance-history">
        <div className="section-header">
          <div><h2>Histórico de partidas</h2><p>Seus números jogo a jogo</p></div>
          <Badge tone="neutral">{matches.length} partida{matches.length === 1 ? '' : 's'}</Badge>
        </div>
        {matches.length ? (
          <div className="performance-match-list">
            {matches.map((match) => {
              const [home, away] = getMatchTeams(match, data.teams);
              if (!home || !away) return null;
              const matchEvents = match.events;
              const matchGoals = matchEvents.filter((event) => event.type === 'goal' && !event.ownGoal && event.playerId === player.id).length;
              const matchAssists = matchEvents.filter((event) => (
                (event.type === 'goal' && event.assistPlayerId === player.id)
                || (event.type === 'assist' && event.playerId === player.id)
              )).length;
              const matchYellow = matchEvents.filter((event) => event.type === 'yellow' && event.playerId === player.id).length;
              const matchRed = matchEvents.filter((event) => event.type === 'red' && event.playerId === player.id).length;
              const matchHighlights = (match.highlights || []).filter((highlight) => highlight.playerId === player.id);
              return (
                <article className="performance-match" key={match.id}>
                  <button type="button" onClick={() => navigate(`/partidas/${match.id}`)}>
                    <span className="performance-match__date">{formatLongDate(match.startsAt)}</span>
                    <div className="performance-match__score">
                      <span><TeamMark {...home} size="sm" /><strong>{home.shortName}</strong></span>
                      <b>{match.homeScore || 0}<i>×</i>{match.awayScore || 0}</b>
                      <span><TeamMark {...away} size="sm" /><strong>{away.shortName}</strong></span>
                    </div>
                    <div className="performance-match__numbers">
                      <Badge tone={matchGoals ? 'lime' : 'neutral'}><PiSoccerBallFill />{matchGoals} gol{matchGoals === 1 ? '' : 's'}</Badge>
                      <Badge tone={matchAssists ? 'blue' : 'neutral'}><Handshake size={13} />{matchAssists} assistência{matchAssists === 1 ? '' : 's'}</Badge>
                      {matchYellow > 0 && <Badge tone="warning">{matchYellow} amarelo{matchYellow === 1 ? '' : 's'}</Badge>}
                      {matchRed > 0 && <Badge tone="danger">{matchRed} vermelho{matchRed === 1 ? '' : 's'}</Badge>}
                    </div>
                  </button>
                  {matchHighlights.map((highlight) => (
                    <div className={`performance-match__highlight performance-match__highlight--${highlight.tone}`} key={highlight.id}>
                      {highlight.tone === 'positive' ? <ThumbsUp size={17} /> : <ThumbsDown size={17} />}
                      <p><strong>{highlight.tone === 'positive' ? 'Destaque positivo' : 'Destaque negativo'}</strong><span>{highlight.reason}</span></p>
                    </div>
                  ))}
                </article>
              );
            })}
          </div>
        ) : (
          <EmptyState
            title="Seu histórico ainda está vazio"
            description="As partidas finalizadas em que você participou aparecerão aqui."
            action={<Button icon={Award} onClick={() => navigate('/partidas')}>Ver partidas</Button>}
          />
        )}
      </section>
    </>
  );
}
