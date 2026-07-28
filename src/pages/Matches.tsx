import {
  ArrowLeft,
  CalendarDays,
  Check,
  CheckCircle2,
  ClipboardCheck,
  Edit3,
  MapPin,
  Palette,
  Plus,
  Radio,
  RotateCcw,
  Send,
  ShieldAlert,
  Shuffle,
  Trash2,
  Trophy,
  UsersRound,
  X,
} from 'lucide-react';
import { FaTshirt } from 'react-icons/fa';
import { PiSoccerBallFill } from 'react-icons/pi';
import { useEffect, useMemo, useState, type CSSProperties, type FormEvent } from 'react';
import { AttendanceManager } from '../components/AttendanceManager';
import { DangerConfirmModal } from '../components/DangerConfirmModal';
import { MatchCard } from '../components/MatchCard';
import { Avatar, Badge, Button, EmptyState, Modal, PageHeader, TeamMark } from '../components/UI';
import { createId, useApp } from '../context/AppContext';
import {
  buildConfirmationQueue,
  buildDrawLineup,
  formatLongDate,
  getMatchTeams,
  isDrawMatch,
  matchIncludesPlayer,
  playerDisplayName,
  scoreFromEvents,
  shufflePlayerIds,
} from '../lib/utils';
import { useNavigate, useParams, useSearchParams } from '../lib/router';
import type { Checkin, EventType, Match, MatchConfirmation, MatchEvent, MatchType, StatSubmission } from '../types';

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
  const [matchType, setMatchType] = useState<MatchType>('teams');
  const [homeTeamId, setHomeTeamId] = useState('');
  const [awayTeamId, setAwayTeamId] = useState('');
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);
  const [maxPlayersPerTeam, setMaxPlayersPerTeam] = useState(5);
  const [drawHomeName, setDrawHomeName] = useState('Time Verde');
  const [drawAwayName, setDrawAwayName] = useState('Time Preto');
  const [drawHomeColor, setDrawHomeColor] = useState('#b7f52e');
  const [drawAwayColor, setDrawAwayColor] = useState('#5f7567');
  const [startsAt, setStartsAt] = useState('');
  const [requiresConfirmation, setRequiresConfirmation] = useState(true);
  const [confirmationDeadline, setConfirmationDeadline] = useState('');
  const [confirmationDeadlineTouched, setConfirmationDeadlineTouched] = useState(false);
  const [scheduleError, setScheduleError] = useState('');
  const orgId = currentUser?.organizationId;
  const canManage = currentUser?.role === 'manager';
  const activePlayer = data.players.find((player) => player.id === currentUser?.playerId);
  const teams = data.teams.filter((team) => team.organizationId === orgId);
  const availablePlayers = data.players
    .filter((player) => player.organizationId === orgId && player.status === 'active')
    .sort((a, b) => a.name.localeCompare(b.name));
  const venues = data.venues.filter((venue) => venue.organizationId === orgId);
  const selectedGoalkeeperCount = availablePlayers.filter((player) => (
    selectedPlayerIds.includes(player.id)
    && player.positions.some((position) => position.toLocaleLowerCase('pt-BR') === 'goleiro')
  )).length;
  const canSchedule = venues.length > 0 && (
    matchType === 'draw'
      ? selectedPlayerIds.length >= 2 && selectedGoalkeeperCount >= 2 && maxPlayersPerTeam >= 1
      : teams.length >= 2
  );
  const matches = useMemo(() => data.matches
    .filter((match) => match.organizationId === orgId)
    .filter((match) => canManage || !activePlayer || matchIncludesPlayer(match, activePlayer))
    .filter((match) => status === 'all' || match.status === status)
    .sort((a, b) => status === 'finished' ? +new Date(b.startsAt) - +new Date(a.startsAt) : +new Date(a.startsAt) - +new Date(b.startsAt)), [data.matches, orgId, status, canManage, activePlayer]);

  useEffect(() => {
    if (searchParams.get('nova') === '1' && canManage) setModalOpen(true);
  }, [searchParams, canManage]);

  const openSchedule = () => {
    setMatchType('teams');
    setHomeTeamId('');
    setAwayTeamId('');
    setSelectedPlayerIds([]);
    setMaxPlayersPerTeam(5);
    setDrawHomeName('Time Verde');
    setDrawAwayName('Time Preto');
    setDrawHomeColor('#b7f52e');
    setDrawAwayColor('#5f7567');
    setStartsAt('');
    setRequiresConfirmation(true);
    setConfirmationDeadline('');
    setConfirmationDeadlineTouched(false);
    setScheduleError('');
    setModalOpen(true);
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    if (matchType === 'teams' && teams.length < 2) {
      setScheduleError('Cadastre pelo menos duas equipes para criar um confronto.');
      return;
    }
    if (!venues.length) {
      setScheduleError('Cadastre um local antes de agendar a partida.');
      return;
    }
    if (matchType === 'teams' && homeTeamId === awayTeamId) {
      setScheduleError('Mandante e visitante precisam ser equipes diferentes.');
      return;
    }
    if (matchType === 'draw' && selectedPlayerIds.length < 2) {
      setScheduleError('Selecione pelo menos dois jogadores para realizar o sorteio.');
      return;
    }
    if (matchType === 'draw' && selectedGoalkeeperCount < 2) {
      setScheduleError('Selecione pelo menos dois jogadores que atuem como goleiro, um para cada equipe.');
      return;
    }
    if (matchType === 'draw' && maxPlayersPerTeam < 1) {
      setScheduleError('Informe ao menos um jogador por equipe.');
      return;
    }
    if (requiresConfirmation && !confirmationDeadline) {
      setScheduleError('Defina até quando os jogadores poderão confirmar presença.');
      return;
    }
    if (requiresConfirmation && +new Date(confirmationDeadline) >= +new Date(startsAt)) {
      setScheduleError('O prazo de confirmação precisa terminar antes do início da partida.');
      return;
    }
    const venue = data.venues.find((item) => item.id === form.get('venueId'));
    const leagueId = matchType === 'teams' ? String(form.get('leagueId') || '') || undefined : undefined;
    const matchId = createId('match');
    const drawOrder = matchType === 'draw' ? shufflePlayerIds(selectedPlayerIds) : undefined;
    const entity: Match = {
      id: matchId,
      organizationId: orgId || '',
      leagueId,
      venueId: String(form.get('venueId')),
      homeTeamId: matchType === 'draw' ? `${matchId}-green` : homeTeamId,
      awayTeamId: matchType === 'draw' ? `${matchId}-black` : awayTeamId,
      matchType,
      ...(matchType === 'draw' ? {
        selectedPlayerIds,
        homePlayerIds: [],
        awayPlayerIds: [],
        waitingPlayerIds: [],
        drawOrder,
        maxPlayersPerTeam,
        homeTeamName: drawHomeName.trim() || 'Time Verde',
        awayTeamName: drawAwayName.trim() || 'Time Preto',
        homeTeamColor: drawHomeColor,
        awayTeamColor: drawAwayColor,
        drawnAt: new Date().toISOString(),
      } : {}),
      startsAt: new Date(String(form.get('startsAt'))).toISOString(),
      status: 'scheduled',
      requiresGeolocation: form.get('requiresGeolocation') === 'on' || Boolean(venue?.requiresGeolocation),
      requiresConfirmation,
      ...(requiresConfirmation ? {
        confirmationDeadline: new Date(confirmationDeadline).toISOString(),
        ...(matchType === 'draw' ? { confirmationLimit: maxPlayersPerTeam * 2 } : {}),
      } : {}),
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
    notify(matchType === 'draw'
      ? 'Baba agendado. As confirmações definem as vagas e os check-ins definem quem joga primeiro.'
      : 'Partida agendada e convocação aberta.');
    setModalOpen(false);
  };

  return (
    <>
      <PageHeader
        eyebrow="CALENDÁRIO"
        title="Partidas"
        description={canManage ? 'Agende confrontos entre equipes fixas ou selecione jogadores para formar times por sorteio.' : 'Acompanhe sua agenda e os resultados da competição.'}
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

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Agendar partida" description="Escolha entre equipes fixas ou um baba com times sorteados." size="lg">
        <form className="form" onSubmit={submit}>
          <div className="match-type-selector">
            <button type="button" className={matchType === 'teams' ? 'active' : ''} onClick={() => { setMatchType('teams'); setScheduleError(''); }}>
              <Trophy size={21} /><span><strong>Equipes fixas</strong><small>Confronto tradicional, amistoso ou por uma liga.</small></span>
            </button>
            <button type="button" className={matchType === 'draw' ? 'active' : ''} onClick={() => { setMatchType('draw'); setScheduleError(''); }}>
              <Shuffle size={21} /><span><strong>Times sorteados</strong><small>As confirmações definem as vagas; o check-in ordena e o sorteio distribui os jogadores.</small></span>
            </button>
          </div>
          <div className={`form-tip ${!canSchedule || scheduleError ? 'form-tip--warning' : ''}`}>
            <ShieldAlert size={18} />
            <p>
              <strong>
                {!venues.length
                  ? 'Falta cadastrar um local'
                  : matchType === 'draw' && selectedPlayerIds.length < 2
                    ? 'Selecione os participantes'
                    : matchType === 'draw' && selectedGoalkeeperCount < 2
                      ? 'Faltam goleiros'
                    : matchType === 'teams' && teams.length < 2
                  ? 'Falta cadastrar outra equipe'
                    : scheduleError ? 'Não foi possível agendar' : matchType === 'draw' ? 'Sorteio por partida' : 'Regra do confronto'}
              </strong>
              <span>
                {!venues.length
                  ? 'Toda partida precisa estar associada a um campo ou quadra.'
                  : scheduleError
                    || (matchType === 'draw'
                      ? selectedGoalkeeperCount < 2
                        ? `${selectedGoalkeeperCount} goleiro${selectedGoalkeeperCount === 1 ? '' : 's'} selecionado${selectedGoalkeeperCount === 1 ? '' : 's'}. Cada equipe precisa ter ao menos um goleiro.`
                        : `${selectedPlayerIds.length} selecionados · ${selectedGoalkeeperCount} goleiros · até ${maxPlayersPerTeam} jogadores por equipe.`
                      : teams.length < 2
                        ? `Você possui ${teams.length} equipe cadastrada. Uma partida exige duas equipes diferentes.`
                        : 'Uma equipe não pode enfrentar ela própria; escolha mandante e visitante diferentes.')}
              </span>
            </p>
          </div>
          {matchType === 'teams' ? (
            <div className="versus-form">
              <label><span>Mandante</span><select name="homeTeamId" required value={homeTeamId} onChange={(event) => { setHomeTeamId(event.target.value); if (event.target.value === awayTeamId) setAwayTeamId(''); setScheduleError(''); }}><option value="">Selecione a equipe</option>{teams.map((team) => <option key={team.id} value={team.id} disabled={team.id === awayTeamId}>{team.name}</option>)}</select></label>
              <b>VS</b>
              <label><span>Visitante</span><select name="awayTeamId" required value={awayTeamId} onChange={(event) => { setAwayTeamId(event.target.value); setScheduleError(''); }}><option value="">Selecione outra equipe</option>{teams.map((team) => <option key={team.id} value={team.id} disabled={team.id === homeTeamId}>{team.name}</option>)}</select></label>
            </div>
          ) : (
            <fieldset className="draw-player-picker">
              <legend><span>Jogadores participantes</span><button type="button" onClick={() => setSelectedPlayerIds(availablePlayers.length > 0 && selectedPlayerIds.length === availablePlayers.length ? [] : availablePlayers.map((player) => player.id))}>{availablePlayers.length > 0 && selectedPlayerIds.length === availablePlayers.length ? 'Limpar seleção' : 'Selecionar todos'}</button></legend>
              <div className="draw-player-options">
                {availablePlayers.map((player) => {
                  const team = teams.find((item) => item.id === player.teamId);
                  const selected = selectedPlayerIds.includes(player.id);
                  return (
                    <label key={player.id} className={selected ? 'selected' : ''}>
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => setSelectedPlayerIds((current) => current.includes(player.id) ? current.filter((id) => id !== player.id) : [...current, player.id])}
                      />
                      <Avatar name={player.name} src={player.photoUrl} size="sm" tone={team?.color} />
                      <span><strong>{playerDisplayName(player)}</strong><small>{player.membershipType === 'subscriber' ? 'Mensalista' : player.membershipType === 'guest' ? 'Convidado' : 'Sem classificação'} · {player.positions.join('/')} · {team?.shortName || 'Sem equipe'}</small></span>
                      <i><Check size={14} /></i>
                    </label>
                  );
                })}
              </div>
              {!availablePlayers.length && <p>Nenhum jogador ativo disponível nesta organização.</p>}
              <div className="draw-team-customizer">
                <article style={{ '--draw-team-color': drawHomeColor } as CSSProperties}>
                  <span className="draw-team-customizer__vest"><FaTshirt aria-hidden="true" /></span>
                  <label><span>Nome do primeiro time</span><input name="drawHomeName" required maxLength={32} value={drawHomeName} onChange={(event) => setDrawHomeName(event.target.value)} /></label>
                  <label className="draw-team-color"><span>Cor</span><input name="drawHomeColor" type="color" value={drawHomeColor} onChange={(event) => setDrawHomeColor(event.target.value)} /><code>{drawHomeColor.toUpperCase()}</code></label>
                </article>
                <article style={{ '--draw-team-color': drawAwayColor } as CSSProperties}>
                  <span className="draw-team-customizer__vest"><FaTshirt aria-hidden="true" /></span>
                  <label><span>Nome do segundo time</span><input name="drawAwayName" required maxLength={32} value={drawAwayName} onChange={(event) => setDrawAwayName(event.target.value)} /></label>
                  <label className="draw-team-color"><span>Cor</span><input name="drawAwayColor" type="color" value={drawAwayColor} onChange={(event) => setDrawAwayColor(event.target.value)} /><code>{drawAwayColor.toUpperCase()}</code></label>
                </article>
              </div>
              <div className="draw-capacity-field">
                <label>
                  <span>Máximo de jogadores por equipe</span>
                  <input
                    name="maxPlayersPerTeam"
                    type="number"
                    min="1"
                    max="30"
                    required
                    value={maxPlayersPerTeam}
                    onChange={(event) => {
                      setMaxPlayersPerTeam(Number(event.target.value));
                      setScheduleError('');
                    }}
                  />
                </label>
                <p><strong>{maxPlayersPerTeam * 2} vagas na primeira partida</strong><small>Quem exceder o limite ficará na fila. Convidados entram somente depois dos demais jogadores confirmados.</small></p>
              </div>
            </fieldset>
          )}
          <div className="form-row form-row--2">
            <label>
              <span>Data e horário</span>
              <input
                name="startsAt"
                type="datetime-local"
                required
                value={startsAt}
                onChange={(event) => {
                  const value = event.target.value;
                  setStartsAt(value);
                  if (!confirmationDeadlineTouched && value) {
                    const deadline = new Date(value);
                    deadline.setHours(deadline.getHours() - 6);
                    const timezoneOffset = deadline.getTimezoneOffset() * 60000;
                    setConfirmationDeadline(new Date(deadline.getTime() - timezoneOffset).toISOString().slice(0, 16));
                  }
                  setScheduleError('');
                }}
              />
            </label>
            <label><span>Local</span><select name="venueId" required defaultValue=""><option value="">Selecione o campo</option>{venues.map((venue) => <option key={venue.id} value={venue.id}>{venue.name}</option>)}</select></label>
          </div>
          <div className={`confirmation-config ${requiresConfirmation ? 'confirmation-config--active' : ''}`}>
            <label className="toggle-field">
              <input
                type="checkbox"
                checked={requiresConfirmation}
                onChange={(event) => {
                  setRequiresConfirmation(event.target.checked);
                  setScheduleError('');
                }}
              />
              <i />
              <span><strong>Solicitar confirmação antecipada</strong><small>Os jogadores respondem antes de liberar o check-in.</small></span>
            </label>
            {requiresConfirmation && (
              <div className="confirmation-config__details">
                <label>
                  <span>Prazo para responder</span>
                  <input
                    type="datetime-local"
                    required
                    value={confirmationDeadline}
                    max={startsAt || undefined}
                    onChange={(event) => {
                      setConfirmationDeadline(event.target.value);
                      setConfirmationDeadlineTouched(true);
                      setScheduleError('');
                    }}
                  />
                </label>
                <p>
                  <strong>{matchType === 'draw' ? `${maxPlayersPerTeam * 2} vagas confirmadas` : 'Convocação dos dois elencos'}</strong>
                  <small>{matchType === 'draw' ? 'Excedentes entram na fila; convidados ficam depois dos demais.' : 'Todos os jogadores das duas equipes poderão responder.'}</small>
                </p>
              </div>
            )}
          </div>
          {matchType === 'teams' && <label><span>Liga ou competição <small>(opcional)</small></span><select name="leagueId" defaultValue=""><option value="">Amistoso — não contabiliza estatísticas de liga</option>{data.leagues.filter((league) => league.organizationId === orgId && league.status === 'active').map((league) => <option key={league.id} value={league.id}>{league.name} · {league.season}</option>)}</select></label>}
          <label className="toggle-field"><input type="checkbox" name="requiresGeolocation" /><i /><span><strong>Exigir geolocalização no check-in</strong><small>O jogador deverá estar dentro do raio definido no local.</small></span></label>
          <label><span>Observações <small>(opcional)</small></span><textarea name="notes" rows={3} placeholder="Informações adicionais para os jogadores..." /></label>
          <div className="form-actions"><Button type="button" variant="ghost" onClick={() => setModalOpen(false)}>Cancelar</Button><Button type="submit" icon={matchType === 'draw' ? Shuffle : CalendarDays} disabled={!canSchedule}>{matchType === 'draw' ? 'Agendar sorteio' : 'Agendar partida'}</Button></div>
        </form>
      </Modal>
    </>
  );
}

function MatchDetails({ matchId }: { matchId: string }) {
  const { data, currentUser, saveEntity, deleteEntityWithDependencies, notify } = useApp();
  const navigate = useNavigate();
  const match = data.matches.find((item) => item.id === matchId);
  const [eventOpen, setEventOpen] = useState(false);
  const [statsOpen, setStatsOpen] = useState(false);
  const [teamIdentityOpen, setTeamIdentityOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [identityHomeColor, setIdentityHomeColor] = useState('#b7f52e');
  const [identityAwayColor, setIdentityAwayColor] = useState('#5f7567');
  const [manualCheckinPlayerId, setManualCheckinPlayerId] = useState('');
  const [editingEvent, setEditingEvent] = useState<MatchEvent | null>(null);
  const [eventType, setEventType] = useState<EventType>('goal');
  const [eventTeam, setEventTeam] = useState('');
  const [eventPlayer, setEventPlayer] = useState('');
  const [assistPlayer, setAssistPlayer] = useState('');
  const [ownGoal, setOwnGoal] = useState(false);
  const canManage = currentUser?.role === 'manager';

  if (!match) return <EmptyState title="Partida não encontrada" description="Este confronto não existe ou você não possui acesso." action={<Button onClick={() => navigate('/partidas')}>Voltar</Button>} />;
  const [baseHome, baseAway] = getMatchTeams(match, data.teams);
  const venue = data.venues.find((item) => item.id === match.venueId);
  const league = data.leagues.find((item) => item.id === match.leagueId);
  const confirmationQueue = buildConfirmationQueue(match, data.players, data.matchConfirmations);
  const confirmedSpotIds = new Set(confirmationQueue.confirmedPlayerIds);
  const checkedIn = data.checkins.filter((checkin) => (
    checkin.matchId === match.id
    && checkin.validated
    && (!match.requiresConfirmation || confirmedSpotIds.has(checkin.playerId))
  ));
  const drawLineup = isDrawMatch(match)
    ? buildDrawLineup(match, data.players, checkedIn, data.matchConfirmations)
    : null;
  const hasPersistedDrawLineup = isDrawMatch(match)
    && match.status !== 'scheduled'
    && Boolean(match.homePlayerIds?.length && match.awayPlayerIds?.length);
  const effectiveHomePlayerIds = isDrawMatch(match)
    ? hasPersistedDrawLineup ? match.homePlayerIds || [] : drawLineup?.homePlayerIds || []
    : [];
  const effectiveAwayPlayerIds = isDrawMatch(match)
    ? hasPersistedDrawLineup ? match.awayPlayerIds || [] : drawLineup?.awayPlayerIds || []
    : [];
  const effectiveWaitingPlayerIds = isDrawMatch(match)
    ? hasPersistedDrawLineup ? match.waitingPlayerIds || [] : drawLineup?.waitingPlayerIds || []
    : [];
  const home = baseHome ? { ...baseHome, playerIds: isDrawMatch(match) ? effectiveHomePlayerIds : baseHome.playerIds } : undefined;
  const away = baseAway ? { ...baseAway, playerIds: isDrawMatch(match) ? effectiveAwayPlayerIds : baseAway.playerIds } : undefined;
  const homePlayers = data.players
    .filter((player) => isDrawMatch(match) ? effectiveHomePlayerIds.includes(player.id) : player.teamId === match.homeTeamId)
    .sort((a, b) => (a.shirtNumber || 999) - (b.shirtNumber || 999) || a.name.localeCompare(b.name));
  const awayPlayers = data.players
    .filter((player) => isDrawMatch(match) ? effectiveAwayPlayerIds.includes(player.id) : player.teamId === match.awayTeamId)
    .sort((a, b) => (a.shirtNumber || 999) - (b.shirtNumber || 999) || a.name.localeCompare(b.name));
  const waitingPlayers = data.players
    .filter((player) => effectiveWaitingPlayerIds.includes(player.id))
    .sort((a, b) => effectiveWaitingPlayerIds.indexOf(a.id) - effectiveWaitingPlayerIds.indexOf(b.id));
  const pendingCheckinPlayers = data.players
    .filter((player) => drawLineup?.pendingCheckinPlayerIds.includes(player.id))
    .sort((a, b) => playerDisplayName(a).localeCompare(playerDisplayName(b), 'pt-BR'));
  const hasPlayersWithoutCheckin = isDrawMatch(match)
    ? pendingCheckinPlayers.length > 0
    : [...homePlayers, ...awayPlayers].some((player) => !checkedIn.some((checkin) => checkin.playerId === player.id));
  const activePlayer = data.players.find((player) => player.id === currentUser?.playerId);
  const playerCanSubmit = currentUser?.role === 'player'
    && match.status === 'finished'
    && Boolean(activePlayer)
    && (isDrawMatch(match)
      ? Boolean(activePlayer && (effectiveHomePlayerIds.includes(activePlayer.id) || effectiveAwayPlayerIds.includes(activePlayer.id)))
      : matchIncludesPlayer(match, activePlayer));
  const playerSubmission = data.statSubmissions.find((submission) => (
    submission.matchId === match.id && submission.playerId === activePlayer?.id
  ));
  const pendingSubmissions = data.statSubmissions.filter((submission) => (
    submission.matchId === match.id && submission.status === 'pending'
  ));
  if (!home || !away) return null;
  const drawAssignment = isDrawMatch(match) ? {
    homePlayerIds: effectiveHomePlayerIds,
    awayPlayerIds: effectiveAwayPlayerIds,
    waitingPlayerIds: effectiveWaitingPlayerIds,
  } : {};

  const registerManualCheckin = async (playerId: string) => {
    if (!canManage || !currentUser) return;
    const player = data.players.find((item) => item.id === playerId);
    const eligible = player && (
      isDrawMatch(match)
        ? match.selectedPlayerIds?.includes(player.id)
        : player.teamId === match.homeTeamId || player.teamId === match.awayTeamId
    );
    if (!player || !eligible) {
      notify('Este jogador não faz parte da partida.', 'error');
      return;
    }
    if (match.requiresConfirmation) {
      const currentConfirmation = data.matchConfirmations.find((item) => (
        item.matchId === match.id && item.playerId === player.id
      ));
      const managerConfirmation: MatchConfirmation = {
        id: currentConfirmation?.id || `${match.id}-${player.id}`,
        organizationId: match.organizationId,
        matchId: match.id,
        playerId: player.id,
        status: 'going',
        respondedAt: currentConfirmation?.status === 'going'
          ? currentConfirmation.respondedAt
          : new Date().toISOString(),
        source: 'manager',
        registeredByUserId: currentUser.id,
        registeredByName: currentUser.name,
      };
      const nextConfirmations = [
        ...data.matchConfirmations.filter((item) => item.id !== managerConfirmation.id),
        managerConfirmation,
      ];
      const confirmationQueue = buildConfirmationQueue(match, data.players, nextConfirmations);
      if (currentConfirmation?.status !== 'going') {
        await saveEntity(
          'matchConfirmations',
          managerConfirmation,
          `confirmou a presença de ${playerDisplayName(player)}`,
        );
      }
      if (confirmationQueue.waitingPlayerIds.includes(player.id)) {
        notify(`A presença de ${playerDisplayName(player)} foi registrada, mas o jogador está na fila de espera. Libere uma vaga antes do check-in.`, 'info');
        return;
      }
    }
    const existingCheckin = data.checkins.find((item) => item.matchId === match.id && item.playerId === player.id);
    if (existingCheckin?.validated) {
      notify('O jogador já possui check-in confirmado.', 'info');
      return;
    }
    if (!window.confirm(`Confirmar manualmente o check-in de ${playerDisplayName(player)}? A geolocalização não será exigida.`)) return;

    setManualCheckinPlayerId(player.id);
    try {
      const entity: Checkin = {
        ...(existingCheckin || {
          id: createId('checkin'),
          organizationId: match.organizationId,
          matchId: match.id,
          playerId: player.id,
        }),
        checkedAt: new Date().toISOString(),
        validated: true,
        source: 'manager',
        registeredByUserId: currentUser.id,
        registeredByName: currentUser.name,
      };
      await saveEntity('checkins', entity, `confirmou manualmente o check-in de ${playerDisplayName(player)}`);

      if (isDrawMatch(match) && hasPersistedDrawLineup
        && !effectiveHomePlayerIds.includes(player.id)
        && !effectiveAwayPlayerIds.includes(player.id)
        && !effectiveWaitingPlayerIds.includes(player.id)) {
        await saveEntity('matches', {
          ...match,
          waitingPlayerIds: [...effectiveWaitingPlayerIds, player.id],
        });
        notify(`Check-in de ${playerDisplayName(player)} registrado sem geolocalização. Como a escalação já estava fechada, o jogador entrou na fila de espera.`);
      } else {
        notify(`Check-in de ${playerDisplayName(player)} registrado sem geolocalização.`);
      }
    } catch {
      notify('Não foi possível registrar o check-in manual.', 'error');
    } finally {
      setManualCheckinPlayerId('');
    }
  };

  const openEventForm = (item?: MatchEvent) => {
    if (match.status === 'finished') {
      notify('Reabra a partida antes de alterar a súmula.', 'error');
      return;
    }
    if (isDrawMatch(match) && match.status === 'scheduled' && !drawLineup?.lineupReady) {
      notify('Aguarde o check-in de pelo menos dois goleiros para formar as equipes.', 'error');
      return;
    }
    setEditingEvent(item || null);
    setEventType(item?.type || 'goal');
    setEventTeam(item?.teamId || home.id);
    setEventPlayer(item?.playerId || '');
    setAssistPlayer(item?.assistPlayerId || '');
    setOwnGoal(Boolean(item?.ownGoal));
    setEventOpen(true);
  };

  const saveMatchEvent = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (match.status === 'finished') {
      notify('Reabra a partida antes de alterar a súmula.', 'error');
      return;
    }
    const form = new FormData(event.currentTarget);
    if (eventPlayer && assistPlayer && eventPlayer === assistPlayer) {
      notify('O autor do gol não pode dar assistência a si mesmo.', 'error');
      return;
    }
    if ((eventType === 'yellow' || eventType === 'red') && !eventPlayer) {
      notify('Informe o jogador que recebeu o cartão.', 'error');
      return;
    }
    const matchEvent: MatchEvent = {
      id: editingEvent?.id || createId('event'),
      type: eventType,
      teamId: eventTeam,
      minute: Number(form.get('minute')),
      ...(eventPlayer ? { playerId: eventPlayer } : {}),
      ...(eventType === 'goal' && !ownGoal && assistPlayer ? { assistPlayerId: assistPlayer } : {}),
      ...(eventType === 'goal' && ownGoal ? { ownGoal: true } : {}),
    };
    const events = editingEvent
      ? match.events.map((item) => item.id === editingEvent.id ? matchEvent : item)
      : [...match.events, matchEvent];
    const score = scoreFromEvents(events, match.homeTeamId, match.awayTeamId);
    await saveEntity('matches', {
      ...match,
      ...drawAssignment,
      ...score,
      events,
      status: match.status === 'scheduled' ? 'live' : match.status,
    }, editingEvent ? 'editou um evento da súmula' : 'adicionou um evento à súmula');
    notify(editingEvent ? 'Evento atualizado.' : 'Evento adicionado à súmula.');
    setEventOpen(false);
  };

  const removeMatchEvent = async (item: MatchEvent) => {
    if (match.status === 'finished') {
      notify('Reabra a partida antes de alterar a súmula.', 'error');
      return;
    }
    if (!window.confirm('Remover este evento da súmula?')) return;
    const events = match.events.filter((event) => event.id !== item.id);
    const score = scoreFromEvents(events, match.homeTeamId, match.awayTeamId);
    await saveEntity('matches', { ...match, ...score, events }, 'removeu um evento da súmula');
    notify('Evento removido.');
  };

  const finalizeMatch = async () => {
    if (isDrawMatch(match) && match.status === 'scheduled' && !drawLineup?.lineupReady) {
      notify('Não é possível finalizar: as equipes ainda precisam de dois goleiros confirmados.', 'error');
      return;
    }
    const score = scoreFromEvents(match.events, match.homeTeamId, match.awayTeamId);
    await saveEntity('matches', { ...match, ...drawAssignment, ...score, status: 'finished' }, 'finalizou a partida');
    notify('Partida finalizada. A súmula foi bloqueada para edição.');
  };

  const reopenMatch = async () => {
    await saveEntity('matches', { ...match, status: 'live' }, 'reabriu a partida');
    notify('Partida reaberta. A súmula pode ser editada novamente.');
  };

  const redrawTeams = async () => {
    if (!isDrawMatch(match) || match.status !== 'scheduled' || !match.selectedPlayerIds?.length) return;
    await saveEntity('matches', {
      ...match,
      drawOrder: shufflePlayerIds(match.selectedPlayerIds),
      drawnAt: new Date().toISOString(),
    }, 'refez o sorteio dos times');
    notify('Distribuição entre os times sorteada novamente. A prioridade da fila foi mantida.');
  };

  const saveTeamIdentity = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isDrawMatch(match)) return;
    const form = new FormData(event.currentTarget);
    await saveEntity('matches', {
      ...match,
      homeTeamName: String(form.get('homeTeamName')).trim() || 'Time Verde',
      awayTeamName: String(form.get('awayTeamName')).trim() || 'Time Preto',
      homeTeamColor: String(form.get('homeTeamColor') || '#b7f52e'),
      awayTeamColor: String(form.get('awayTeamColor') || '#5f7567'),
    }, 'personalizou os times sorteados');
    notify('Nomes e cores dos times atualizados.');
    setTeamIdentityOpen(false);
  };

  const openTeamIdentity = () => {
    setIdentityHomeColor(match.homeTeamColor || '#b7f52e');
    setIdentityAwayColor(match.awayTeamColor || '#5f7567');
    setTeamIdentityOpen(true);
  };

  const eventPlayerTeamId = eventType === 'goal' && ownGoal
    ? eventTeam === home.id ? away.id : home.id
    : eventTeam;
  const playerIdsForTeam = (teamId: string) => (
    isDrawMatch(match)
      ? teamId === match.homeTeamId ? effectiveHomePlayerIds : effectiveAwayPlayerIds
      : data.players.filter((player) => player.teamId === teamId).map((player) => player.id)
  );
  const eventPlayers = data.players.filter((player) => playerIdsForTeam(eventPlayerTeamId).includes(player.id));
  const assistPlayers = data.players.filter((player) => playerIdsForTeam(eventTeam).includes(player.id) && player.id !== eventPlayer);

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
      teamId: isDrawMatch(match)
        ? effectiveHomePlayerIds.includes(activePlayer.id) ? match.homeTeamId : effectiveAwayPlayerIds.includes(activePlayer.id) ? match.awayTeamId : ''
        : activePlayer.teamId,
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
      if (match.status === 'finished') {
        notify('Reabra a partida antes de aprovar estatísticas que alteram a súmula.', 'error');
        return;
      }
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
        const events = [...match.events, ...claimedEvents];
        const score = scoreFromEvents(events, match.homeTeamId, match.awayTeamId);
        await saveEntity('matches', { ...match, ...score, events }, 'aprovou estatísticas enviadas por jogador');
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
          <Badge tone={match.status === 'finished' ? 'neutral' : match.status === 'live' ? 'danger' : 'lime'}>
            {match.status === 'finished' ? 'Partida finalizada' : match.status === 'live' ? 'Partida em andamento' : 'Partida agendada'}
          </Badge>
          <span>{isDrawMatch(match) ? 'Baba com times sorteados' : league?.name || 'Amistoso'}</span>
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
            {isDrawMatch(match) && <Button variant="ghost" icon={Palette} onClick={openTeamIdentity}>Personalizar times</Button>}
            <Button variant="danger" icon={Trash2} onClick={() => setDeleteOpen(true)}>Excluir partida</Button>
            {match.status === 'finished' ? (
              <Button icon={RotateCcw} onClick={reopenMatch}>Reabrir partida</Button>
            ) : (
              <>
                {isDrawMatch(match) && match.status === 'scheduled' && <Button variant="ghost" icon={Shuffle} onClick={redrawTeams}>Refazer distribuição</Button>}
                <Button variant="secondary" icon={Plus} onClick={() => openEventForm()}>Adicionar evento</Button>
                <Button icon={CheckCircle2} onClick={finalizeMatch}>Finalizar partida</Button>
              </>
            )}
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
              const creditedTeam = item.teamId === home.id ? home : item.teamId === away.id ? away : data.teams.find((team) => team.id === item.teamId);
              const eventLabel = item.type === 'goal'
                ? item.ownGoal ? 'Gol contra' : 'Gol'
                : item.type === 'assist'
                  ? 'Assistência'
                  : item.type === 'yellow'
                    ? 'Cartão amarelo'
                    : 'Cartão vermelho';
              const subject = player
                ? playerDisplayName(player)
                : item.type === 'goal'
                  ? 'Autor não informado'
                  : item.type === 'assist'
                    ? 'Assistência sem autor'
                    : 'Jogador não informado';
              return (
                <div className="timeline__item" key={item.id}>
                  <strong>{item.minute ? `${item.minute}'` : '—'}</strong>
                  <span className={`event-icon event-icon--${item.type}`}>{item.type === 'goal' ? <PiSoccerBallFill size={20} color="white" /> : ''}</span> 
                  <div>
                    <p><b>{eventLabel}</b> · {subject}</p>
                    {item.type === 'goal' && (
                      <small>
                        {assist ? `Assistência de ${playerDisplayName(assist)} · ` : ''}
                        Gol para {creditedTeam?.shortName || 'equipe'}
                      </small>
                    )}
                  </div>
                  {canManage && match.status !== 'finished' && (
                    <div className="timeline__actions">
                      <button className="icon-button" type="button" title="Editar evento" aria-label="Editar evento" onClick={() => openEventForm(item)}><Edit3 size={16} /></button>
                      <button className="icon-button timeline__delete" type="button" title="Excluir evento" aria-label="Excluir evento" onClick={() => removeMatchEvent(item)}><Trash2 size={16} /></button>
                    </div>
                  )}
                </div>
              );
            }) : <EmptyState title="Súmula vazia" description="Os eventos registrados durante a partida aparecerão aqui." />}
          </div>
        </section>
        {canManage && <AttendanceManager match={match} />}
        <section className="panel match-rosters">
          <div className="section-header">
            <div><h2>Jogadores e check-in</h2><p>{isDrawMatch(match) ? 'Prioridade por ordem de check-in, com convidados depois dos demais' : 'Presença dos elencos nesta partida'}</p></div>
            <Badge tone="lime">{checkedIn.length} confirmado{checkedIn.length === 1 ? '' : 's'}</Badge>
          </div>
          {canManage && hasPlayersWithoutCheckin && (
            <div className="manual-checkin-notice">
              <CheckCircle2 size={19} />
              <p>
                <strong>Check-in pelo gerenciador</strong>
                <span>Se alguém estiver sem celular ou internet, confirme pela lista. A geolocalização não será exigida e o registro ficará identificado como manual.</span>
              </p>
            </div>
          )}
          {isDrawMatch(match) && match.status === 'scheduled' && !drawLineup?.lineupReady && (
            <div className="draw-lineup-warning">
              <ShieldAlert size={20} />
              <div>
                <strong>Equipes aguardando goleiros</strong>
                <p>{drawLineup?.checkedInGoalkeepers || 0} de 2 goleiros fizeram check-in. A escalação será formada quando houver um goleiro confirmado para cada time.</p>
              </div>
            </div>
          )}
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
                    <div><strong>{team.name}</strong><small>{isDrawMatch(match) ? `${players.length} de ${drawLineup?.maxPlayersPerTeam || match.maxPlayersPerTeam || players.length} vagas` : `${confirmed} de ${players.length} com check-in`}</small></div>
                  </header>
                  <div className="match-roster__players">
                    {players.length ? players.map((player) => {
                      const checkin = data.checkins.find((item) => item.matchId === match.id && item.playerId === player.id);
                      return (
                        <div className="match-roster__player" key={player.id}>
                          <Avatar name={player.name} src={player.photoUrl} size="sm" tone={team.color} />
                          <div>
                            <strong>{playerDisplayName(player)}</strong>
                            <small>{player.membershipType === 'subscriber' ? 'Mensalista · ' : player.membershipType === 'guest' ? 'Convidado · ' : ''}{player.shirtNumber ? `#${player.shirtNumber} · ` : ''}{player.positions.join(', ')}</small>
                          </div>
                          <div className="match-roster__actions">
                            <Badge tone={checkin?.validated ? 'success' : checkin ? 'warning' : 'neutral'} dot>
                              {isDrawMatch(match) && checkin?.validated
                                ? `#${drawLineup?.checkinPositionByPlayerId.get(player.id) || '—'}${checkin.source === 'manager' ? ' · Manual' : ' check-in'}`
                                : checkin?.validated ? checkin.source === 'manager' ? 'Confirmado manualmente' : 'Confirmado' : checkin ? 'Não validado' : 'Sem check-in'}
                            </Badge>
                            {canManage && !checkin?.validated && (
                              <button
                                className="manual-checkin-button"
                                type="button"
                                disabled={manualCheckinPlayerId === player.id}
                                aria-label={`Confirmar check-in de ${playerDisplayName(player)} sem geolocalização`}
                                title="Registrar presença sem exigir geolocalização"
                                onClick={() => registerManualCheckin(player.id)}
                              >
                                <CheckCircle2 size={14} />
                                <span>{manualCheckinPlayerId === player.id ? 'Registrando...' : 'Confirmar check-in'}</span>
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    }) : (
                      <div className="match-roster__empty">{isDrawMatch(match) ? 'Aguardando a fila de check-in e a confirmação dos goleiros.' : 'Nenhum jogador cadastrado nesta equipe.'}</div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
          {isDrawMatch(match) && (
            <div className="draw-waiting-list">
              <header>
                <div><strong>Fila de espera</strong><small>Convidados são posicionados depois dos demais jogadores confirmados.</small></div>
                <Badge tone="neutral">{waitingPlayers.length} aguardando</Badge>
              </header>
              {waitingPlayers.length ? (
                <div>
                  {waitingPlayers.map((player) => {
                    const position = drawLineup?.checkinPositionByPlayerId.get(player.id);
                    const checkin = checkedIn.find((item) => item.playerId === player.id);
                    return (
                      <article key={player.id}>
                        <Avatar name={player.name} src={player.photoUrl} size="sm" />
                        <span>
                          <strong>{playerDisplayName(player)}</strong>
                          <small>{player.membershipType === 'guest' ? 'Convidado · prioridade reduzida · ' : ''}Check-in {checkin?.source === 'manager' ? 'manual ' : ''}#{position || '—'} · {player.positions.join(', ')}</small>
                        </span>
                        <Badge tone={player.membershipType === 'guest' ? 'warning' : 'neutral'}>{checkin?.source === 'manager' ? 'Manual' : player.membershipType === 'guest' ? 'Convidado' : `#${position || '—'}`}</Badge>
                      </article>
                    );
                  })}
                </div>
              ) : <p>Nenhum jogador confirmado está fora das equipes.</p>}
            </div>
          )}
          {isDrawMatch(match) && pendingCheckinPlayers.length > 0 && (
            <div className="draw-waiting-list draw-waiting-list--pending">
              <header>
                <div>
                  <strong>{match.status === 'finished' ? 'Selecionados sem check-in' : 'Aguardando check-in'}</strong>
                  <small>
                    {match.status === 'finished'
                      ? 'Jogadores esperados que não confirmaram presença nesta partida.'
                      : 'Jogadores selecionados para esta partida que ainda precisam confirmar presença.'}
                  </small>
                </div>
                <Badge tone="warning">{pendingCheckinPlayers.length} {match.status === 'finished' ? 'ausente' : 'pendente'}{pendingCheckinPlayers.length === 1 ? '' : 's'}</Badge>
              </header>
              <div>
                {pendingCheckinPlayers.map((player) => {
                  const team = data.teams.find((item) => item.id === player.teamId);
                  const unvalidatedCheckin = data.checkins.find((item) => (
                    item.matchId === match.id && item.playerId === player.id && !item.validated
                  ));
                  return (
                    <article key={player.id}>
                      <Avatar name={player.name} src={player.photoUrl} size="sm" tone={team?.color} />
                      <span>
                        <strong>{playerDisplayName(player)}</strong>
                        <small>
                          {player.membershipType === 'subscriber' ? 'Mensalista' : player.membershipType === 'guest' ? 'Convidado' : 'Sem classificação'}
                          {' · '}{player.positions.join(', ')}{team ? ` · ${team.shortName}` : ''}
                        </small>
                      </span>
                      <div className="draw-waiting-list__actions">
                        <Badge tone={unvalidatedCheckin ? 'warning' : 'neutral'} dot>
                          {unvalidatedCheckin ? 'Não validado' : 'Check-in não realizado'}
                        </Badge>
                        {canManage && (
                          <button
                            className="manual-checkin-button"
                            type="button"
                            disabled={manualCheckinPlayerId === player.id}
                            aria-label={`Confirmar check-in de ${playerDisplayName(player)} sem geolocalização`}
                            title="Registrar presença sem exigir geolocalização"
                            onClick={() => registerManualCheckin(player.id)}
                          >
                            <CheckCircle2 size={14} />
                            <span>{manualCheckinPlayerId === player.id ? 'Registrando...' : 'Confirmar check-in'}</span>
                          </button>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          )}
        </section>
        {canManage && pendingSubmissions.length > 0 && (
          <section className="panel stat-review-panel">
            <div className="section-header">
              <div><h2>Estatísticas enviadas pelos jogadores</h2><p>Confira antes de adicionar à súmula oficial</p></div>
              <Badge tone="warning">{pendingSubmissions.length} pendente{pendingSubmissions.length > 1 ? 's' : ''}</Badge>
            </div>
            {match.status === 'finished' && (
              <div className="form-tip form-tip--warning"><ShieldAlert size={18} /><p><strong>Súmula bloqueada</strong><span>Reabra a partida para aprovar estatísticas. Recusar um envio continua permitido.</span></p></div>
            )}
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
                      <Button icon={Check} disabled={match.status === 'finished'} onClick={() => reviewSubmission(submission, true)}>Aprovar</Button>
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
            <div><span>{isDrawMatch(match) ? <Shuffle size={16} /> : <Trophy size={16} />}</span><p><small>Formato</small><strong>{isDrawMatch(match) ? 'Baba com times sorteados' : league?.name || 'Partida amistosa'}</strong></p></div>
            <div><span><MapPin size={16} /></span><p><small>Local</small><strong>{venue?.name}</strong></p></div>
            <div><span><UsersRound size={16} /></span><p><small>Check-ins validados</small><strong>{checkedIn.length} jogadores</strong></p></div>
          </section>
          {match.requiresGeolocation && <section className="panel geo-status"><span><Radio size={19} /></span><div><strong>Proteção por localização</strong><p>Raio permitido: {venue?.checkinRadius || 0} metros.</p></div></section>}
        </aside>
      </div>

      <Modal
        open={eventOpen}
        onClose={() => setEventOpen(false)}
        title={editingEvent ? 'Editar evento da súmula' : 'Adicionar evento à súmula'}
        description="O placar é calculado automaticamente a partir dos eventos de gol."
      >
        <form className="form" onSubmit={saveMatchEvent}>
          <div className="form-row form-row--3">
            <label>
              <span>Evento</span>
              <select
                name="type"
                value={eventType}
                onChange={(event) => {
                  const nextType = event.target.value as EventType;
                  setEventType(nextType);
                  setEventPlayer('');
                  setAssistPlayer('');
                  if (nextType !== 'goal') setOwnGoal(false);
                }}
              >
                <option value="goal">Gol</option>
                <option value="assist">Assistência</option>
                <option value="yellow">Cartão amarelo</option>
                <option value="red">Cartão vermelho</option>
              </select>
            </label>
            <label>
              <span>{eventType === 'goal' ? 'Equipe beneficiada' : 'Equipe'}</span>
              <select
                name="teamId"
                value={eventTeam}
                onChange={(event) => {
                  setEventTeam(event.target.value);
                  setEventPlayer('');
                  setAssistPlayer('');
                }}
              >
                <option value={home.id}>{home.name}</option>
                <option value={away.id}>{away.name}</option>
              </select>
            </label>
            <label><span>Minuto</span><input name="minute" type="number" min="0" max="150" required placeholder="35" defaultValue={editingEvent?.minute} /></label>
          </div>
          {eventType === 'goal' && (
            <label className="toggle-field">
              <input
                type="checkbox"
                checked={ownGoal}
                onChange={(event) => {
                  setOwnGoal(event.target.checked);
                  setEventPlayer('');
                  setAssistPlayer('');
                }}
              />
              <i />
              <span><strong>Registrar como gol contra</strong><small>O ponto vai para a equipe beneficiada; o autor, se informado, será escolhido na equipe adversária.</small></span>
            </label>
          )}
          <label>
            <span>
              {eventType === 'goal' && ownGoal ? 'Jogador que fez o gol contra' : eventType === 'goal' ? 'Autor do gol' : eventType === 'assist' ? 'Jogador' : 'Jogador que recebeu o cartão'}
              {(eventType === 'goal' || eventType === 'assist') && <small> (opcional)</small>}
            </span>
            <select
              name="playerId"
              required={eventType === 'yellow' || eventType === 'red'}
              value={eventPlayer}
              onChange={(event) => {
                setEventPlayer(event.target.value);
                if (event.target.value === assistPlayer) setAssistPlayer('');
              }}
            >
              <option value="">{eventType === 'yellow' || eventType === 'red' ? 'Selecione o jogador' : 'Não informar'}</option>
              {eventPlayers.map((player) => <option key={player.id} value={player.id}>{player.name}</option>)}
            </select>
          </label>
          {eventType === 'goal' && !ownGoal && (
            <label>
              <span>Assistência <small>(opcional)</small></span>
              <select name="assistPlayerId" value={assistPlayer} onChange={(event) => setAssistPlayer(event.target.value)}>
                <option value="">Sem assistência</option>
                {assistPlayers.map((player) => <option key={player.id} value={player.id}>{player.name}</option>)}
              </select>
            </label>
          )}
          <div className="form-tip"><Trophy size={18} /><p><strong>Placar por eventos</strong><span>Todo gol soma um ponto à equipe beneficiada. Autor e assistência podem ficar sem identificação, mas nunca podem ser a mesma pessoa.</span></p></div>
          <div className="form-tip form-tip--warning"><ShieldAlert size={18} /><p><strong>Regra disciplinar</strong><span>Cartões em partidas de liga serão contabilizados para possíveis suspensões.</span></p></div>
          <div className="form-actions"><Button type="button" variant="ghost" onClick={() => setEventOpen(false)}>Cancelar</Button><Button type="submit">{editingEvent ? 'Salvar alterações' : 'Adicionar à súmula'}</Button></div>
        </form>
      </Modal>

      <Modal open={teamIdentityOpen} onClose={() => setTeamIdentityOpen(false)} title="Personalizar times" description="Use os nomes e as cores dos coletes utilizados nesta partida.">
        <form className="form" onSubmit={saveTeamIdentity}>
          <div className="draw-team-customizer draw-team-customizer--modal">
            <article style={{ '--draw-team-color': identityHomeColor } as CSSProperties}>
              <span className="draw-team-customizer__vest"><FaTshirt aria-hidden="true" /></span>
              <label><span>Primeiro time</span><input name="homeTeamName" required maxLength={32} defaultValue={match.homeTeamName || 'Time Verde'} /></label>
              <label className="draw-team-color"><span>Cor do colete</span><input name="homeTeamColor" type="color" value={identityHomeColor} onChange={(event) => setIdentityHomeColor(event.target.value)} /></label>
            </article>
            <article style={{ '--draw-team-color': identityAwayColor } as CSSProperties}>
              <span className="draw-team-customizer__vest"><FaTshirt aria-hidden="true" /></span>
              <label><span>Segundo time</span><input name="awayTeamName" required maxLength={32} defaultValue={match.awayTeamName || 'Time Preto'} /></label>
              <label className="draw-team-color"><span>Cor do colete</span><input name="awayTeamColor" type="color" value={identityAwayColor} onChange={(event) => setIdentityAwayColor(event.target.value)} /></label>
            </article>
          </div>
          <div className="form-tip"><Palette size={18} /><p><strong>Alteração visual</strong><span>A fila, os jogadores sorteados, o placar e os eventos da súmula não serão modificados.</span></p></div>
          <div className="form-actions"><Button type="button" variant="ghost" onClick={() => setTeamIdentityOpen(false)}>Cancelar</Button><Button type="submit" icon={Palette}>Salvar identidade</Button></div>
        </form>
      </Modal>

      <DangerConfirmModal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Excluir esta partida?"
        description={`${home.name} × ${away.name} em ${formatLongDate(match.startsAt)} será removida definitivamente.`}
        consequences={[
          `${data.matchConfirmations.filter((confirmation) => confirmation.matchId === match.id).length} confirmação${data.matchConfirmations.filter((confirmation) => confirmation.matchId === match.id).length === 1 ? '' : 'ões'} de presença serão excluídas`,
          `${data.checkins.filter((checkin) => checkin.matchId === match.id).length} check-in${data.checkins.filter((checkin) => checkin.matchId === match.id).length === 1 ? '' : 's'} serão excluídos`,
          `${match.events.length} evento${match.events.length === 1 ? '' : 's'} da súmula deixarão de contar no placar e nas estatísticas`,
          `${data.statSubmissions.filter((submission) => submission.matchId === match.id).length} envio${data.statSubmissions.filter((submission) => submission.matchId === match.id).length === 1 ? '' : 's'} de jogadores serão removidos`,
          match.leagueId ? 'Classificação e rankings da liga serão recalculados' : 'As equipes e os jogadores continuarão cadastrados',
        ]}
        onConfirm={async () => {
          await deleteEntityWithDependencies('matches', match.id, 'uma partida');
          navigate('/partidas');
        }}
      />

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
