import { Filter, MoreHorizontal, Plus, Search, Shirt, Trash2, UserRound, UsersRound } from 'lucide-react';
import { useMemo, useState, type FormEvent } from 'react';
import { DangerConfirmModal } from '../components/DangerConfirmModal';
import { Avatar, Badge, Button, EmptyState, Modal, PageHeader, TeamMark } from '../components/UI';
import { createId, useApp } from '../context/AppContext';
import { getPlayerStats } from '../lib/utils';
import type { Player } from '../types';

const positions = ['Goleiro', 'Zagueiro', 'Lateral', 'Volante', 'Meia', 'Atacante'];

export function Players() {
  const { data, currentUser, saveEntity, deleteEntityWithDependencies, notify } = useApp();
  const canManage = currentUser?.role === 'manager';
  const orgId = currentUser?.organizationId;
  const [search, setSearch] = useState('');
  const [teamFilter, setTeamFilter] = useState('all');
  const [membershipFilter, setMembershipFilter] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Player | null>(null);
  const [deleting, setDeleting] = useState<Player | null>(null);
  const stats = useMemo(() => getPlayerStats(data.players, data.matches), [data.players, data.matches]);
  const players = stats
    .filter((player) => player.organizationId === orgId)
    .filter((player) => teamFilter === 'all' || player.teamId === teamFilter)
    .filter((player) => membershipFilter === 'all' || (membershipFilter === 'unclassified' ? !player.membershipType : player.membershipType === membershipFilter))
    .filter((player) => `${player.name} ${player.nickname || ''}`.toLowerCase().includes(search.toLowerCase()));
  const teams = data.teams.filter((team) => team.organizationId === orgId);

  const openForm = (player?: Player) => {
    setEditing(player || null);
    setModalOpen(true);
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const selectedPositions = form.getAll('positions').map(String);
    const teamId = String(form.get('teamId') || '');
    const selectedTeam = teams.find((team) => team.id === teamId);
    const organization = data.organizations.find((item) => item.id === orgId);
    const entity: Player = {
      id: editing?.id || createId('player'),
      organizationId: orgId || '',
      organizationName: organization?.name,
      teamId,
      teamName: selectedTeam?.name,
      name: String(form.get('name') || '').trim(),
      nickname: String(form.get('nickname') || '').trim() || undefined,
      email: String(form.get('email') || '').trim().toLowerCase() || undefined,
      photoUrl: String(form.get('photoUrl') || '').trim() || undefined,
      positions: selectedPositions.length ? selectedPositions : ['Atacante'],
      shirtNumber: Number(form.get('shirtNumber')) || undefined,
      membershipType: (String(form.get('membershipType') || '') || undefined) as Player['membershipType'],
      status: String(form.get('status') || 'active') as Player['status'],
    };
    await saveEntity('players', entity, editing ? 'atualizou um jogador' : 'adicionou um jogador');
    notify(editing ? 'Jogador atualizado.' : 'Jogador adicionado ao elenco.');
    setModalOpen(false);
  };

  return (
    <>
      <PageHeader
        eyebrow={canManage ? 'ELENCOS' : 'ATLETAS DA LIGA'}
        title="Jogadores"
        description={canManage ? 'Cadastre atletas, posições e, se desejar, diferencie mensalistas e convidados.' : 'Confira os atletas e os destaques da temporada.'}
        action={canManage ? <Button icon={Plus} onClick={() => openForm()}>Novo jogador</Button> : undefined}
      />
      <div className="toolbar">
        <label className="toolbar__search"><Search size={17} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por nome ou apelido..." /></label>
        <label className="toolbar__select"><Filter size={16} /><select value={teamFilter} onChange={(event) => setTeamFilter(event.target.value)}><option value="all">Todas as equipes</option>{teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}</select></label>
        <label className="toolbar__select"><UsersRound size={16} /><select value={membershipFilter} onChange={(event) => setMembershipFilter(event.target.value)}><option value="all">Todos os vínculos</option><option value="subscriber">Mensalistas</option><option value="guest">Convidados</option><option value="unclassified">Não informado</option></select></label>
      </div>

      {players.length ? (
        <div className="panel table-panel">
          <div className="players-table table-scroll">
            <div className="table-head">
              <span>Jogador</span><span>Equipe</span><span>Posição</span><span>Nº</span><span>G</span><span>A</span><span>Situação</span><span />
            </div>
            {players.map((player) => {
              const team = teams.find((item) => item.id === player.teamId);
              return (
                <div className="table-row" key={player.id}>
                  <div className="player-cell"><Avatar name={player.name} src={player.photoUrl} size="sm" tone={team?.color} /><span><strong>{player.name}</strong><small>{player.nickname ? `"${player.nickname}"` : player.email || 'Sem apelido'} · {player.membershipType === 'subscriber' ? 'Mensalista' : player.membershipType === 'guest' ? 'Convidado' : 'Vínculo não informado'}</small></span></div>
                  <div className="team-cell">{team && <TeamMark {...team} size="sm" />}<span>{team?.shortName || '—'}</span></div>
                  <span>{player.positions.join(', ')}</span>
                  <strong className="shirt-number">{player.shirtNumber || '—'}</strong>
                  <strong>{player.goals}</strong>
                  <strong>{player.assists}</strong>
                  <span><Badge tone={player.status === 'active' ? 'success' : player.status === 'suspended' ? 'danger' : 'neutral'} dot>{player.status === 'active' ? 'Ativo' : player.status === 'suspended' ? 'Suspenso' : 'Inativo'}</Badge></span>
                  <div className="table-row__actions">
                    <button className="icon-button" type="button" title="Editar jogador" aria-label={`Editar ${player.name}`} onClick={() => canManage && openForm(player)} disabled={!canManage}><MoreHorizontal size={18} /></button>
                    {canManage && <button className="icon-button icon-button--danger" type="button" title="Excluir jogador" aria-label={`Excluir ${player.name}`} onClick={() => setDeleting(player)}><Trash2 size={17} /></button>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <EmptyState title="Nenhum jogador encontrado" description="Ajuste os filtros ou cadastre o primeiro atleta." action={canManage ? <Button icon={Plus} onClick={() => openForm()}>Adicionar jogador</Button> : undefined} />
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Editar jogador' : 'Novo jogador'} description="O e-mail permite vincular o atleta ao login Google." size="lg">
        <form className="form" onSubmit={submit}>
          <div className="form-row form-row--2">
            <label><span>Nome completo</span><input name="name" required defaultValue={editing?.name} placeholder="Nome do jogador" /></label>
            <label><span>Apelido <small>(opcional)</small></span><input name="nickname" defaultValue={editing?.nickname} placeholder="Como é chamado no baba" /></label>
          </div>
          <div className="form-row form-row--2">
            <label><span>E-mail Google</span><input name="email" type="email" defaultValue={editing?.email} placeholder="jogador@gmail.com" /></label>
            <label><span>URL da foto <small>(opcional)</small></span><input name="photoUrl" type="url" defaultValue={editing?.photoUrl} placeholder="https://..." /></label>
          </div>
          <div className="form-row form-row--3">
            <label><span>Equipe</span><select name="teamId" required defaultValue={editing?.teamId}><option value="">Selecione</option>{teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}</select></label>
            <label><span>Número da camisa</span><input name="shirtNumber" type="number" min="1" max="99" defaultValue={editing?.shirtNumber} placeholder="10" /></label>
            <label><span>Situação</span><select name="status" defaultValue={editing?.status || 'active'}><option value="active">Ativo</option><option value="suspended">Suspenso</option><option value="inactive">Inativo</option></select></label>
          </div>
          <label><span>Tipo de participação <small>(opcional)</small></span><select name="membershipType" defaultValue={editing?.membershipType || ''}><option value="">Não controlar</option><option value="subscriber">Mensalista</option><option value="guest">Convidado</option></select></label>
          <fieldset className="checkbox-field">
            <legend>Posições em que joga</legend>
            <div>{positions.map((position) => <label key={position}><input type="checkbox" name="positions" value={position} defaultChecked={editing?.positions.includes(position)} /><span>{position}</span></label>)}</div>
          </fieldset>
          <div className="form-tip"><UserRound size={18} /><p><strong>Vínculo automático</strong><span>Quando o jogador entrar com este e-mail, o perfil será associado ao cadastro acima.</span></p></div>
          <div className="form-tip"><UsersRound size={18} /><p><strong>Mensalista ou convidado</strong><span>Essa classificação é opcional e pode ser usada para filtrar e selecionar participantes nos babas com sorteio.</span></p></div>
          <div className="form-actions"><Button type="button" variant="ghost" onClick={() => setModalOpen(false)}>Cancelar</Button><Button type="submit" icon={Shirt}>{editing ? 'Salvar alterações' : 'Adicionar jogador'}</Button></div>
        </form>
      </Modal>

      <DangerConfirmModal
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        title={`Excluir ${deleting?.name || 'jogador'}?`}
        description="O atleta será removido da organização e deixará de ter acesso como jogador por este cadastro."
        consequences={[
          (() => {
            const count = data.checkins.filter((checkin) => checkin.playerId === deleting?.id).length;
            return `${count} check-in${count === 1 ? '' : 's'} ${count === 1 ? 'será removido' : 'serão removidos'}`;
          })(),
          (() => {
            const charges = data.financialCharges.filter((charge) => charge.playerId === deleting?.id).length;
            const submissions = data.statSubmissions.filter((submission) => submission.playerId === deleting?.id).length;
            return `${charges} cobrança${charges === 1 ? '' : 's'} e ${submissions} envio${submissions === 1 ? '' : 's'} de estatísticas serão removidos`;
          })(),
          'Cartões desse jogador serão excluídos; gols serão mantidos sem autor e assistências serão desvinculadas',
          'O jogador será retirado das escalações e filas de partidas sorteadas',
        ]}
        onConfirm={() => deleting
          ? deleteEntityWithDependencies('players', deleting.id, `o jogador ${deleting.name}`)
          : Promise.resolve()}
      />
    </>
  );
}
