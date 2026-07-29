import {
  Activity,
  Award,
  BellRing,
  CalendarDays,
  CheckCircle2,
  Plus,
  ShieldCheck,
  Trophy,
  UserCog,
  UserCheck,
  UsersRound,
} from 'lucide-react';
import { MatchCard } from '../components/MatchCard';
import { Avatar, Badge, Button, PageHeader, SectionHeader, StatCard, TeamMark } from '../components/UI';
import { useApp } from '../context/AppContext';
import { buildConfirmationQueue, confirmationDeadlinePassed, formatLongDate, formatMatchDate, getMatchTeams, getPlayerStats, matchIncludesPlayer, playerDisplayName, timeAgo } from '../lib/utils';
import { useNavigate } from '../lib/router';

export function Dashboard() {
  const { currentUser } = useApp();
  if (currentUser?.role === 'master') return <MasterDashboard />;
  if (currentUser?.role === 'player') return <PlayerDashboard />;
  return <ManagerDashboard />;
}

function ManagerDashboard() {
  const { data, currentUser } = useApp();
  const navigate = useNavigate();
  const orgId = currentUser?.organizationId;
  const teams = data.teams.filter((team) => team.organizationId === orgId);
  const players = data.players.filter((player) => player.organizationId === orgId);
  const matches = data.matches.filter((match) => match.organizationId === orgId);
  const upcoming = matches.filter((match) => match.status === 'scheduled').sort((a, b) => +new Date(a.startsAt) - +new Date(b.startsAt));
  const recent = matches.filter((match) => match.status === 'finished').sort((a, b) => +new Date(b.startsAt) - +new Date(a.startsAt));
  const pendingConfirmations = upcoming
    .filter((match) => match.requiresConfirmation)
    .reduce((total, match) => total + buildConfirmationQueue(match, players, data.matchConfirmations).pendingPlayerIds.length, 0);
  const ranking = getPlayerStats(players, matches).sort((a, b) => b.goals - a.goals || b.assists - a.assists).slice(0, 4);
  const activeLeague = data.leagues.find((league) => league.organizationId === orgId && league.status === 'active');

  return (
    <>
      <PageHeader
        eyebrow="PAINEL DO GERENCIADOR"
        title={`Boa tarde, ${currentUser?.name.split(' ')[0]}!`}
        description="Aqui está o resumo do que está acontecendo na sua organização."
        action={<Button icon={Plus} onClick={() => navigate('/partidas?nova=1')}>Nova partida</Button>}
      />

      <div className="stat-grid">
        <StatCard label="Partidas" value={matches.length} hint={`${upcoming.length} agendadas · ${pendingConfirmations} sem resposta`} icon={CalendarDays} />
        <StatCard label="Jogadores" value={players.length} hint={`${players.filter((player) => player.status === 'active').length} ativos`} icon={UsersRound} tone="blue" />
        <StatCard label="Equipes" value={teams.length} hint="na organização" icon={ShieldCheck} tone="purple" />
        <StatCard label="Liga ativa" value={activeLeague ? '01' : '—'} hint={activeLeague?.name || 'Nenhuma no momento'} icon={Trophy} tone="orange" />
      </div>

      <div className="dashboard-grid">
        <section className="panel dashboard-grid__main">
          <SectionHeader title="Próximas partidas" description="Agenda dos próximos confrontos" linkLabel="Ver agenda" onLink={() => navigate('/partidas')} />
          <div className="match-list">
            {upcoming.slice(0, 2).map((match) => (
              <MatchCard key={match.id} match={match} teams={teams} venues={data.venues} compact />
            ))}
          </div>
        </section>

        <section className="panel dashboard-grid__side">
          <SectionHeader title="Destaques da liga" description="Gols no contexto competitivo" linkLabel="Ranking" onLink={() => navigate('/ligas')} />
          <div className="ranking-list">
            {ranking.map((player, index) => {
              const team = teams.find((item) => item.id === player.teamId);
              return (
                <div className="ranking-item" key={player.id}>
                  <span className={`ranking-item__position ${index === 0 ? 'ranking-item__position--first' : ''}`}>{index + 1}</span>
                  <Avatar name={player.name} src={player.photoUrl} size="sm" tone={team?.color} />
                  <div className="ranking-item__name"><strong>{playerDisplayName(player)}</strong><small>{team?.shortName}</small></div>
                  <div className="ranking-item__metric"><strong>{player.goals}</strong><small>GOLS</small></div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="panel dashboard-grid__main">
          <SectionHeader title="Resultados recentes" description="Últimas partidas finalizadas" />
          <div className="results-list">
            {recent.slice(0, 3).map((match) => {
              const [home, away] = getMatchTeams(match, teams);
              if (!home || !away) return null;
              return (
                <button key={match.id} className="result-row" type="button" onClick={() => navigate(`/partidas/${match.id}`)}>
                  <span className="result-row__date">{formatMatchDate(match.startsAt)}</span>
                  <div><TeamMark {...home} size="sm" /><strong>{home.shortName}</strong></div>
                  <b>{match.homeScore} <i>×</i> {match.awayScore}</b>
                  <div><strong>{away.shortName}</strong><TeamMark {...away} size="sm" /></div>
                  <span className="result-row__league">{data.leagues.find((league) => league.id === match.leagueId)?.name || 'Amistoso'}</span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="panel dashboard-grid__side">
          <SectionHeader title="Atividade recente" description="Alterações da sua equipe" />
          <div className="activity-list">
            {data.auditLogs.filter((log) => !log.organizationId || log.organizationId === orgId).slice(0, 4).map((log) => (
              <div className="activity-row" key={log.id}>
                <span><Activity size={15} /></span>
                <div><p><strong>{log.actorName}</strong> {log.action}</p><small>{timeAgo(log.createdAt)}</small></div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}

function PlayerDashboard() {
  const { data, currentUser } = useApp();
  const navigate = useNavigate();
  const player = data.players.find((item) => item.id === currentUser?.playerId);
  const team = data.teams.find((item) => item.id === player?.teamId);
  const relevantMatches = data.matches
    .filter((match) => (match.status === 'scheduled' || match.status === 'live') && matchIncludesPlayer(match, player))
    .sort((a, b) => +new Date(a.startsAt) - +new Date(b.startsAt));
  const invitations = relevantMatches.filter((match) => {
    if (!player || !match.requiresConfirmation || match.status !== 'scheduled' || confirmationDeadlinePassed(match)) return false;
    return buildConfirmationQueue(match, data.players, data.matchConfirmations).pendingPlayerIds.includes(player.id);
  });
  const invitationIds = new Set(invitations.map((match) => match.id));
  const upcoming = relevantMatches.filter((match) => {
    if (!player || invitationIds.has(match.id)) return false;
    const confirmation = buildConfirmationQueue(match, data.players, data.matchConfirmations).confirmationByPlayerId.get(player.id);
    return !match.requiresConfirmation || confirmation?.status === 'going' || confirmation?.status === 'maybe';
  });
  const firstInvitation = invitations[0];
  const stats = getPlayerStats(data.players, data.matches).find((item) => item.id === player?.id);

  return (
    <>
      <PageHeader
        eyebrow="ÁREA DO JOGADOR"
        title={`Fala, ${playerDisplayName(player)}!`}
        description="Responda primeiro às convocações e acompanhe sua agenda."
        action={firstInvitation
          ? <Button icon={UserCheck} onClick={() => navigate(`/check-in?matchId=${firstInvitation.id}`)}>Responder convite</Button>
          : <Button icon={Award} variant="secondary" onClick={() => navigate('/meu-desempenho')}>Meu desempenho</Button>}
      />

      {invitations.length > 0 && (
        <section className="panel player-priority-section player-priority-section--invitations">
          <SectionHeader title="Convites aguardando sua resposta" description="Sua prioridade agora: confirme se poderá participar" />
          <div className="player-invitation-list">
            {invitations.slice(0, 3).map((match) => (
              <article className="player-invitation" key={match.id}>
                <span className="player-invitation__icon"><BellRing size={22} /></span>
                <div>
                  <strong>Você foi convidado para uma partida</strong>
                  <p>{formatLongDate(match.startsAt)} · responda antes do encerramento da convocação.</p>
                </div>
                <Button icon={UserCheck} onClick={() => navigate(`/check-in?matchId=${match.id}`)}>Responder</Button>
              </article>
            ))}
          </div>
        </section>
      )}

      <section className="panel player-priority-section">
        <SectionHeader title="Próximas partidas" description="Partidas para as quais você foi convidado" linkLabel="Ver todas" onLink={() => navigate('/partidas')} />
        {upcoming.length ? (
          <div className="match-list">
            {upcoming.slice(0, 3).map((match) => <MatchCard key={match.id} match={match} teams={data.teams} venues={data.venues} compact />)}
          </div>
        ) : (
          <div className="player-agenda-empty"><CalendarDays size={24} /><p><strong>Nenhuma presença confirmada</strong><span>Responda aos convites acima ou aguarde uma nova convocação.</span></p></div>
        )}
      </section>

      <div className="stat-grid stat-grid--three">
        <StatCard label="Gols na liga" value={stats?.goals || 0} hint="na temporada" icon={Trophy} />
        <StatCard label="Assistências" value={stats?.assists || 0} hint="passes para gol" icon={UsersRound} tone="blue" />
        <StatCard label="Presenças" value={data.checkins.filter((checkin) => checkin.playerId === player?.id && checkin.validated).length} hint="check-ins validados" icon={CheckCircle2} tone="purple" />
      </div>
      <section className="panel">
        <SectionHeader title="Seu perfil esportivo" description="Vínculo atual e situação disciplinar" linkLabel="Meu desempenho" onLink={() => navigate('/meu-desempenho')} />
        <div className="team-summary">
          {team && <TeamMark {...team} size="lg" />}
          <div><h3>{team?.name || 'Sem equipe vinculada'}</h3><p>{player?.positions.join(' · ')}</p></div>
          <Badge tone={player?.status === 'suspended' ? 'danger' : 'success'} dot>
            {player?.status === 'suspended' ? 'Suspenso' : 'Liberado para jogar'}
          </Badge>
        </div>
      </section>
    </>
  );
}

function MasterDashboard() {
  const { data, currentUser } = useApp();
  const navigate = useNavigate();
  const activeManagers = data.managerInvites.filter((invite) => invite.status === 'accepted');
  const pendingManagers = data.managerInvites.filter((invite) => invite.status === 'pending').length;
  const orgCount = data.organizations.filter((org) => org.active).length;
  const inactiveOrgCount = data.organizations.length - orgCount;
  const activePlayers = data.players.filter((player) => player.status === 'active').length;
  const now = new Date();
  const matchesThisMonth = data.matches.filter((match) => {
    const startsAt = new Date(match.startsAt);
    return startsAt.getFullYear() === now.getFullYear()
      && startsAt.getMonth() === now.getMonth();
  });
  const finishedThisMonth = matchesThisMonth.filter((match) => match.status === 'finished').length;
  const scheduledThisMonth = matchesThisMonth.filter((match) => match.status === 'scheduled').length;

  return (
    <>
      <PageHeader
        eyebrow="CONTROLE DA PLATAFORMA"
        title={`Visão geral, ${currentUser?.name.split(' ')[0]}`}
        description="Acompanhe organizações, gerenciadores e movimentações do ecossistema."
        action={<Button icon={UserCog} onClick={() => navigate('/gerenciadores?novo=1')}>Novo gerenciador</Button>}
      />
      <div className="stat-grid">
        <StatCard label="Organizações" value={orgCount} hint={`${inactiveOrgCount} inativas`} icon={ShieldCheck} />
        <StatCard label="Gerenciadores" value={activeManagers.length} hint={`${pendingManagers} convites pendentes`} icon={UserCog} tone="blue" />
        <StatCard label="Jogadores" value={data.players.length} hint={`${activePlayers} ativos`} icon={UsersRound} tone="purple" />
        <StatCard
          label="Partidas no mês"
          value={matchesThisMonth.length}
          hint={`${finishedThisMonth} finalizadas · ${scheduledThisMonth} agendadas`}
          icon={CalendarDays}
          tone="orange"
        />
      </div>
      <div className="master-grid">
        <section className="panel master-grid__organizations">
          <SectionHeader title="Organizações recentes" description="Saúde e movimentação dos ambientes" linkLabel="Ver gerenciadores" onLink={() => navigate('/gerenciadores')} />
          <div className="org-table table-scroll">
            <div className="table-head"><span>Organização</span><span>Responsável</span><span>Plano</span><span>Status</span><span>Último acesso</span></div>
            {data.organizations.map((org) => {
              const manager = data.managerInvites.find((item) => item.organizationId === org.id);
              return (
                <div className="table-row" key={org.id}>
                  <div className="org-name"><span><ShieldCheck size={18} /></span><strong>{org.name}</strong></div>
                  <span>{manager?.name || 'Aguardando'}</span>
                  <span><Badge tone={org.plan === 'pro' ? 'lime' : 'neutral'}>{org.plan.toUpperCase()}</Badge></span>
                  <span><Badge tone={org.active ? 'success' : 'danger'} dot>{org.active ? 'Ativa' : 'Inativa'}</Badge></span>
                  <span>{timeAgo(manager?.lastAccess)}</span>
                </div>
              );
            })}
          </div>
        </section>
        <section className="panel">
          <SectionHeader title="Atividade da plataforma" description="Ações mais recentes" linkLabel="Ver tudo" onLink={() => navigate('/atividades')} />
          <div className="activity-list activity-list--master">
            {data.auditLogs.slice(0, 5).map((log) => {
              const org = data.organizations.find((item) => item.id === log.organizationId);
              return (
                <div className="activity-row" key={log.id}>
                  <span><Activity size={15} /></span>
                  <div>
                    <p><strong>{log.actorName}</strong> {log.action}</p>
                    <small>{org?.name || 'Plataforma'} · {timeAgo(log.createdAt)}</small>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </>
  );
}
