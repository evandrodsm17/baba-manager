import {
  Check,
  CheckCircle2,
  CircleHelp,
  Clock3,
  Hourglass,
  LocateFixed,
  MapPin,
  Navigation,
  Radio,
  ShieldCheck,
  Smartphone,
  UserCheck,
  Wifi,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { MatchCard } from '../components/MatchCard';
import { Badge, Button, EmptyState, PageHeader, SuccessSeal } from '../components/UI';
import { createId, useApp } from '../context/AppContext';
import { getFinancialEligibility } from '../lib/finance';
import {
  buildConfirmationQueue,
  buildDrawLineup,
  confirmationDeadlinePassed,
  formatLongDate,
  getCheckinWindow,
  getMatchTeams,
  haversineDistance,
  isDrawMatch,
  matchIncludesPlayer,
} from '../lib/utils';
import { useSearchParams } from '../lib/router';
import type { AttendanceStatus, Checkin, MatchConfirmation } from '../types';

type CheckinState = 'idle' | 'locating' | 'success' | 'outside' | 'error';

export function CheckinPage() {
  const { data, currentUser, saveEntity, notify, isDemo } = useApp();
  const [searchParams] = useSearchParams();
  const [state, setState] = useState<CheckinState>('idle');
  const [distance, setDistance] = useState<number>();
  const [responding, setResponding] = useState<AttendanceStatus>();
  const player = data.players.find((item) => item.id === currentUser?.playerId);
  const eligibleMatches = data.matches
    .filter((match) => match.status !== 'finished' && matchIncludesPlayer(match, player))
    .sort((a, b) => +new Date(a.startsAt) - +new Date(b.startsAt));
  const requestedMatchId = searchParams.get('matchId');
  const nextMatch = eligibleMatches.find((match) => match.id === requestedMatchId) || eligibleMatches[0];
  const venue = data.venues.find((item) => item.id === nextMatch?.venueId);
  const existing = data.checkins.find((item) => item.matchId === nextMatch?.id && item.playerId === player?.id && item.validated);
  const drawLineup = nextMatch && isDrawMatch(nextMatch)
    ? buildDrawLineup(nextMatch, data.players, data.checkins, data.matchConfirmations)
    : null;
  const drawTeams = nextMatch && drawLineup ? getMatchTeams(nextMatch, data.teams) : null;
  const confirmationQueue = nextMatch
    ? buildConfirmationQueue(nextMatch, data.players, data.matchConfirmations)
    : null;
  const confirmation = player
    ? confirmationQueue?.confirmationByPlayerId.get(player.id)
    : undefined;
  const hasConfirmedSpot = Boolean(player && confirmationQueue?.confirmedPlayerIds.includes(player.id));
  const isConfirmationWaitlisted = Boolean(player && confirmationQueue?.waitingPlayerIds.includes(player.id));
  const deadlinePassed = nextMatch ? confirmationDeadlinePassed(nextMatch) : false;
  const confirmationAllowsCheckin = !nextMatch?.requiresConfirmation || hasConfirmedSpot;
  const financialEligibility = nextMatch && player
    ? getFinancialEligibility(nextMatch, player, data.financialStatuses)
    : { required: false, eligible: true, waived: false };
  const checkinAllowed = confirmationAllowsCheckin && financialEligibility.eligible;
  const checkinWindow = nextMatch ? getCheckinWindow(nextMatch) : null;

  const saveAttendance = async (status: AttendanceStatus) => {
    if (!nextMatch || !player || !currentUser || !nextMatch.requiresConfirmation) return;
    if (existing) {
      notify('Sua presença já foi validada. Fale com o gerenciador se precisar cancelar.', 'info');
      return;
    }
    if (status === 'going' && !financialEligibility.eligible) {
      notify(`Não é possível confirmar presença: ${financialEligibility.reason}.`, 'error');
      return;
    }
    if (deadlinePassed || nextMatch.status !== 'scheduled') {
      notify('O prazo de confirmação foi encerrado. Fale com o gerenciador.', 'error');
      return;
    }
    setResponding(status);
    try {
      const entity: MatchConfirmation = {
        id: confirmation?.id || `${nextMatch.id}-${player.id}`,
        organizationId: nextMatch.organizationId,
        matchId: nextMatch.id,
        playerId: player.id,
        status,
        respondedAt: new Date().toISOString(),
        source: 'player',
        registeredByUserId: currentUser.id,
        registeredByName: currentUser.name,
      };
      await saveEntity('matchConfirmations', entity, `respondeu "${status === 'going' ? 'Vou' : status === 'maybe' ? 'Talvez' : 'Não vou'}" à convocação`);
      const nextQueue = buildConfirmationQueue(
        nextMatch,
        data.players,
        [...data.matchConfirmations.filter((item) => item.id !== entity.id), entity],
      );
      setState('idle');
      if (status === 'going' && nextQueue.waitingPlayerIds.includes(player.id)) {
        notify('Resposta registrada. Você entrou na fila de espera e será promovido se surgir uma vaga.', 'info');
      } else if (status === 'going') {
        notify('Presença confirmada! Sua vaga está garantida.');
      } else {
        notify(status === 'maybe' ? 'Resposta “Talvez” registrada.' : 'Ausência informada ao gerenciador.', 'info');
      }
    } catch {
      notify('Não foi possível registrar sua resposta.', 'error');
    } finally {
      setResponding(undefined);
    }
  };

  const persistCheckin = async (latitude?: number, longitude?: number, measuredDistance?: number) => {
    if (!nextMatch || !player) return;
    if (!getCheckinWindow(nextMatch).isOpen) {
      notify('O check-in está fora da janela permitida para esta partida.', 'error');
      return;
    }
    const entity: Checkin = {
      id: createId('checkin'),
      organizationId: player.organizationId,
      matchId: nextMatch.id,
      playerId: player.id,
      checkedAt: new Date().toISOString(),
      source: 'player',
      registeredByUserId: currentUser?.id,
      registeredByName: currentUser?.name,
      latitude,
      longitude,
      distanceMeters: measuredDistance,
      validated: true,
    };
    await saveEntity('checkins', entity, 'realizou check-in');
    setDistance(measuredDistance);
    setState('success');
    notify('Presença confirmada. Bom jogo!');
  };

  const checkin = async (simulate = false) => {
    if (!nextMatch || !venue || !player) return;
    if (existing) {
      setState('success');
      return;
    }
    if (!checkinAllowed) {
      notify(
        !financialEligibility.eligible
          ? `Check-in bloqueado: ${financialEligibility.reason}.`
          : isConfirmationWaitlisted
          ? 'Você ainda está na fila de espera. Aguarde a liberação de uma vaga.'
          : 'Confirme “Vou” e garanta uma vaga antes de fazer check-in.',
        'error',
      );
      return;
    }
    if (!checkinWindow?.isOpen) {
      notify(
        checkinWindow?.isTooEarly
          ? `O check-in abre ${checkinWindow.opensMinutesBefore} minutos antes da partida.`
          : `O check-in encerrou ${checkinWindow?.closesMinutesAfter || 0} minutos após o horário da partida.`,
        'error',
      );
      return;
    }
    if (!nextMatch.requiresGeolocation) {
      await persistCheckin();
      return;
    }
    setState('locating');
    if (simulate) {
      await new Promise((resolve) => window.setTimeout(resolve, 850));
      await persistCheckin(venue.latitude, venue.longitude, 18);
      return;
    }
    if (!navigator.geolocation) {
      setState('error');
      return;
    }
    navigator.geolocation.getCurrentPosition(async (position) => {
      const measured = haversineDistance(
        position.coords.latitude,
        position.coords.longitude,
        venue.latitude,
        venue.longitude,
      );
      setDistance(measured);
      if (measured > venue.checkinRadius) {
        setState('outside');
        return;
      }
      await persistCheckin(position.coords.latitude, position.coords.longitude, measured);
    }, () => setState('error'), { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 });
  };

  if (!nextMatch || !venue || !player) {
    return (
      <>
        <PageHeader eyebrow="PRESENÇA" title="Check-in" description="Confirme sua chegada às próximas partidas." />
        <EmptyState title="Nenhuma partida disponível" description="Assim que seu gerenciador agendar um jogo da sua equipe, o check-in aparecerá aqui." />
      </>
    );
  }

  const successful = state === 'success' || Boolean(existing);
  const drawTeamName = player && drawLineup?.homePlayerIds.includes(player.id)
    ? drawTeams?.[0]?.name
    : player && drawLineup?.awayPlayerIds.includes(player.id)
      ? drawTeams?.[1]?.name
      : undefined;
  const waitingForDraw = Boolean(player && drawLineup?.waitingPlayerIds.includes(player.id));
  const checkinPosition = player ? drawLineup?.checkinPositionByPlayerId.get(player.id) : undefined;
  const confirmationPosition = player ? confirmationQueue?.positionByPlayerId.get(player.id) : undefined;
  const confirmationLocked = deadlinePassed || nextMatch.status !== 'scheduled' || Boolean(existing);

  return (
    <>
      <PageHeader eyebrow="PRESENÇA" title="Sua participação" description="Responda à convocação e, no dia do jogo, confirme que chegou ao local." />
      {nextMatch.requiresConfirmation && (
        <section className="attendance-response-card">
          <div className="attendance-response-card__copy">
            <span className="attendance-response-card__icon"><UserCheck size={23} /></span>
            <div>
              <span className="eyebrow">CONVOCAÇÃO</span>
              <h2>Você vai jogar?</h2>
              <p>
                {nextMatch.confirmationDeadline
                  ? `${deadlinePassed ? 'O prazo terminou em' : 'Responda até'} ${formatLongDate(nextMatch.confirmationDeadline)}.`
                  : 'Informe sua disponibilidade para ajudar na organização.'}
              </p>
            </div>
          </div>
          <div className="attendance-response-card__status">
            {hasConfirmedSpot ? (
              <Badge tone="success" dot>Vaga confirmada{confirmationPosition ? ` · #${confirmationPosition}` : ''}</Badge>
            ) : isConfirmationWaitlisted ? (
              <Badge tone="warning" dot>Fila de espera{confirmationPosition ? ` · #${confirmationPosition}` : ''}</Badge>
            ) : confirmation?.status === 'maybe' ? (
              <Badge tone="blue" dot>Você respondeu “Talvez”</Badge>
            ) : confirmation?.status === 'declined' ? (
              <Badge tone="danger" dot>Você informou que não vai</Badge>
            ) : (
              <Badge tone="neutral" dot>Resposta pendente</Badge>
            )}
            {isConfirmationWaitlisted && <small>Você será promovido automaticamente quando uma vaga for liberada.</small>}
          </div>
          <div className="attendance-response-actions">
            <button
              type="button"
              className={confirmation?.status === 'going' ? 'active active--going' : ''}
              disabled={confirmationLocked || Boolean(responding) || !financialEligibility.eligible}
              onClick={() => saveAttendance('going')}
            >
              <Check size={18} /><span><strong>Vou</strong><small>Quero uma vaga</small></span>
            </button>
            <button
              type="button"
              className={confirmation?.status === 'maybe' ? 'active active--maybe' : ''}
              disabled={confirmationLocked || Boolean(responding)}
              onClick={() => saveAttendance('maybe')}
            >
              <CircleHelp size={18} /><span><strong>Talvez</strong><small>Ainda não sei</small></span>
            </button>
            <button
              type="button"
              className={confirmation?.status === 'declined' ? 'active active--declined' : ''}
              disabled={confirmationLocked || Boolean(responding)}
              onClick={() => saveAttendance('declined')}
            >
              <X size={18} /><span><strong>Não vou</strong><small>Liberar minha vaga</small></span>
            </button>
          </div>
          {!financialEligibility.eligible && (
            <p className="attendance-response-card__financial">
              <ShieldCheck size={15} /> Presença bloqueada: {financialEligibility.reason}. Procure o gerenciador.
            </p>
          )}
          {confirmationLocked && !existing && <p className="attendance-response-card__locked"><Clock3 size={15} /> O prazo terminou. O gerenciador ainda pode atualizar sua resposta.</p>}
        </section>
      )}
      <div className="checkin-layout">
        <section className="checkin-card">
          <div className="checkin-card__visual">
            <div className="checkin-radar">
              <i /><i /><i />
              <span className={successful ? 'success' : ''}>{successful ? <CheckCircle2 size={30} /> : <LocateFixed size={30} />}</span>
            </div>
          </div>
          <div className="checkin-card__content">
            {successful ? (
              <div className="checkin-success">
                <SuccessSeal />
                <span className="eyebrow">PRESENÇA CONFIRMADA</span>
                <h2>{drawLineup ? drawTeamName ? `Você está no ${drawTeamName}!` : waitingForDraw ? 'Você está na fila de espera' : 'Aguardando os goleiros' : 'Você está no jogo!'}</h2>
                <p>
                  {drawLineup
                    ? drawTeamName
                      ? `Seu check-in foi o ${checkinPosition || '—'}º. Você entrou na primeira formação.`
                      : waitingForDraw
                        ? player.membershipType === 'guest'
                          ? 'Como convidado, você entra depois dos demais jogadores confirmados e ocupa uma vaga disponível.'
                          : `Seu check-in foi o ${checkinPosition || '—'}º. Você será chamado quando surgir uma vaga.`
                        : `A escalação será formada quando dois goleiros fizerem check-in. Sua posição atual é ${checkinPosition || '—'}ª.`
                    : `Seu check-in foi validado${distance ? ` a ${Math.round(distance)} metros do ponto central` : ''}.`}
                </p>
                <Badge tone={drawTeamName ? 'success' : 'warning'}><ShieldCheck size={14} /> {drawTeamName || (waitingForDraw ? 'Fila de espera' : 'Presença registrada')}</Badge>
              </div>
            ) : !financialEligibility.eligible ? (
              <div className="checkin-message checkin-message--error">
                <span><ShieldCheck size={25} /></span>
                <h2>Participação bloqueada</h2>
                <p>{financialEligibility.reason}. Regularize a situação ou solicite uma liberação excepcional ao gerenciador.</p>
                <Badge tone="danger">Mensalidade pendente</Badge>
              </div>
            ) : !confirmationAllowsCheckin ? (
              <div className="checkin-message">
                <span><Hourglass size={25} /></span>
                <h2>{isConfirmationWaitlisted ? 'Aguardando uma vaga' : 'Confirme sua participação'}</h2>
                <p>
                  {isConfirmationWaitlisted
                    ? 'Seu nome está na fila de espera. Quando alguém desistir, sua vaga será liberada automaticamente.'
                    : 'O check-in será liberado depois que você responder “Vou” e estiver dentro do limite de vagas.'}
                </p>
                <Badge tone={isConfirmationWaitlisted ? 'warning' : 'neutral'}>
                  {isConfirmationWaitlisted ? `Posição geral #${confirmationPosition || '—'}` : 'Check-in bloqueado'}
                </Badge>
              </div>
            ) : !checkinWindow?.isOpen ? (
              <div className="checkin-message">
                <span><Clock3 size={25} /></span>
                <h2>{checkinWindow?.isTooEarly ? 'Check-in ainda não abriu' : 'Janela de check-in encerrada'}</h2>
                <p>
                  {checkinWindow?.isTooEarly
                    ? `Você poderá confirmar sua chegada a partir de ${formatLongDate(checkinWindow.opensAt.toISOString())}.`
                    : `O limite para esta partida foi ${formatLongDate(checkinWindow?.closesAt.toISOString() || nextMatch.startsAt)}.`}
                </p>
                <Badge tone={checkinWindow?.isTooEarly ? 'blue' : 'danger'}>
                  {checkinWindow?.opensMinutesBefore || 0} min antes · {checkinWindow?.closesMinutesAfter || 0} min depois
                </Badge>
              </div>
            ) : state === 'outside' ? (
              <div className="checkin-message checkin-message--error">
                <span><Navigation size={25} /></span><h2>Você está fora do raio</h2>
                <p>Sua distância é de aproximadamente <strong>{Math.round(distance || 0)} m</strong>. Aproxime-se do local e tente novamente.</p>
                <Button onClick={() => checkin()} icon={LocateFixed}>Tentar novamente</Button>
              </div>
            ) : state === 'error' ? (
              <div className="checkin-message checkin-message--error">
                <span><Smartphone size={25} /></span><h2>Localização indisponível</h2>
                <p>Ative a permissão de localização do navegador e tente novamente.</p>
                <Button onClick={() => checkin()} icon={LocateFixed}>Tentar novamente</Button>
              </div>
            ) : (
              <div className="checkin-message">
                <span className="eyebrow"><Radio size={14} /> VALIDAÇÃO SEGURA</span>
                <h2>{state === 'locating' ? 'Localizando você...' : 'Confirme sua chegada'}</h2>
                <p>{state === 'locating' ? 'Aguarde enquanto obtemos a posição mais precisa do seu celular.' : `Você precisa estar a até ${venue.checkinRadius} metros do local da partida.`}</p>
                <Button loading={state === 'locating'} onClick={() => checkin()} icon={LocateFixed}>Usar minha localização</Button>
                {isDemo && state !== 'locating' && <button className="demo-location" type="button" onClick={() => checkin(true)}>Simular presença no local</button>}
              </div>
            )}
          </div>
        </section>

        <aside className="checkin-aside">
          <MatchCard match={nextMatch} teams={data.teams} venues={data.venues} compact />
          <section className="panel checkin-info">
            <h3>Detalhes do check-in</h3>
            <div><span><MapPin size={17} /></span><p><small>Local</small><strong>{venue.name}</strong></p></div>
            <div><span><Clock3 size={17} /></span><p><small>Início</small><strong>{formatLongDate(nextMatch.startsAt)}</strong></p></div>
            <div><span><Hourglass size={17} /></span><p><small>Janela permitida</small><strong>{checkinWindow?.opensMinutesBefore || 0} min antes · {checkinWindow?.closesMinutesAfter || 0} min depois</strong></p></div>
            {nextMatch.requiresConfirmation && <div><span><UserCheck size={17} /></span><p><small>Sua convocação</small><strong>{hasConfirmedSpot ? 'Vaga confirmada' : isConfirmationWaitlisted ? 'Fila de espera' : confirmation?.status === 'maybe' ? 'Talvez' : confirmation?.status === 'declined' ? 'Não vai' : 'Pendente'}</strong></p></div>}
            <div><span><Wifi size={17} /></span><p><small>Raio autorizado</small><strong>{venue.checkinRadius} metros</strong></p></div>
          </section>
          <p className="privacy-note"><ShieldCheck size={15} /> Sua localização é usada somente para validar este check-in.</p>
        </aside>
      </div>
    </>
  );
}
