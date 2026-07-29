import {
  Check,
  CircleHelp,
  Clock3,
  Copy,
  Settings2,
  ShieldAlert,
  UserCheck,
  UserPlus,
  UsersRound,
  WalletCards,
  X,
} from 'lucide-react';
import { useMemo, useState, type FormEvent } from 'react';
import { useApp } from '../context/AppContext';
import { financialRequirementLabel, getFinancialEligibility, matchReferenceMonth } from '../lib/finance';
import {
  buildConfirmationQueue,
  confirmationDeadlinePassed,
  formatLongDate,
  getMatchEligiblePlayerIds,
  isDrawMatch,
  playerDisplayName,
  shufflePlayerIds,
} from '../lib/utils';
import type { AttendanceStatus, FinancialRequirement, FinancialWaiver, Match, MatchConfirmation, Player } from '../types';
import { Avatar, Badge, Button, Modal } from './UI';

const attendanceLabels: Record<AttendanceStatus, string> = {
  going: 'Vou',
  maybe: 'Talvez',
  declined: 'Não vou',
};

function membershipLabel(player: Player) {
  if (player.membershipType === 'subscriber') return 'Mensalista';
  if (player.membershipType === 'guest') return 'Convidado';
  return 'Sem classificação';
}

function toLocalDateTimeInput(value?: string) {
  if (!value) return '';
  const date = new Date(value);
  const timezoneOffset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - timezoneOffset).toISOString().slice(0, 16);
}

export function AttendanceManager({ match }: { match: Match }) {
  const { data, currentUser, saveEntity, removeEntity, notify } = useApp();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [participantsOpen, setParticipantsOpen] = useState(false);
  const [participantIds, setParticipantIds] = useState<string[]>([]);
  const [waiverDrafts, setWaiverDrafts] = useState<FinancialWaiver[]>([]);
  const [savingPlayerId, setSavingPlayerId] = useState('');
  const [copying, setCopying] = useState(false);
  const eligibleIds = getMatchEligiblePlayerIds(match, data.players);
  const eligiblePlayers = eligibleIds
    .map((playerId) => data.players.find((player) => player.id === playerId))
    .filter((player): player is Player => Boolean(player));
  const queue = useMemo(
    () => buildConfirmationQueue(match, data.players, data.matchConfirmations),
    [match, data.players, data.matchConfirmations],
  );
  const deadlinePassed = confirmationDeadlinePassed(match);
  const canEditResponses = match.status === 'scheduled';
  const organizationPlayers = data.players
    .filter((player) => player.organizationId === match.organizationId && player.status === 'active')
    .sort((a, b) => playerDisplayName(a).localeCompare(playerDisplayName(b), 'pt-BR'));

  const orderedPlayers = useMemo(() => {
    const order = new Map<string, number>();
    [
      queue.confirmedPlayerIds,
      queue.waitingPlayerIds,
      queue.maybePlayerIds,
      queue.pendingPlayerIds,
      queue.declinedPlayerIds,
    ].forEach((group, groupIndex) => group.forEach((playerId, index) => order.set(playerId, groupIndex * 1000 + index)));
    return [...eligiblePlayers].sort((a, b) => (
      (order.get(a.id) ?? 9999) - (order.get(b.id) ?? 9999)
      || playerDisplayName(a).localeCompare(playerDisplayName(b), 'pt-BR')
    ));
  }, [eligiblePlayers, queue]);

  const openParticipants = (replacementForPlayerId?: string) => {
    const selected = match.selectedPlayerIds || [];
    setParticipantIds(replacementForPlayerId
      ? selected.filter((playerId) => playerId !== replacementForPlayerId)
      : [...selected]);
    setWaiverDrafts(data.financialWaivers.filter((waiver) => waiver.matchId === match.id).map((waiver) => ({ ...waiver })));
    setParticipantsOpen(true);
  };

  const grantFinancialWaiver = (player: Player) => {
    if (!currentUser) return;
    const reason = window.prompt(`Justifique a liberação financeira excepcional de ${playerDisplayName(player)}:`);
    if (!reason?.trim()) return;
    const waiver: FinancialWaiver = {
      id: `${match.id}-${player.id}`,
      organizationId: match.organizationId,
      matchId: match.id,
      playerId: player.id,
      reason: reason.trim(),
      grantedAt: new Date().toISOString(),
      grantedByUserId: currentUser.id,
      grantedByName: currentUser.name,
    };
    setWaiverDrafts((current) => [...current.filter((item) => item.playerId !== player.id), waiver]);
    setParticipantIds((current) => current.includes(player.id) ? current : [...current, player.id]);
  };

  const toggleSavedFinancialWaiver = async (player: Player) => {
    if (!currentUser) return;
    const existing = data.financialWaivers.find((waiver) => waiver.matchId === match.id && waiver.playerId === player.id);
    if (existing) {
      if (!window.confirm(`Revogar a liberação financeira de ${playerDisplayName(player)}?`)) return;
      await removeEntity('financialWaivers', existing.id);
      const financialWaiverPlayerIds = (match.financialWaiverPlayerIds || []).filter((playerId) => playerId !== player.id);
      await saveEntity('matches', {
        ...match,
        financialWaiverPlayerIds,
      }, `revogou a liberação financeira de ${playerDisplayName(player)}`);
      notify('Liberação excepcional revogada.', 'info');
      return;
    }
    const reason = window.prompt(`Justifique a liberação financeira excepcional de ${playerDisplayName(player)}:`);
    if (!reason?.trim()) return;
    const waiver: FinancialWaiver = {
      id: `${match.id}-${player.id}`,
      organizationId: match.organizationId,
      matchId: match.id,
      playerId: player.id,
      reason: reason.trim(),
      grantedAt: new Date().toISOString(),
      grantedByUserId: currentUser.id,
      grantedByName: currentUser.name,
    };
    await saveEntity('financialWaivers', waiver);
    const financialWaiverPlayerIds = [...new Set([...(match.financialWaiverPlayerIds || []), player.id])];
    await saveEntity('matches', {
      ...match,
      financialWaiverPlayerIds,
    }, `liberou excepcionalmente a participação financeira de ${playerDisplayName(player)}`);
    notify('Liberação excepcional registrada com justificativa.');
  };

  const saveParticipants = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isDrawMatch(match) || match.status !== 'scheduled') return;
    if (participantIds.length < 2) {
      notify('Selecione pelo menos dois jogadores.', 'error');
      return;
    }
    const selectedPlayers = organizationPlayers.filter((player) => participantIds.includes(player.id));
    const goalkeeperCount = selectedPlayers.filter((player) => (
      player.positions.some((position) => position.toLocaleLowerCase('pt-BR') === 'goleiro')
    )).length;
    if (goalkeeperCount < 2) {
      notify('Mantenha pelo menos dois goleiros convocados, um para cada equipe.', 'error');
      return;
    }
    const waiverPlayerIds = waiverDrafts.map((waiver) => waiver.playerId);
    const draftMatch = { ...match, financialWaiverPlayerIds: waiverPlayerIds };
    const blockedPlayers = selectedPlayers.filter((player) => (
      !getFinancialEligibility(draftMatch, player, data.financialStatuses).eligible
    ));
    if (blockedPlayers.length) {
      notify(`Regularize ou libere excepcionalmente: ${blockedPlayers.map(playerDisplayName).join(', ')}.`, 'error');
      return;
    }

    const previousIds = match.selectedPlayerIds || [];
    const removedIds = previousIds.filter((playerId) => !participantIds.includes(playerId));
    const addedIds = participantIds.filter((playerId) => !previousIds.includes(playerId));
    const dependentCheckins = data.checkins.filter((checkin) => checkin.matchId === match.id && removedIds.includes(checkin.playerId));
    const dependentConfirmations = data.matchConfirmations.filter((confirmation) => confirmation.matchId === match.id && removedIds.includes(confirmation.playerId));
    if (removedIds.length) {
      const removedNames = removedIds
        .map((playerId) => playerDisplayName(data.players.find((player) => player.id === playerId)))
        .join(', ');
      const accepted = window.confirm(
        `Remover ${removedNames} da convocação? ${dependentConfirmations.length} resposta(s) e ${dependentCheckins.length} check-in(s) vinculados serão removidos.`,
      );
      if (!accepted) return;
    }

    const nextWaivers = waiverDrafts.filter((waiver) => participantIds.includes(waiver.playerId));
    await saveEntity('matches', {
      ...match,
      selectedPlayerIds: participantIds,
      drawOrder: [
        ...(match.drawOrder || []).filter((playerId) => participantIds.includes(playerId)),
        ...shufflePlayerIds(addedIds),
      ],
      homePlayerIds: [],
      awayPlayerIds: [],
      waitingPlayerIds: [],
      financialWaiverPlayerIds: nextWaivers.map((waiver) => waiver.playerId),
    }, `atualizou os convocados da partida: ${addedIds.length} adicionado(s) e ${removedIds.length} removido(s)`);
    const previousWaivers = data.financialWaivers.filter((waiver) => waiver.matchId === match.id);
    await Promise.all([
      ...dependentConfirmations.map((confirmation) => removeEntity('matchConfirmations', confirmation.id)),
      ...dependentCheckins.map((checkin) => removeEntity('checkins', checkin.id)),
      ...previousWaivers.filter((waiver) => !nextWaivers.some((item) => item.id === waiver.id)).map((waiver) => removeEntity('financialWaivers', waiver.id)),
      ...nextWaivers.map((waiver) => saveEntity('financialWaivers', waiver)),
    ]);
    notify('Lista de convocados atualizada.');
    setParticipantsOpen(false);
  };

  const saveResponse = async (player: Player, status: AttendanceStatus) => {
    if (!canEditResponses || !currentUser) return;
    const financialEligibility = getFinancialEligibility(match, player, data.financialStatuses);
    if (status === 'going' && !financialEligibility.eligible) {
      notify(`Não é possível confirmar ${playerDisplayName(player)}: ${financialEligibility.reason}.`, 'error');
      return;
    }
    const existing = queue.confirmationByPlayerId.get(player.id);
    const existingCheckin = data.checkins.find((checkin) => (
      checkin.matchId === match.id && checkin.playerId === player.id && checkin.validated
    ));
    if (existingCheckin && status !== 'going') {
      const accepted = window.confirm(
        `${playerDisplayName(player)} já fez check-in. Alterar para "${attendanceLabels[status]}" também removerá esse check-in. Continuar?`,
      );
      if (!accepted) return;
    }

    setSavingPlayerId(player.id);
    try {
      if (existingCheckin && status !== 'going') {
        await removeEntity('checkins', existingCheckin.id);
      }
      const confirmation: MatchConfirmation = {
        id: existing?.id || `${match.id}-${player.id}`,
        organizationId: match.organizationId,
        matchId: match.id,
        playerId: player.id,
        status,
        respondedAt: new Date().toISOString(),
        source: 'manager',
        registeredByUserId: currentUser.id,
        registeredByName: currentUser.name,
      };
      await saveEntity(
        'matchConfirmations',
        confirmation,
        `registrou "${attendanceLabels[status]}" para ${playerDisplayName(player)}`,
      );
      notify(`Resposta de ${playerDisplayName(player)} atualizada para “${attendanceLabels[status]}”.`);
    } catch {
      notify('Não foi possível atualizar a confirmação.', 'error');
    } finally {
      setSavingPlayerId('');
    }
  };

  const saveSettings = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const enabled = form.get('requiresConfirmation') === 'on';
    const financialRequirement = String(form.get('financialRequirement') || 'none') as FinancialRequirement;
    const deadline = String(form.get('confirmationDeadline') || '');
    if (enabled && !deadline) {
      notify('Defina o prazo para confirmação.', 'error');
      return;
    }
    if (enabled && +new Date(deadline) >= +new Date(match.startsAt)) {
      notify('O prazo precisa terminar antes do início da partida.', 'error');
      return;
    }

    const updated: Match = {
      ...match,
      requiresConfirmation: enabled,
      financialRequirement,
    };
    if (enabled) {
      updated.confirmationDeadline = new Date(deadline).toISOString();
      if (isDrawMatch(match)) updated.confirmationLimit = Math.max(1, match.maxPlayersPerTeam || 1) * 2;
    } else {
      delete updated.confirmationDeadline;
      delete updated.confirmationLimit;
    }
    if (financialRequirement !== 'none') {
      updated.financialReferenceMonth = match.financialReferenceMonth || matchReferenceMonth(match.startsAt);
      updated.financialWaiverPlayerIds = match.financialWaiverPlayerIds || [];
    } else {
      delete updated.financialReferenceMonth;
      delete updated.financialWaiverPlayerIds;
    }
    await saveEntity('matches', updated, 'atualizou as regras de confirmação e participação financeira');
    if (financialRequirement === 'none') {
      await Promise.all(
        data.financialWaivers
          .filter((waiver) => waiver.matchId === match.id)
          .map((waiver) => removeEntity('financialWaivers', waiver.id)),
      );
    }
    notify('Configurações da partida atualizadas.');
    setSettingsOpen(false);
  };

  const copyReminder = async () => {
    setCopying(true);
    try {
      const responseCount = queue.eligiblePlayerIds.length - queue.pendingPlayerIds.length;
      const message = [
        `⚽ Confirme sua presença no AdminFut`,
        `Partida: ${formatLongDate(match.startsAt)}`,
        match.confirmationDeadline ? `Prazo: ${formatLongDate(match.confirmationDeadline)}` : '',
        `${responseCount} de ${queue.eligiblePlayerIds.length} jogadores já responderam.`,
        `${window.location.origin}/check-in?matchId=${match.id}`,
      ].filter(Boolean).join('\n');
      await navigator.clipboard.writeText(message);
      notify('Lembrete copiado. Agora é só enviar no grupo do baba.');
    } catch {
      notify('Não foi possível copiar o lembrete neste navegador.', 'error');
    } finally {
      setCopying(false);
    }
  };

  const responseBadge = (playerId: string) => {
    if (queue.confirmedPlayerIds.includes(playerId)) {
      return <Badge tone="success" dot>Confirmado · #{queue.positionByPlayerId.get(playerId)}</Badge>;
    }
    if (queue.waitingPlayerIds.includes(playerId)) {
      return <Badge tone="warning" dot>Fila de espera · #{queue.positionByPlayerId.get(playerId)}</Badge>;
    }
    const status = queue.confirmationByPlayerId.get(playerId)?.status;
    if (status === 'maybe') return <Badge tone="blue" dot>Talvez</Badge>;
    if (status === 'declined') return <Badge tone="danger" dot>Não vai</Badge>;
    return <Badge tone="neutral" dot>Não respondeu</Badge>;
  };

  if (!match.requiresConfirmation) {
    return (
      <section className="panel attendance-manager attendance-manager--disabled">
        <div>
          <span><UserCheck size={21} /></span>
          <div><h2>Confirmação antecipada</h2><p>Ative para saber quem vai jogar antes de abrir o check-in.</p></div>
        </div>
        <div className="attendance-manager__header-actions">
          {isDrawMatch(match) && match.status === 'scheduled' && <Button variant="secondary" icon={UsersRound} onClick={() => openParticipants()}>Editar convocados</Button>}
          <Button variant="secondary" icon={Settings2} onClick={() => setSettingsOpen(true)}>Configurar</Button>
        </div>
        <Modal
          open={participantsOpen}
          onClose={() => setParticipantsOpen(false)}
          title="Editar convocados"
          description="Ative a confirmação antecipada para acompanhar as respostas dos novos convidados."
          size="lg"
        >
          <form className="form" onSubmit={saveParticipants}>
            <div className="participant-editor">
              {organizationPlayers.map((player) => {
                const selected = participantIds.includes(player.id);
                const draftMatch = { ...match, financialWaiverPlayerIds: waiverDrafts.map((item) => item.playerId) };
                const financialEligibility = getFinancialEligibility(draftMatch, player, data.financialStatuses);
                return (
                  <article className={`${selected ? 'selected' : ''} ${!financialEligibility.eligible ? 'financially-blocked' : ''}`} key={player.id}>
                    <label>
                      <input type="checkbox" checked={selected} disabled={!selected && !financialEligibility.eligible} onChange={() => setParticipantIds((current) => current.includes(player.id) ? current.filter((id) => id !== player.id) : [...current, player.id])} />
                      <Avatar name={player.name} src={player.photoUrl} size="sm" />
                      <span><strong>{playerDisplayName(player)}</strong><small>{membershipLabel(player)} · {player.positions.join(', ')}</small></span>
                    </label>
                    <div>
                      {!financialEligibility.eligible
                        ? <button type="button" onClick={() => grantFinancialWaiver(player)}>Liberar com justificativa</button>
                        : <Badge tone={selected ? 'success' : 'neutral'}>{selected ? 'Convocado' : 'Disponível'}</Badge>}
                    </div>
                  </article>
                );
              })}
            </div>
            <div className="form-actions"><Button type="button" variant="ghost" onClick={() => setParticipantsOpen(false)}>Cancelar</Button><Button type="submit" icon={UserPlus}>Salvar convocação</Button></div>
          </form>
        </Modal>
        <SettingsModal match={match} open={settingsOpen} onClose={() => setSettingsOpen(false)} onSubmit={saveSettings} />
      </section>
    );
  }

  return (
    <>
      <section className="panel attendance-manager">
        <div className="section-header attendance-manager__header">
          <div>
            <h2>Confirmação de presença</h2>
            <p>
              {match.confirmationDeadline
                ? `${deadlinePassed ? 'Prazo encerrado' : 'Respostas abertas'} até ${formatLongDate(match.confirmationDeadline)}`
                : 'Respostas abertas'}
            </p>
          </div>
          <div className="attendance-manager__header-actions">
            {isDrawMatch(match) && match.status === 'scheduled' && <Button variant="secondary" icon={UsersRound} onClick={() => openParticipants()}>Editar convocados</Button>}
            <Button variant="ghost" icon={Copy} loading={copying} onClick={copyReminder}>Copiar lembrete</Button>
            <Button variant="secondary" icon={Settings2} onClick={() => setSettingsOpen(true)}>Configurar</Button>
          </div>
        </div>

        <div className="attendance-summary">
          <article><span><Check size={18} /></span><div><strong>{queue.confirmedPlayerIds.length}{queue.capacity ? `/${queue.capacity}` : ''}</strong><small>Com vaga</small></div></article>
          <article><span><Clock3 size={18} /></span><div><strong>{queue.waitingPlayerIds.length}</strong><small>Na fila</small></div></article>
          <article><span><CircleHelp size={18} /></span><div><strong>{queue.maybePlayerIds.length}</strong><small>Talvez</small></div></article>
          <article><span><UserCheck size={18} /></span><div><strong>{queue.pendingPlayerIds.length}</strong><small>Sem resposta</small></div></article>
        </div>

        {isDrawMatch(match) && queue.confirmedGoalkeepers < 2 && (
          <div className="draw-lineup-warning">
            <ShieldAlert size={20} />
            <div>
              <strong>Faltam goleiros confirmados</strong>
              <p>{queue.confirmedGoalkeepers} de 2 goleiros garantiram vaga. Envie um lembrete antes do prazo.</p>
            </div>
          </div>
        )}

        <div className="attendance-list">
          {orderedPlayers.map((player) => {
            const currentStatus = queue.confirmationByPlayerId.get(player.id)?.status;
            const team = data.teams.find((item) => item.id === player.teamId);
            const financialEligibility = getFinancialEligibility(match, player, data.financialStatuses);
            return (
              <article className="attendance-player" key={player.id}>
                <Avatar name={player.name} src={player.photoUrl} size="sm" tone={team?.color} />
                <div className="attendance-player__identity">
                  <strong>{playerDisplayName(player)}</strong>
                  <small>{membershipLabel(player)} · {player.positions.join(', ')}{team ? ` · ${team.shortName}` : ''}</small>
                  {!financialEligibility.eligible && <em><WalletCards size={12} />{financialEligibility.reason}</em>}
                  {financialEligibility.waived && <em className="financial-waived"><WalletCards size={12} />Liberação excepcional</em>}
                </div>
                <div className="attendance-player__status">{responseBadge(player.id)}</div>
                <div className="attendance-player__actions" aria-label={`Resposta de ${playerDisplayName(player)}`}>
                  <button type="button" className={currentStatus === 'going' ? 'active active--going' : ''} disabled={!canEditResponses || savingPlayerId === player.id || !financialEligibility.eligible} onClick={() => saveResponse(player, 'going')}><Check size={14} />Vou</button>
                  <button type="button" className={currentStatus === 'maybe' ? 'active active--maybe' : ''} disabled={!canEditResponses || savingPlayerId === player.id} onClick={() => saveResponse(player, 'maybe')}><CircleHelp size={14} />Talvez</button>
                  <button type="button" className={currentStatus === 'declined' ? 'active active--declined' : ''} disabled={!canEditResponses || savingPlayerId === player.id} onClick={() => saveResponse(player, 'declined')}><X size={14} />Não vou</button>
                </div>
                {canEditResponses && (
                  (isDrawMatch(match) && currentStatus === 'declined')
                  || (financialEligibility.required && (!financialEligibility.eligible || financialEligibility.waived))
                ) && (
                  <div className="attendance-player__secondary-actions">
                    {isDrawMatch(match) && currentStatus === 'declined' && (
                      <button type="button" className="attendance-player__replace" onClick={() => openParticipants(player.id)}><UserPlus size={14} />Convidar substituto</button>
                    )}
                    {financialEligibility.required && (!financialEligibility.eligible || financialEligibility.waived) && (
                      <button type="button" className="attendance-player__waiver" onClick={() => toggleSavedFinancialWaiver(player)}>
                        <WalletCards size={14} />{financialEligibility.waived ? 'Revogar liberação' : 'Liberar participação'}
                      </button>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>
        {!canEditResponses && <p className="attendance-manager__locked">As respostas ficam somente para consulta depois que a partida começa.</p>}
      </section>

      <Modal
        open={participantsOpen}
        onClose={() => setParticipantsOpen(false)}
        title="Editar convocados"
        description="Inclua substitutos ou remova quem não participará. A ordem dos check-ins existentes será preservada."
        size="lg"
      >
        <form className="form" onSubmit={saveParticipants}>
          <div className="participant-editor__summary">
            <span><UsersRound size={19} /><strong>{participantIds.length}</strong> convocados</span>
            <span><UserCheck size={19} /><strong>{Math.max(1, match.maxPlayersPerTeam || 1) * 2}</strong> vagas</span>
            <span><ShieldAlert size={19} /><strong>{organizationPlayers.filter((player) => participantIds.includes(player.id) && player.positions.some((position) => position.toLocaleLowerCase('pt-BR') === 'goleiro')).length}</strong> goleiros</span>
          </div>
          <div className="participant-editor">
            {organizationPlayers.map((player) => {
              const selected = participantIds.includes(player.id);
              const waiver = waiverDrafts.find((item) => item.playerId === player.id);
              const draftMatch = {
                ...match,
                financialWaiverPlayerIds: waiverDrafts.map((item) => item.playerId),
              };
              const financialEligibility = getFinancialEligibility(draftMatch, player, data.financialStatuses);
              const response = queue.confirmationByPlayerId.get(player.id)?.status;
              return (
                <article className={`${selected ? 'selected' : ''} ${!financialEligibility.eligible ? 'financially-blocked' : ''}`} key={player.id}>
                  <label>
                    <input
                      type="checkbox"
                      checked={selected}
                      disabled={!selected && !financialEligibility.eligible}
                      onChange={() => setParticipantIds((current) => current.includes(player.id)
                        ? current.filter((playerId) => playerId !== player.id)
                        : [...current, player.id])}
                    />
                    <Avatar name={player.name} src={player.photoUrl} size="sm" tone={data.teams.find((team) => team.id === player.teamId)?.color} />
                    <span>
                      <strong>{playerDisplayName(player)}</strong>
                      <small>{membershipLabel(player)} · {player.positions.join(', ')}</small>
                      {response && selected && <em>Resposta atual: {attendanceLabels[response]}</em>}
                    </span>
                  </label>
                  <div>
                    {financialEligibility.waived ? (
                      <>
                        <Badge tone="warning">Liberado excepcionalmente</Badge>
                        <button type="button" onClick={() => setWaiverDrafts((current) => current.filter((item) => item.playerId !== player.id))}>Remover liberação</button>
                      </>
                    ) : !financialEligibility.eligible ? (
                      <>
                        <Badge tone="danger">{financialEligibility.reason}</Badge>
                        <button type="button" onClick={() => grantFinancialWaiver(player)}>Liberar com justificativa</button>
                      </>
                    ) : (
                      <Badge tone={selected ? 'success' : 'neutral'}>{selected ? 'Convocado' : 'Disponível'}</Badge>
                    )}
                  </div>
                  {waiver && <p><WalletCards size={13} /> Exceção: {waiver.reason}</p>}
                </article>
              );
            })}
          </div>
          <div className="form-tip">
            <ShieldAlert size={18} />
            <p><strong>Dependências protegidas</strong><span>Ao remover um convocado, respostas e check-ins vinculados serão informados antes da confirmação final.</span></p>
          </div>
          <div className="form-actions"><Button type="button" variant="ghost" onClick={() => setParticipantsOpen(false)}>Cancelar</Button><Button type="submit" icon={UserPlus}>Salvar convocação</Button></div>
        </form>
      </Modal>

      <SettingsModal match={match} open={settingsOpen} onClose={() => setSettingsOpen(false)} onSubmit={saveSettings} />
    </>
  );
}

function SettingsModal({
  match,
  open,
  onClose,
  onSubmit,
}: {
  match: Match;
  open: boolean;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const [enabled, setEnabled] = useState(Boolean(match.requiresConfirmation));
  const [financialRequirement, setFinancialRequirement] = useState<FinancialRequirement>(match.financialRequirement || 'none');
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Configurar confirmações"
      description="Defina o prazo da convocação. O limite do sorteio acompanha o máximo de jogadores por equipe."
    >
      <form className="form" onSubmit={onSubmit}>
        <label className="toggle-field">
          <input name="requiresConfirmation" type="checkbox" checked={enabled} onChange={(event) => setEnabled(event.target.checked)} />
          <i />
          <span><strong>Solicitar confirmação antecipada</strong><small>Desativar não apaga as respostas que já foram registradas.</small></span>
        </label>
        {enabled && (
          <label>
            <span>Prazo para responder</span>
            <input
              name="confirmationDeadline"
              type="datetime-local"
              required
              max={toLocalDateTimeInput(match.startsAt)}
              defaultValue={toLocalDateTimeInput(match.confirmationDeadline)}
            />
          </label>
        )}
        {enabled && isDrawMatch(match) && (
          <div className="form-tip">
            <UserCheck size={18} />
            <p><strong>{Math.max(1, match.maxPlayersPerTeam || 1) * 2} vagas disponíveis</strong><span>Quem exceder esse limite será promovido automaticamente quando alguém desistir.</span></p>
          </div>
        )}
        <div className={`financial-match-config ${financialRequirement !== 'none' ? 'financial-match-config--active' : ''}`}>
          <label>
            <span>Regra financeira</span>
            <select name="financialRequirement" value={financialRequirement} onChange={(event) => setFinancialRequirement(event.target.value as FinancialRequirement)}>
              <option value="none">Não exigir situação financeira</option>
              <option value="no_overdue">Sem mensalidade vencida</option>
              <option value="match_month_paid">Competência da partida paga</option>
            </select>
          </label>
          <p><strong>{financialRequirementLabel(financialRequirement)}</strong><small>A regra vale para mensalistas e será verificada ao confirmar presença e no check-in.</small></p>
        </div>
        <div className="form-actions"><Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button><Button type="submit" icon={Check}>Salvar configurações</Button></div>
      </form>
    </Modal>
  );
}
