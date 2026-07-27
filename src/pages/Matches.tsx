import {
  ArrowLeft,
  CalendarDays,
  Check,
  CheckCircle2,
  ClipboardCheck,
  MapPin,
  Plus,
  Radio,
  Send,
  ShieldAlert,
  Trophy,
  UsersRound,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { MatchCard } from '../components/MatchCard';
import { Avatar, Badge, Button, EmptyState, Modal, PageHeader, TeamMark } from '../components/UI';
import { createId, useApp } from '../context/AppContext';
import { formatLongDate, playerDisplayName } from '../lib/utils';
import { useNavigate, useParams, useSearchParams } from '../lib/router';
import type { EventType, Match, MatchEvent, StatSubmission } from '../types';

export function Matches() {
  const params = useParams();
  if (params.matchId) return <MatchDetails matchId={params.matchId} />;
  return <MatchesList />;
}

function MatchesList() {
  const { data, currentUser, saveEntity, notify } = useApp();
  const [searchParams] = useSearchParams();
  const [modalOpen, setModalOpen] = useState(false);
  const [status, setStatus] = useState<'all' | Match['status']>('all');
  const [homeTeamId, setHomeTeamId] = useState('');
  const [awayTeamId, setAwayTeamId] = useState('');
  const [scheduleError, setScheduleError] = useState('');
  const orgId = currentUser?.organizationId;
  const canManage = currentUser?.role === 'manager';
  const activePlayer = data.players.find((player) => player.id === currentUser?.playerId);
  const teams = data.teams.filter((team) => team.organizationId === orgId);
  const venues = data.venues.filter((venue) => venue.organizationId === orgId);
  const canSchedule = teams.length >= 2 && venues.length > 0;
  const matches = useMemo(() => data.matches
    .filter((match) => match.organizationId === orgId)
    .filter((match) => canManage || !activePlayer || match.homeTeamId === activePlayer.teamId || match.awayTeamId === activePlayer.teamId)
    .filter((match) => status === 'all' || match.status === status)
    .sort((a, b) => status === 'finished' ? +new Date(b.startsAt) - +new Date(a.startsAt) : +new Date(a.startsAt) - +new Date(b.startsAt)), [data.matches, orgId, status, canManage, activePlayer]);

  useEffect(() => {
    if (searchParams.get('nova') === '1' && canManage) setModalOpen(true);
  }, [searchParams, canManage]);

  const openSchedule = () => {
    setHomeTeamId('');
    setAwayTeamId('');
    setScheduleError('');
    setModalOpen(true);
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    if (teams.length < 2) {
      setScheduleError('Cadastre pelo menos duas equipes para criar um confronto.');
      return;
    }
    if (!venues.length) {
      setScheduleError('Cadastre um local antes de agendar a partida.');
      return;
    }
    if (homeTeamId === awayTeamId) {
      setScheduleError('Mandante e visitante precisam ser equipes diferentes.');
      return;
    }
    const venue = data.venues.find((item) => item.id === form.get('venueId'));
    const leagueId = String(form.get('leagueId') || '') || undefined;
    const entity: Match = {
      id: createId('match'),
      organizationId: orgId || '',
      leagueId,
      venueId: String(form.get('venueId')),
      homeTeamId,
      awayTeamId,
      startsAt: new Date(String(form.get('startsAt'))).toISOString(),
      status: 'scheduled',
      requiresGeolocation: form.get('requiresGeolocation') === 'on' || Boolean(venue?.requiresGeolocation),
      events: [],
      notes: String(form.get('notes') || '').trim() || undefined,
    };
    await saveEntity('matches', entity, 'criou uma partida');
    if (leagueId) {
      const league = data.leagues.find((item) => item.id === leagueId);
      if (league) {
        const teamIds = [...new Set([...league.teamIds, homeTeamId, awayTeamId])];
        if (teamIds.length !== league.teamIds.length) {
          await saveEntity('leagues', { ...league, teamIds });
        }
      }
    }
    notify('Partida agendada com sucesso.');
    setModalOpen(false);
  };

  return (
    <>
      <PageHeader
        eyebrow="CALENDÁRIO"
        title="Partidas"
        description={canManage ? 'Agende confrontos entre equipes diferentes, registre placares e todos os eventos do jogo.' : 'Acompanhe sua agenda e os resultados da competição.'}
        action={canManage ? <Button icon={Plus} onClick={openSchedule}>Nova partida</Button> : undefined}
      />
      <div className="toolbar toolbar--tabs">
        <div className="segmented">
          {[
            ['all', 'Todas'],
            ['scheduled', 'Agendadas'],
            ['live', 'Ao vivo'],
            ['finished', 'Finalizadas'],
          ].map(([value, label]) => <button key={value} type="button" onClick={() => setStatus(value as typeof status)} className={status === value ? 'active' : ''}>{label}</button>)}
        </div>
        <div className="toolbar__summary"><CalendarDays size={16} /><strong>{matches.length}</strong> partidas</div>
      </div>
      {matches.length ? (
        <div className="matches-grid">
          {matches.map((match) => <MatchCard key={match.id} match={match} teams={teams} venues={data.venues} />)}
        </div>
      ) : (
        <EmptyState title="Nenhuma partida nesta lista" description="Agende um novo confronto ou altere o filtro." action={canManage ? <Button icon={Plus} onClick={openSchedule}>Agendar partida</Button> : undefined} />
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Agendar partida" description="Defina o confronto, o campeonato e as regras de check-in." size="lg">
        <form className="form" onSubmit={submit}>
          <div className={`form-tip ${!canSchedule || scheduleError ? 'form-tip--warning' : ''}`}>
            <ShieldAlert size={18} />
            <p>
              <strong>
                {teams.length < 2
                  ? 'Falta cadastrar outra equipe'
                  : !venues.length
                    ? 'Falta cadastrar um local'
                    : scheduleError ? 'Confronto inválido' : 'Regra do confronto'}
              </strong>
              <span>
                {teams.length < 2
                  ? `Você possui ${teams.length} equipe cadastrada. Uma partida exige duas equipes diferentes.`
                  : !venues.length
                    ? 'Toda partida precisa estar associada a um campo ou quadra.'
                    : scheduleError || 'Uma equipe não pode enfrentar ela própria; escolha mandante e visitante diferentes.'}
              </span>
            </p>
          </div>
          <div className="versus-form">
            <label><span>Mandante</span><select name="homeTeamId" required value={homeTeamId} onChange={(event) => { setHomeTeamId(event.target.value); if (event.target.value === awayTeamId) setAwayTeamId(''); setScheduleError(''); }}><option value="">Selecione a equipe</option>{teams.map((team) => <option key={team.id} value={team.id} disabled={team.id === awayTeamId}>{team.name}</option>)}</select></label>
            <b>VS</b>
            <label><span>Visitante</span><select name="awayTeamId" required value={awayTeamId} onChange={(event) => { setAwayTeamId(event.target.value); setScheduleError(''); }}><option value="">Selecione outra equipe</option>{teams.map((team) => <option key={team.id} value={team.id} disabled={team.id === homeTeamId}>{team.name}</option>)}</select></label>
          </div>
          <div className="form-row form-row--2">
            <label><span>Data e horário</span><input name="startsAt" type="datetime-local" required /></label>
            <label><span>Local</span><select name="venueId" required defaultValue=""><option value="">Selecione o campo</option>{venues.map((venue) => <option key={venue.id} value={venue.id}>{venue.name}</option>)}</select></label>
          </div>
          <label><span>Liga ou competição <small>(opcional)</small></span><select name="leagueId" defaultValue=""><option value="">Amistoso — não contabiliza estatísticas de liga</option>{data.leagues.filter((league) => league.organizationId === orgId && league.status === 'active').map((league) => <option key={league.id} value={league.id}>{league.name} · {league.season}</option>)}</select></label>
          <label className="toggle-field"><input type="checkbox" name="requiresGeolocation" /><i /><span><strong>Exigir geolocalização no check-in</strong><small>O jogador deverá estar dentro do raio definido no local.</small></span></label>
          <label><span>Observações <small>(opcional)</small></span><textarea name="notes" rows={3} placeholder="Informações adicionais para os jogadores..." /></label>
          <div className="form-actions"><Button type="button" variant="ghost" onClick={() => setModalOpen(false)}>Cancelar</Button><Button type="submit" icon={CalendarDays} disabled={!canSchedule}>Agendar partida</Button></div>
        </form>
      </Modal>
    </>
  );
}

function MatchDetails({ matchId }: { matchId: string }) {
  const { data, currentUser, saveEntity, notify } = useApp();
  const navigate = useNavigate();
  const match = data.matches.find((item) => item.id === matchId);
  const [resultOpen, setResultOpen] = useState(false);
  const [eventOpen, setEventOpen] = useState(false);
  const [statsOpen, setStatsOpen] = useState(false);
  const [eventTeam, setEventTeam] = useState('');
  const canManage = currentUser?.role === 'manager';

  if (!match) return <EmptyState title="Partida não encontrada" description="Este confronto não existe ou você não possui acesso." action={<Button onClick={() => navigate('/partidas')}>Voltar</Button>} />;
  const home = data.teams.find((team) => team.id === match.homeTeamId);
  const away = data.teams.find((team) => team.id === match.awayTeamId);
  const venue = data.venues.find((item) => item.id === match.venueId);
  const league = data.leagues.find((item) => item.id === match.leagueId);
  const checkedIn = data.checkins.filter((checkin) => checkin.matchId === match.id && checkin.validated);
  const homePlayers = data.players
    .filter((player) => player.teamId === match.homeTeamId)
    .sort((a, b) => (a.shirtNumber || 999) - (b.shirtNumber || 999) || a.name.localeCompare(b.name));
  const awayPlayers = data.players
    .filter((player) => player.teamId === match.awayTeamId)
    .sort((a, b) => (a.shirtNumber || 999) - (b.shirtNumber || 999) || a.name.localeCompare(b.name));
  const activePlayer = data.players.find((player) => player.id === currentUser?.playerId);
  const playerCanSubmit = currentUser?.role === 'player'
    && match.status === 'finished'
    && Boolean(activePlayer)
    && (activePlayer?.teamId === match.homeTeamId || activePlayer?.teamId === match.awayTeamId);
  const playerSubmission = data.statSubmissions.find((submission) => (
    submission.matchId === match.id && submission.playerId === activePlayer?.id
  ));
  const pendingSubmissions = data.statSubmissions.filter((submission) => (
    submission.matchId === match.id && submission.status === 'pending'
  ));
  if (!home || !away) return null;

  const saveResult = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await saveEntity('matches', {
      ...match,
      status: 'finished',
      homeScore: Number(form.get('homeScore')),
      awayScore: Number(form.get('awayScore')),
    }, 'registrou o placar');
    notify('Resultado registrado e estatísticas atualizadas.');
    setResultOpen(false);
  };

  const addEvent = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const type = String(form.get('type')) as EventType;
    const teamId = String(form.get('teamId'));
    const matchEvent: MatchEvent = {
      id: createId('event'),
      type,
      teamId,
      playerId: String(form.get('playerId')),
      assistPlayerId: type === 'goal' ? String(form.get('assistPlayerId') || '') || undefined : undefined,
      minute: Number(form.get('minute')),
    };
    const updated: Match = { ...match, events: [...match.events, matchEvent] };
    if (type === 'goal') {
      updated.homeScore = (match.homeScore || 0) + (teamId === match.homeTeamId ? 1 : 0);
      updated.awayScore = (match.awayScore || 0) + (teamId === match.awayTeamId ? 1 : 0);
    }
    await saveEntity('matches', updated, `registrou ${type === 'goal' ? 'um gol' : type === 'yellow' ? 'um cartão amarelo' : 'um cartão vermelho'}`);
    notify('Evento adicionado à súmula.');
    setEventOpen(false);
  };

  const teamPlayers = data.players.filter((player) => player.teamId === eventTeam);

  const submitStats = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!activePlayer) return;
    const form = new FormData(event.currentTarget);
    const goals = Number(form.get('goals')) || 0;
    const assists = Number(form.get('assists')) || 0;
    if (goals === 0 && assists === 0) {
      notify('Informe ao menos um gol ou uma assistência.', 'error');
      return;
    }
    const submission: StatSubmission = {
      id: playerSubmission?.id || `${match.id}-${activePlayer.id}`,
      organizationId: match.organizationId,
      matchId: match.id,
      playerId: activePlayer.id,
      teamId: activePlayer.teamId,
      goals,
      assists,
      note: String(form.get('note') || '').trim() || undefined,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    await saveEntity('statSubmissions', submission, 'enviou estatísticas para aprovação');
    notify('Seus números foram enviados ao gerenciador.');
    setStatsOpen(false);
  };

  const reviewSubmission = async (submission: StatSubmission, approved: boolean) => {
    if (submission.status !== 'pending') return;
    if (approved) {
      const claimedEvents: MatchEvent[] = [
        ...Array.from({ length: submission.goals }, (_, index) => ({
          id: `${submission.id}-goal-${index + 1}`,
          type: 'goal' as const,
          playerId: submission.playerId,
          teamId: submission.teamId,
          minute: 0,
        })),
        ...Array.from({ length: submission.assists }, (_, index) => ({
          id: `${submission.id}-assist-${index + 1}`,
          type: 'assist' as const,
          playerId: submission.playerId,
          teamId: submission.teamId,
          minute: 0,
        })),
      ].filter((event) => !match.events.some((existingEvent) => existingEvent.id === event.id));
      if (claimedEvents.length) {
        await saveEntity('matches', { ...match, events: [...match.events, ...claimedEvents] }, 'aprovou estatísticas enviadas por jogador');
      }
    }
    await saveEntity('statSubmissions', {
      ...submission,
      status: approved ? 'approved' : 'rejected',
      reviewedAt: new Date().toISOString(),
      reviewedBy: currentUser?.uid,
    }, approved ? 'aprovou uma declaração de estatísticas' : 'recusou uma declaração de estatísticas');
    notify(approved ? 'Estatísticas aprovadas e adicionadas à súmula.' : 'Declaração recusada.');
  };

  return (
    <>
      <button className="back-link" type="button" onClick={() => navigate('/partidas')}><ArrowLeft size={17} /> Voltar para partidas</button>
      <div className="match-detail-hero">
        <div className="match-detail-hero__meta">
          <Badge tone={match.status === 'finished' ? 'neutral' : 'lime'}>{match.status === 'finished' ? 'Partida finalizada' : 'Partida agendada'}</Badge>
          <span>{league?.name || 'Amistoso'}</span>
        </div>
        <div className="match-detail-score">
          <div><TeamMark {...home} size="lg" /><h2>{home.name}</h2><small>MANDANTE</small></div>
          <strong>{match.status === 'finished' || match.status === 'live' ? <>{match.homeScore || 0}<i>×</i>{match.awayScore || 0}</> : <i>VS</i>}</strong>
          <div><TeamMark {...away} size="lg" /><h2>{away.name}</h2><small>VISITANTE</small></div>
        </div>
        <div className="match-detail-hero__info">
          <span><CalendarDays size={16} />{formatLongDate(match.startsAt)}</span>
          <span><MapPin size={16} />{venue?.name}</span>
          {match.requiresGeolocation && <span><Radio size={16} />Check-in geolocalizado</span>}
        </div>
        {canManage && (
          <div className="match-detail-hero__actions">
            <Button variant="secondary" icon={Plus} onClick={() => { setEventTeam(home.id); setEventOpen(true); }}>Adicionar evento</Button>
            <Button icon={CheckCircle2} onClick={() => setResultOpen(true)}>Registrar resultado</Button>
          </div>
        )}
        {playerCanSubmit && (
          <div className="match-detail-hero__actions">
            <Button
              icon={Send}
              variant={playerSubmission?.status === 'approved' ? 'secondary' : 'primary'}
              disabled={playerSubmission?.status === 'pending' || playerSubmission?.status === 'approved'}
              onClick={() => setStatsOpen(true)}
            >
              {playerSubmission?.status === 'pending'
                ? 'Aguardando aprovação'
                : playerSubmission?.status === 'approved'
                  ? 'Estatísticas aprovadas'
                  : playerSubmission?.status === 'rejected'
                    ? 'Reenviar estatísticas'
                    : 'Informar gols e assistências'}
            </Button>
          </div>
        )}
      </div>

      <div className="match-detail-grid">
        <section className="panel">
          <div className="section-header"><div><h2>Súmula da partida</h2><p>Gols, assistências e cartões</p></div><Badge tone="neutral">{match.events.length} eventos</Badge></div>
          <div className="timeline">
            {match.events.length ? [...match.events].sort((a, b) => a.minute - b.minute).map((item) => {
              const player = data.players.find((entry) => entry.id === item.playerId);
              const assist = data.players.find((entry) => entry.id === item.assistPlayerId);
              return (
                <div className="timeline__item" key={item.id}>
                  <strong>{item.minute}'</strong>
                  <span className={`event-icon event-icon--${item.type}`}>{item.type === 'goal' ? '⚽' : ''}</span>
                  <div>
                    <p><b>{item.type === 'goal' ? 'Gol' : item.type === 'assist' ? 'Assistência' : item.type === 'yellow' ? 'Cartão amarelo' : 'Cartão vermelho'}</b> · {playerDisplayName(player)}</p>
                    {assist && <small>Assistência de {playerDisplayName(assist)}</small>}
                  </div>
                </div>
              );
            }) : <EmptyState title="Súmula vazia" description="Os eventos registrados durante a partida aparecerão aqui." />}
          </div>
        </section>
        <section className="panel match-rosters">
          <div className="section-header">
            <div><h2>Jogadores e check-in</h2><p>Presença dos elencos nesta partida</p></div>
            <Badge tone="lime">{checkedIn.length} confirmado{checkedIn.length === 1 ? '' : 's'}</Badge>
          </div>
          <div className="match-rosters__grid">
            {[
              { team: home, players: homePlayers },
              { team: away, players: awayPlayers },
            ].map(({ team, players }) => {
              const confirmed = players.filter((player) => checkedIn.some((checkin) => checkin.playerId === player.id)).length;
              return (
                <article className="match-roster" key={team.id}>
                  <header>
                    <TeamMark {...team} size="sm" />
                    <div><strong>{team.name}</strong><small>{confirmed} de {players.length} com check-in</small></div>
                  </header>
                  <div className="match-roster__players">
                    {players.length ? players.map((player) => {
                      const checkin = data.checkins.find((item) => item.matchId === match.id && item.playerId === player.id);
                      return (
                        <div className="match-roster__player" key={player.id}>
                          <Avatar name={player.name} src={player.photoUrl} size="sm" tone={team.color} />
                          <div>
                            <strong>{playerDisplayName(player)}</strong>
                            <small>{player.shirtNumber ? `#${player.shirtNumber} · ` : ''}{player.positions.join(', ')}</small>
                          </div>
                          <Badge tone={checkin?.validated ? 'success' : checkin ? 'warning' : 'neutral'} dot>
                            {checkin?.validated ? 'Confirmado' : checkin ? 'Não validado' : 'Sem check-in'}
                          </Badge>
                        </div>
                      );
                    }) : (
                      <div className="match-roster__empty">Nenhum jogador cadastrado nesta equipe.</div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </section>
        {canManage && pendingSubmissions.length > 0 && (
          <section className="panel stat-review-panel">
            <div className="section-header">
              <div><h2>Estatísticas enviadas pelos jogadores</h2><p>Confira antes de adicionar à súmula oficial</p></div>
              <Badge tone="warning">{pendingSubmissions.length} pendente{pendingSubmissions.length > 1 ? 's' : ''}</Badge>
            </div>
            <div className="stat-review-list">
              {pendingSubmissions.map((submission) => {
                const player = data.players.find((item) => item.id === submission.playerId);
                return (
                  <article className="stat-review-item" key={submission.id}>
                    <span><ClipboardCheck size={19} /></span>
                    <div>
                      <strong>{playerDisplayName(player)}</strong>
                      <p>{submission.goals} gol{submission.goals === 1 ? '' : 's'} · {submission.assists} assistência{submission.assists === 1 ? '' : 's'}</p>
                      {submission.note && <small>{submission.note}</small>}
                    </div>
                    <div className="stat-review-item__actions">
                      <Button variant="ghost" icon={X} onClick={() => reviewSubmission(submission, false)}>Recusar</Button>
                      <Button icon={Check} onClick={() => reviewSubmission(submission, true)}>Aprovar</Button>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        )}
        <aside className="match-detail-aside">
          <section className="panel detail-info-card">
            <h3>Informações</h3>
            <div><span><Trophy size={16} /></span><p><small>Competição</small><strong>{league?.name || 'Partida amistosa'}</strong></p></div>
            <div><span><MapPin size={16} /></span><p><small>Local</small><strong>{venue?.name}</strong></p></div>
            <div><span><UsersRound size={16} /></span><p><small>Check-ins validados</small><strong>{checkedIn.length} jogadores</strong></p></div>
          </section>
          {match.requiresGeolocation && <section className="panel geo-status"><span><Radio size={19} /></span><div><strong>Proteção por localização</strong><p>Raio permitido: {venue?.checkinRadius || 0} metros.</p></div></section>}
        </aside>
      </div>

      <Modal open={resultOpen} onClose={() => setResultOpen(false)} title="Registrar resultado" description="O placar final será usado na classificação da liga.">
        <form className="form" onSubmit={saveResult}>
          <div className="score-form">
            <label><TeamMark {...home} size="md" /><strong>{home.shortName}</strong><input name="homeScore" type="number" min="0" required defaultValue={match.homeScore || 0} /></label>
            <b>×</b>
            <label><TeamMark {...away} size="md" /><strong>{away.shortName}</strong><input name="awayScore" type="number" min="0" required defaultValue={match.awayScore || 0} /></label>
          </div>
          <div className="form-tip"><Trophy size={18} /><p><strong>Estatísticas da liga</strong><span>{league ? `Este resultado conta para ${league.name}.` : 'Partidas amistosas não alteram a classificação.'}</span></p></div>
          <div className="form-actions"><Button type="button" variant="ghost" onClick={() => setResultOpen(false)}>Cancelar</Button><Button type="submit">Salvar resultado</Button></div>
        </form>
      </Modal>

      <Modal open={eventOpen} onClose={() => setEventOpen(false)} title="Adicionar evento à súmula" description="Registre gols, assistências e cartões conforme aconteceram.">
        <form className="form" onSubmit={addEvent}>
          <div className="form-row form-row--3">
            <label><span>Evento</span><select name="type"><option value="goal">Gol</option><option value="yellow">Cartão amarelo</option><option value="red">Cartão vermelho</option></select></label>
            <label><span>Equipe</span><select name="teamId" value={eventTeam} onChange={(event) => setEventTeam(event.target.value)}><option value={home.id}>{home.name}</option><option value={away.id}>{away.name}</option></select></label>
            <label><span>Minuto</span><input name="minute" type="number" min="0" max="150" required placeholder="35" /></label>
          </div>
          <label><span>Jogador</span><select name="playerId" required defaultValue=""><option value="">Selecione</option>{teamPlayers.map((player) => <option key={player.id} value={player.id}>{player.name}</option>)}</select></label>
          <label><span>Assistência <small>(preencha apenas para gol)</small></span><select name="assistPlayerId" defaultValue=""><option value="">Sem assistência</option>{teamPlayers.map((player) => <option key={player.id} value={player.id}>{player.name}</option>)}</select></label>
          <div className="form-tip form-tip--warning"><ShieldAlert size={18} /><p><strong>Regra disciplinar</strong><span>Cartões em partidas de liga serão contabilizados para possíveis suspensões.</span></p></div>
          <div className="form-actions"><Button type="button" variant="ghost" onClick={() => setEventOpen(false)}>Cancelar</Button><Button type="submit">Adicionar à súmula</Button></div>
        </form>
      </Modal>

      <Modal open={statsOpen} onClose={() => setStatsOpen(false)} title="Informar suas estatísticas" description="O gerenciador precisará aprovar os números antes de entrarem na súmula.">
        <form className="form" onSubmit={submitStats}>
          <div className="form-row form-row--2">
            <label><span>Gols marcados</span><input name="goals" type="number" min="0" max="30" required defaultValue={playerSubmission?.goals || 0} /></label>
            <label><span>Assistências</span><input name="assists" type="number" min="0" max="30" required defaultValue={playerSubmission?.assists || 0} /></label>
          </div>
          <label><span>Observação <small>(opcional)</small></span><textarea name="note" rows={3} defaultValue={playerSubmission?.note} placeholder="Explique algum lance se achar necessário." /></label>
          {playerSubmission?.status === 'rejected' && (
            <div className="form-tip form-tip--warning"><ShieldAlert size={18} /><p><strong>Envio anterior recusado</strong><span>Revise os números antes de enviar novamente.</span></p></div>
          )}
          <div className="form-actions"><Button type="button" variant="ghost" onClick={() => setStatsOpen(false)}>Cancelar</Button><Button type="submit" icon={Send}>Enviar para aprovação</Button></div>
        </form>
      </Modal>
    </>
  );
}
