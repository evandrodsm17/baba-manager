import { Edit3, MoreHorizontal, Plus, Search, Shirt, Trash2, UsersRound } from 'lucide-react';
import { useMemo, useState, type FormEvent } from 'react';
import { DangerConfirmModal } from '../components/DangerConfirmModal';
import { Avatar, Badge, Button, EmptyState, Modal, PageHeader, TeamMark } from '../components/UI';
import { createId, useApp } from '../context/AppContext';
import type { Team } from '../types';

const colors = ['#c8ff32', '#fd6d46', '#79a8ff', '#f7c948', '#b58cff', '#5de2c3'];

export function Teams() {
  const { data, currentUser, saveEntity, deleteEntityWithDependencies, notify } = useApp();
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Team | null>(null);
  const [deleting, setDeleting] = useState<Team | null>(null);
  const orgId = currentUser?.organizationId;
  const teams = useMemo(() => data.teams
    .filter((team) => team.organizationId === orgId)
    .filter((team) => team.name.toLowerCase().includes(search.toLowerCase())), [data.teams, orgId, search]);

  const openForm = (team?: Team) => {
    setEditing(team || null);
    setModalOpen(true);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get('name') || '').trim();
    const entity: Team = {
      id: editing?.id || createId('team'),
      organizationId: orgId || '',
      name,
      shortName: String(form.get('shortName') || '').trim().toUpperCase().slice(0, 3),
      badgeUrl: String(form.get('badgeUrl') || '').trim() || undefined,
      color: String(form.get('color') || colors[0]),
      foundedYear: Number(form.get('foundedYear')) || undefined,
      playerIds: editing?.playerIds || [],
    };
    await saveEntity('teams', entity, editing ? 'atualizou uma equipe' : 'criou uma equipe');
    notify(editing ? 'Equipe atualizada com sucesso.' : 'Equipe criada com sucesso.');
    setModalOpen(false);
  };

  return (
    <>
      <PageHeader
        eyebrow="ORGANIZAÇÃO"
        title="Equipes"
        description="Gerencie os times, escudos e elencos da sua organização."
        action={<Button icon={Plus} onClick={() => openForm()}>Nova equipe</Button>}
      />
      <div className="toolbar">
        <label className="toolbar__search"><Search size={17} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar equipe..." /></label>
        <div className="toolbar__summary"><strong>{teams.length}</strong> equipes cadastradas</div>
      </div>

      {teams.length ? (
        <div className="team-grid">
          {teams.map((team) => {
            const teamPlayers = data.players
              .filter((player) => player.teamId === team.id)
              .sort((a, b) => (a.shirtNumber || 999) - (b.shirtNumber || 999) || a.name.localeCompare(b.name));
            const suspended = teamPlayers.filter((player) => player.status === 'suspended').length;
            return (
              <article className="team-card" key={team.id}>
                <div className="team-card__header">
                  <TeamMark {...team} size="lg" />
                  <button className="icon-button" type="button" onClick={() => openForm(team)} aria-label={`Editar ${team.name}`}><MoreHorizontal size={19} /></button>
                </div>
                <div className="team-card__title"><h2>{team.name}</h2><span>{team.shortName}</span></div>
                <div className="team-card__stats">
                  <div><UsersRound size={17} /><span><strong>{teamPlayers.length}</strong> jogadores</span></div>
                  <div><Shirt size={17} /><span><strong>{teamPlayers.filter((player) => player.shirtNumber).length}</strong> numerados</span></div>
                </div>
                {teamPlayers.length > 0 && (
                  <div className="team-card__roster">
                    <div className="team-card__roster-title"><strong>Elenco</strong><span>{teamPlayers.length}</span></div>
                    <div className="team-card__players">
                      {teamPlayers.map((player) => (
                        <div className={`team-card__player ${player.status === 'suspended' ? 'team-card__player--suspended' : ''}`} key={player.id}>
                          <Avatar name={player.name} src={player.photoUrl} size="sm" tone={team.color} />
                          <div>
                            <strong>{player.name}</strong>
                            <small>{player.nickname ? `${player.nickname} · ` : ''}{player.positions.join(', ')}</small>
                          </div>
                          <span>{player.shirtNumber ? `#${player.shirtNumber}` : '—'}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div className="team-card__footer">
                  {suspended ? <Badge tone="danger" dot>{suspended} suspenso{suspended > 1 ? 's' : ''}</Badge> : <Badge tone="success" dot>Elenco regular</Badge>}
                  <div className="team-card__footer-actions">
                    <button type="button" onClick={() => openForm(team)}><Edit3 size={15} /> Editar</button>
                    <button className="danger-action" type="button" onClick={() => setDeleting(team)}><Trash2 size={15} /> Excluir</button>
                  </div>
                </div>
              </article>
            );
          })}
          <button className="team-card team-card--add" type="button" onClick={() => openForm()}>
            <span><Plus size={23} /></span><strong>Criar nova equipe</strong><small>Adicione escudo, nome e jogadores</small>
          </button>
        </div>
      ) : (
        <EmptyState title="Nenhuma equipe encontrada" description="Crie a primeira equipe para começar a organizar suas partidas." action={<Button icon={Plus} onClick={() => openForm()}>Criar equipe</Button>} />
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Editar equipe' : 'Nova equipe'} description="Defina a identidade do time. O escudo por URL é opcional.">
        <form className="form" onSubmit={handleSubmit}>
          <div className="form-row form-row--2">
            <label><span>Nome da equipe</span><input name="name" required defaultValue={editing?.name} placeholder="Ex.: Trovão FC" /></label>
            <label><span>Sigla</span><input name="shortName" required maxLength={3} defaultValue={editing?.shortName} placeholder="TRO" /></label>
          </div>
          <label><span>URL do escudo <small>(opcional)</small></span><input name="badgeUrl" type="url" defaultValue={editing?.badgeUrl} placeholder="https://..." /></label>
          <div className="form-row form-row--2">
            <label><span>Ano de fundação</span><input name="foundedYear" type="number" min="1900" max="2100" defaultValue={editing?.foundedYear} placeholder="2020" /></label>
            <fieldset className="color-field">
              <legend>Cor principal</legend>
              <div>{colors.map((color) => <label key={color} className="color-option" style={{ background: color }}><input type="radio" name="color" value={color} defaultChecked={(editing?.color || colors[0]) === color} /><i /></label>)}</div>
            </fieldset>
          </div>
          <div className="form-actions"><Button type="button" variant="ghost" onClick={() => setModalOpen(false)}>Cancelar</Button><Button type="submit">{editing ? 'Salvar alterações' : 'Criar equipe'}</Button></div>
        </form>
      </Modal>

      <DangerConfirmModal
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        title={`Excluir ${deleting?.name || 'equipe'}?`}
        description="A equipe e os dados que dependem diretamente dela serão removidos."
        consequences={[
          (() => {
            const count = data.players.filter((player) => player.teamId === deleting?.id).length;
            return `${count} jogador${count === 1 ? '' : 'es'} do elenco e seus registros financeiros`;
          })(),
          (() => {
            const count = data.matches.filter((match) => match.matchType !== 'draw' && (match.homeTeamId === deleting?.id || match.awayTeamId === deleting?.id)).length;
            return `${count} partida${count === 1 ? '' : 's'} entre equipes, com check-ins e envios de estatísticas`;
          })(),
          'A equipe será retirada das ligas e das páginas públicas',
          'Partidas sorteadas serão preservadas, mas sem os jogadores excluídos',
        ]}
        onConfirm={() => deleting
          ? deleteEntityWithDependencies('teams', deleting.id, `a equipe ${deleting.name}`)
          : Promise.resolve()}
      />
    </>
  );
}
