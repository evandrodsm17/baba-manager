import {
  Check,
  CircleHelp,
  Clock3,
  Copy,
  Settings2,
  ShieldAlert,
  UserCheck,
  X,
} from 'lucide-react';
import { useMemo, useState, type FormEvent } from 'react';
import { useApp } from '../context/AppContext';
import {
  buildConfirmationQueue,
  confirmationDeadlinePassed,
  formatLongDate,
  getMatchEligiblePlayerIds,
  isDrawMatch,
  playerDisplayName,
} from '../lib/utils';
import type { AttendanceStatus, Match, MatchConfirmation, Player } from '../types';
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

  const saveResponse = async (player: Player, status: AttendanceStatus) => {
    if (!canEditResponses || !currentUser) return;
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
    };
    if (enabled) {
      updated.confirmationDeadline = new Date(deadline).toISOString();
      if (isDrawMatch(match)) updated.confirmationLimit = Math.max(1, match.maxPlayersPerTeam || 1) * 2;
    } else {
      delete updated.confirmationDeadline;
      delete updated.confirmationLimit;
    }
    await saveEntity('matches', updated, enabled ? 'ativou a confirmação antecipada' : 'desativou a confirmação antecipada');
    notify(enabled ? 'Configurações de confirmação atualizadas.' : 'Confirmação antecipada desativada para esta partida.');
    setSettingsOpen(false);
  };

  const copyReminder = async () => {
    setCopying(true);
    try {
      const responseCount = queue.eligiblePlayerIds.length - queue.pendingPlayerIds.length;
      const message = [
        `⚽ Confirme sua presença no BABA MANAGER`,
        `Partida: ${formatLongDate(match.startsAt)}`,
        match.confirmationDeadline ? `Prazo: ${formatLongDate(match.confirmationDeadline)}` : '',
        `${responseCount} de ${queue.eligiblePlayerIds.length} jogadores já responderam.`,
        `${window.location.origin}/check-in`,
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
        <Button variant="secondary" icon={Settings2} onClick={() => setSettingsOpen(true)}>Configurar</Button>
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
            return (
              <article className="attendance-player" key={player.id}>
                <Avatar name={player.name} src={player.photoUrl} size="sm" tone={team?.color} />
                <div className="attendance-player__identity">
                  <strong>{playerDisplayName(player)}</strong>
                  <small>{membershipLabel(player)} · {player.positions.join(', ')}{team ? ` · ${team.shortName}` : ''}</small>
                </div>
                <div className="attendance-player__status">{responseBadge(player.id)}</div>
                <div className="attendance-player__actions" aria-label={`Resposta de ${playerDisplayName(player)}`}>
                  <button type="button" className={currentStatus === 'going' ? 'active active--going' : ''} disabled={!canEditResponses || savingPlayerId === player.id} onClick={() => saveResponse(player, 'going')}><Check size={14} />Vou</button>
                  <button type="button" className={currentStatus === 'maybe' ? 'active active--maybe' : ''} disabled={!canEditResponses || savingPlayerId === player.id} onClick={() => saveResponse(player, 'maybe')}><CircleHelp size={14} />Talvez</button>
                  <button type="button" className={currentStatus === 'declined' ? 'active active--declined' : ''} disabled={!canEditResponses || savingPlayerId === player.id} onClick={() => saveResponse(player, 'declined')}><X size={14} />Não vou</button>
                </div>
              </article>
            );
          })}
        </div>
        {!canEditResponses && <p className="attendance-manager__locked">As respostas ficam somente para consulta depois que a partida começa.</p>}
      </section>

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
        <div className="form-actions"><Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button><Button type="submit" icon={Check}>Salvar configurações</Button></div>
      </form>
    </Modal>
  );
}
