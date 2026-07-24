import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  MapPin,
  Plus,
  Radio,
  ShieldAlert,
  Trophy,
  UsersRound,
} from 'lucide-react';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { MatchCard } from '../components/MatchCard';
import { Badge, Button, EmptyState, Modal, PageHeader, TeamMark } from '../components/UI';
import { createId, useApp } from '../context/AppContext';
import { formatLongDate, playerDisplayName } from '../lib/utils';
import { useNavigate, useParams, useSearchParams } from '../lib/router';
import type { EventType, Match, MatchEvent } from '../types';

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
  const orgId = currentUser?.organizationId;
  const canManage = currentUser?.role === 'manager';
  const teams = data.teams.filter((team) => team.organizationId === orgId);
  const matches = useMemo(() => data.matches
    .filter((match) => match.organizationId === orgId)
    .filter((match) => status === 'all' || match.status === status)
    .sort((a, b) => status === 'finished' ? +new Date(b.startsAt) - +new Date(a.startsAt) : +new Date(a.startsAt) - +new Date(b.startsAt)), [data.matches, orgId, status]);

  useEffect(() => {
    if (searchParams.get('nova') === '1' && canManage) setModalOpen(true);
  }, [searchParams, canManage]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const homeTeamId = String(form.get('homeTeamId'));
    const awayTeamId = String(form.get('awayTeamId'));
    if (homeTeamId === awayTeamId) {
      notify('Escolha duas equipes diferentes.', 'error');
      return;
    }
    const venue = data.venues.find((item) => item.id === form.get('venueId'));
    const entity: Match = {
      id: createId('match'),
      organizationId: orgId || '',
      leagueId: String(form.get('leagueId') || '') || undefined,
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
    notify('Partida agendada com sucesso.');
    setModalOpen(false);
  };

  return (
    <>
      <PageHeader
        eyebrow="CALENDÁRIO"
        title="Partidas"
        description={canManage ? 'Agende confrontos, registre placares e todos os eventos do jogo.' : 'Acompanhe sua agenda e os resultados da competição.'}
        action={canManage ? <Button icon={Plus} onClick={() => setModalOpen(true)}>Nova partida</Button> : undefined}
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
        <EmptyState title="Nenhuma partida nesta lista" description="Agende um novo confronto ou altere o filtro." action={canManage ? <Button icon={Plus} onClick={() => setModalOpen(true)}>Agendar partida</Button> : undefined} />
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Agendar partida" description="Defina o confronto, o campeonato e as regras de check-in." size="lg">
        <form className="form" onSubmit={submit}>
          <div className="versus-form">
            <label><span>Mandante</span><select name="homeTeamId" required defaultValue=""><option value="">Selecione a equipe</option>{teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}</select></label>
            <b>VS</b>
            <label><span>Visitante</span><select name="awayTeamId" required defaultValue=""><option value="">Selecione a equipe</option>{teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}</select></label>
          </div>
          <div className="form-row form-row--2">
            <label><span>Data e horário</span><input name="startsAt" type="datetime-local" required /></label>
            <label><span>Local</span><select name="venueId" required defaultValue=""><option value="">Selecione o campo</option>{data.venues.filter((venue) => venue.organizationId === orgId).map((venue) => <option key={venue.id} value={venue.id}>{venue.name}</option>)}</select></label>
          </div>
          <label><span>Liga ou competição <small>(opcional)</small></span><select name="leagueId" defaultValue=""><option value="">Amistoso — não contabiliza estatísticas de liga</option>{data.leagues.filter((league) => league.organizationId === orgId && league.status === 'active').map((league) => <option key={league.id} value={league.id}>{league.name} · {league.season}</option>)}</select></label>
          <label className="toggle-field"><input type="checkbox" name="requiresGeolocation" /><i /><span><strong>Exigir geolocalização no check-in</strong><small>O jogador deverá estar dentro do raio definido no local.</small></span></label>
          <label><span>Observações <small>(opcional)</small></span><textarea name="notes" rows={3} placeholder="Informações adicionais para os jogadores..." /></label>
          <div className="form-actions"><Button type="button" variant="ghost" onClick={() => setModalOpen(false)}>Cancelar</Button><Button type="submit" icon={CalendarDays}>Agendar partida</Button></div>
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
  const [eventTeam, setEventTeam] = useState('');
  const canManage = currentUser?.role === 'manager';

  if (!match) return <EmptyState title="Partida não encontrada" description="Este confronto não existe ou você não possui acesso." action={<Button onClick={() => navigate('/partidas')}>Voltar</Button>} />;
  const home = data.teams.find((team) => team.id === match.homeTeamId);
  const away = data.teams.find((team) => team.id === match.awayTeamId);
  const venue = data.venues.find((item) => item.id === match.venueId);
  const league = data.leagues.find((item) => item.id === match.leagueId);
  const checkedIn = data.checkins.filter((checkin) => checkin.matchId === match.id && checkin.validated);
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
                    <p><b>{item.type === 'goal' ? 'Gol' : item.type === 'yellow' ? 'Cartão amarelo' : 'Cartão vermelho'}</b> · {playerDisplayName(player)}</p>
                    {assist && <small>Assistência de {playerDisplayName(assist)}</small>}
                  </div>
                </div>
              );
            }) : <EmptyState title="Súmula vazia" description="Os eventos registrados durante a partida aparecerão aqui." />}
          </div>
        </section>
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
    </>
  );
}
