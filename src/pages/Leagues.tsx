import { AlertTriangle, Copy, Edit3, ExternalLink, Globe2, ImageIcon, Plus, ShieldCheck, Shuffle, Sparkles, Trash2, Trophy, UsersRound } from 'lucide-react';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { DangerConfirmModal } from '../components/DangerConfirmModal';
import { Avatar, Badge, Button, EmptyState, Modal, PageHeader, SoccerBallIcon, TeamMark } from '../components/UI';
import { createId, useApp } from '../context/AppContext';
import { calculateStandings, getLeaguePlayers, getLeagueTeamIds, getPlayerStats, playerDisplayName } from '../lib/utils';
import type { League, MatchType } from '../types';

export function Leagues() {
  const { data, currentUser, saveEntity, deleteEntityWithDependencies, notify } = useApp();
  const orgId = currentUser?.organizationId;
  const canManage = currentUser?.role === 'manager';
  const leagues = data.leagues.filter((league) => league.organizationId === orgId);
  const [selectedId, setSelectedId] = useState(leagues.find((league) => league.status === 'active')?.id || leagues[0]?.id);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingLeague, setEditingLeague] = useState<League | null>(null);
  const [leagueFormat, setLeagueFormat] = useState<MatchType>('teams');
  const [deletingLeague, setDeletingLeague] = useState<League | null>(null);
  const [copying, setCopying] = useState(false);
  const selected = leagues.find((league) => league.id === selectedId);
  const leagueMatches = data.matches.filter((match) => match.leagueId === selected?.id);
  const leagueTeamIds = useMemo(
    () => selected ? getLeagueTeamIds(selected, data.matches) : [],
    [selected, data.matches],
  );
  const standings = selected ? calculateStandings(selected, data.matches) : [];
  const isDrawLeague = selected?.format === 'draw';
  const leaguePlayers = useMemo(
    () => selected ? getLeaguePlayers(selected, leagueMatches, data.players) : [],
    [selected, leagueMatches, data.players],
  );
  const stats = useMemo(() => getPlayerStats(
    leaguePlayers.filter((player) => player.organizationId === orgId),
    leagueMatches,
  ), [leaguePlayers, leagueMatches, orgId]);
  const scorers = [...stats]
    .filter((player) => player.goals > 0 || player.assists > 0)
    .sort((a, b) => b.goals - a.goals || b.assists - a.assists)
    .slice(0, 5);
  const disciplinary = selected ? stats
    .filter((player) => player.red >= selected.redCardSuspension || player.yellow >= selected.yellowCardLimit)
    .sort((a, b) => b.red - a.red || b.yellow - a.yellow) : [];

  useEffect(() => {
    if (!leagues.length) return;
    if (!selectedId || !leagues.some((league) => league.id === selectedId)) {
      setSelectedId(leagues.find((league) => league.status === 'active')?.id || leagues[0].id);
    }
  }, [leagues, selectedId]);

  const openLeagueForm = (league?: League) => {
    setEditingLeague(league || null);
    setLeagueFormat(league?.format || 'teams');
    setModalOpen(true);
  };

  const saveLeague = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const entity: League = {
      ...(editingLeague || {}),
      id: editingLeague?.id || createId('league'),
      organizationId: orgId || '',
      name: String(form.get('name')).trim(),
      season: String(form.get('season')).trim(),
      imageUrl: String(form.get('imageUrl') || '').trim() || undefined,
      format: leagueFormat,
      teamIds: leagueFormat === 'draw' ? [] : form.getAll('teamIds').map(String),
      status: editingLeague?.status || 'active',
      yellowCardLimit: Number(form.get('yellowCardLimit')) || 3,
      redCardSuspension: Number(form.get('redCardSuspension')) || 1,
    };
    await saveEntity('leagues', entity, editingLeague ? 'atualizou uma liga' : 'criou uma liga');
    setSelectedId(entity.id);
    notify(editingLeague
      ? 'Liga atualizada.'
      : leagueFormat === 'draw'
        ? 'Circuito criado. Os babas sorteados já podem ser agrupados e publicados.'
        : 'Liga criada. Os próximos resultados já podem valer pontos.');
    setModalOpen(false);
    setEditingLeague(null);
  };

  const togglePublication = async () => {
    if (!selected) return;
    const isPublic = !selected.isPublic;
    await saveEntity('leagues', {
      ...selected,
      isPublic,
      ...(isPublic ? { publishedAt: selected.publishedAt || new Date().toISOString() } : {}),
    }, isPublic ? 'publicou uma liga' : 'removeu uma liga da área pública');
    notify(isPublic
      ? 'Liga publicada. O link já pode ser compartilhado.'
      : 'A página pública desta liga foi desativada.');
  };

  const copyPublicLink = async () => {
    if (!selected) return;
    setCopying(true);
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/liga/${selected.id}`);
      notify('Link público copiado.');
    } catch {
      notify('Não foi possível copiar o link automaticamente.', 'error');
    } finally {
      setCopying(false);
    }
  };

  return (
    <>
      <PageHeader
        eyebrow="COMPETIÇÕES"
        title="Ligas e rankings"
        description={isDrawLeague
          ? 'Histórico dos babas e estatísticas individuais calculadas a partir das súmulas.'
          : 'Classificação, artilharia e disciplina calculadas a partir das súmulas.'}
        action={canManage ? (
          <div className="page-header__actions">
            {selected && (
              <>
                <Button variant="ghost" icon={Edit3} onClick={() => openLeagueForm(selected)}>Editar liga</Button>
                <Button variant="danger" icon={Trash2} onClick={() => setDeletingLeague(selected)}>Excluir liga</Button>
                {selected.isPublic ? (
                  <Button variant="secondary" icon={ExternalLink} onClick={() => window.open(`/liga/${selected.id}`, '_blank', 'noopener,noreferrer')}>Página pública</Button>
                ) : (
                  <Button variant="secondary" icon={Globe2} onClick={togglePublication}>Publicar liga selecionada</Button>
                )}
              </>
            )}
            <Button icon={Plus} onClick={() => openLeagueForm()}>Nova liga</Button>
          </div>
        ) : undefined}
      />
      {leagues.length ? (
        <>
          <div className="league-tabs">
            {leagues.map((league) => (
              <button type="button" key={league.id} className={selectedId === league.id ? 'active' : ''} onClick={() => setSelectedId(league.id)}>
                <span>{league.format === 'draw' ? <Shuffle size={18} /> : <Trophy size={18} />}</span>
                <div><strong>{league.name}</strong><small>{league.format === 'draw' ? 'Babas sorteados' : 'Temporada'} · {league.season}</small></div>
                <Badge tone={league.status === 'active' ? 'success' : 'neutral'} dot>{league.status === 'active' ? 'Em andamento' : 'Encerrada'}</Badge>
              </button>
            ))}
          </div>

          {selected && (
            <>
              <div className={`league-banner ${selected.imageUrl ? 'league-banner--with-image' : ''}`}>
                {selected.imageUrl && <img className="league-banner__image" src={selected.imageUrl} alt={`Imagem da liga ${selected.name}`} />}
                <div className="league-banner__content">
                  <span className="eyebrow"><Sparkles size={14} /> {isDrawLeague ? 'CIRCUITO' : 'TEMPORADA'} {selected.season}</span>
                  <h2>{selected.name}</h2>
                  <p>{isDrawLeague
                    ? `${leaguePlayers.length} jogadores · ${leagueMatches.filter((match) => match.status === 'finished').length} ${leagueMatches.filter((match) => match.status === 'finished').length === 1 ? 'baba realizado' : 'babas realizados'}`
                    : `${leagueTeamIds.length} equipes · ${leagueMatches.filter((match) => match.status === 'finished').length} partidas realizadas`}</p>
                </div>
                <div className="league-banner__rules"><span><strong>{selected.yellowCardLimit}</strong><small>amarelos = suspensão</small></span><span><strong>{selected.redCardSuspension}</strong><small>jogo por vermelho</small></span></div>
              </div>

              {(canManage || selected.isPublic) && (
                <section className={`league-publication ${selected.isPublic ? 'league-publication--active' : ''}`}>
                  <span><Globe2 size={20} /></span>
                  <div>
                    <strong>{selected.isPublic ? 'Página pública ativa' : 'Compartilhe esta liga'}</strong>
                    <p>{selected.isPublic
                      ? isDrawLeague
                        ? 'Babas, súmulas e rankings individuais podem ser vistos sem login.'
                        : 'Classificação, partidas e rankings podem ser vistos sem login.'
                      : 'Publique uma página externa segura para jogadores, amigos e torcedores.'}</p>
                  </div>
                  <div className="league-publication__actions">
                    {selected.isPublic && (
                      <>
                        <Button variant="ghost" icon={Copy} disabled={copying} onClick={copyPublicLink}>{copying ? 'Copiando...' : 'Copiar link'}</Button>
                        <Button variant="secondary" icon={ExternalLink} onClick={() => window.open(`/liga/${selected.id}`, '_blank', 'noopener,noreferrer')}>Abrir página</Button>
                      </>
                    )}
                    {canManage && (
                      <Button variant={selected.isPublic ? 'ghost' : 'primary'} icon={Globe2} onClick={togglePublication}>
                        {selected.isPublic ? 'Desativar publicação' : 'Publicar liga'}
                      </Button>
                    )}
                  </div>
                </section>
              )}

              <div className="league-grid">
                {!isDrawLeague && <section className="panel league-grid__table">
                  <div className="section-header"><div><h2>Classificação</h2><p>Atualizada com os jogos finalizados</p></div><Badge tone="lime">3 pts por vitória</Badge></div>
                  <div className="standings table-scroll">
                    <div className="table-head"><span>#</span><span>Equipe</span><span>J</span><span>V</span><span>E</span><span>D</span><span>SG</span><span>PTS</span></div>
                    {standings.map((entry, index) => {
                      const team = data.teams.find((item) => item.id === entry.teamId);
                      if (!team) return null;
                      return (
                        <div className="table-row" key={entry.teamId}>
                          <strong className={index < 2 ? 'qualified' : ''}>{index + 1}</strong>
                          <div className="team-cell"><TeamMark {...team} size="sm" /><strong>{team.name}</strong></div>
                          <span>{entry.played}</span><span>{entry.wins}</span><span>{entry.draws}</span><span>{entry.losses}</span>
                          <span>{entry.goalsFor - entry.goalsAgainst > 0 ? '+' : ''}{entry.goalsFor - entry.goalsAgainst}</span>
                          <strong>{entry.points}</strong>
                        </div>
                      );
                    })}
                  </div>
                </section>}

                {isDrawLeague && (
                  <section className="panel league-draw-overview">
                    <div className="section-header"><div><h2>Resumo do circuito</h2><p>Resultados acumulados dos babas sorteados</p></div><Shuffle size={20} /></div>
                    <div>
                      <span><strong>{leagueMatches.length}</strong><small>babas cadastrados</small></span>
                      <span><strong>{leagueMatches.filter((match) => match.status === 'finished').length}</strong><small>finalizados</small></span>
                      <span><strong>{leaguePlayers.length}</strong><small>jogadores</small></span>
                      <span><strong>{stats.reduce((total, player) => total + player.goals, 0)}</strong><small>gols registrados</small></span>
                    </div>
                  </section>
                )}

                <section className="panel">
                  <div className="section-header"><div><h2>Artilharia</h2><p>Gols nesta competição</p></div><SoccerBallIcon /></div>
                  <div className="scorers">
                    {scorers.length ? scorers.map((player, index) => {
                      const team = data.teams.find((item) => item.id === player.teamId);
                      return (
                        <div className="scorer" key={player.id}>
                          <b>{index + 1}</b><Avatar name={player.name} src={player.photoUrl} size="sm" tone={team?.color} />
                          <span><strong>{playerDisplayName(player)}</strong><small>{team?.shortName ? `${team.shortName} · ` : ''}{player.assists} assist.</small></span>
                          <em>{player.goals}</em>
                        </div>
                      );
                    }) : <EmptyState title="Sem gols registrados" description="A artilharia aparecerá após os primeiros eventos aprovados desta liga." />}
                  </div>
                </section>

                <section className="panel league-grid__discipline">
                  <div className="section-header"><div><h2>Central disciplinar</h2><p>Atletas que atingiram os limites definidos</p></div><AlertTriangle size={20} /></div>
                  {disciplinary.length ? (
                    <div className="discipline-list">
                      {disciplinary.map((player) => {
                        const team = data.teams.find((item) => item.id === player.teamId);
                        return (
                          <div className="discipline-row" key={player.id}>
                            <Avatar name={player.name} size="sm" tone={team?.color} />
                            <span><strong>{player.name}</strong><small>{isDrawLeague ? 'Participante do circuito' : team?.name}</small></span>
                            <div>{player.yellow > 0 && <Badge tone="warning">{player.yellow} amarelo{player.yellow > 1 ? 's' : ''}</Badge>}{player.red > 0 && <Badge tone="danger">{player.red} vermelho{player.red > 1 ? 's' : ''}</Badge>}</div>
                            <Badge tone="danger">Suspensão sugerida</Badge>
                          </div>
                        );
                      })}
                    </div>
                  ) : <EmptyState title="Tudo em ordem" description="Nenhum atleta atingiu o limite de cartões nesta liga." />}
                </section>
              </div>
            </>
          )}
        </>
      ) : (
        <EmptyState title="Nenhuma liga criada" description="Crie uma competição para gerar classificação e estatísticas oficiais." action={canManage ? <Button icon={Plus} onClick={() => openLeagueForm()}>Criar liga</Button> : undefined} />
      )}

      <Modal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditingLeague(null); setLeagueFormat('teams'); }}
        title={editingLeague ? 'Editar liga' : 'Criar nova liga'}
        description="Escolha entre uma competição de equipes ou um circuito para agrupar babas sorteados."
        size="lg"
      >
        <form className="form" onSubmit={saveLeague}>
          <div className="match-type-selector league-format-selector">
            <button
              type="button"
              className={leagueFormat === 'teams' ? 'active' : ''}
              disabled={Boolean(editingLeague && data.matches.some((match) => match.leagueId === editingLeague.id))}
              onClick={() => setLeagueFormat('teams')}
            >
              <Trophy size={21} /><span><strong>Equipes fixas</strong><small>Classificação, pontos, confrontos e rankings.</small></span>
            </button>
            <button
              type="button"
              className={leagueFormat === 'draw' ? 'active' : ''}
              disabled={Boolean(editingLeague && data.matches.some((match) => match.leagueId === editingLeague.id))}
              onClick={() => setLeagueFormat('draw')}
            >
              <Shuffle size={21} /><span><strong>Babas sorteados</strong><small>Histórico público e estatísticas dos jogadores, sem tabela de equipes.</small></span>
            </button>
          </div>
          {editingLeague && data.matches.some((match) => match.leagueId === editingLeague.id) && (
            <div className="form-tip"><ShieldCheck size={18} /><p><strong>Formato protegido</strong><span>O tipo não pode ser alterado porque esta liga já possui partidas vinculadas.</span></p></div>
          )}
          <div className="form-row form-row--2">
            <label><span>Nome da competição</span><input name="name" required defaultValue={editingLeague?.name} placeholder="Ex.: Copa Resenha" /></label>
            <label><span>Temporada</span><input name="season" required defaultValue={editingLeague?.season || new Date().getFullYear()} /></label>
          </div>
          <label><span>URL da imagem da liga <small>(opcional)</small></span><input name="imageUrl" type="url" defaultValue={editingLeague?.imageUrl} placeholder="https://..." /></label>
          {leagueFormat === 'teams' && <fieldset className="team-picker">
            <legend>Equipes participantes</legend>
            <div>{data.teams.filter((team) => team.organizationId === orgId).map((team) => <label key={team.id}><input type="checkbox" name="teamIds" value={team.id} defaultChecked={editingLeague?.teamIds.includes(team.id)} /><TeamMark {...team} size="sm" /><span>{team.name}</span><i /></label>)}</div>
          </fieldset>}
          {leagueFormat === 'draw' && (
            <div className="form-tip"><UsersRound size={18} /><p><strong>Classificação individual</strong><span>Jogadores serão incluídos automaticamente quando um baba sorteado for vinculado a este circuito.</span></p></div>
          )}
          <div className="form-row form-row--2">
            <label><span>Limite de cartões amarelos</span><input name="yellowCardLimit" type="number" min="1" defaultValue={editingLeague?.yellowCardLimit || 3} /></label>
            <label><span>Jogos de suspensão por vermelho</span><input name="redCardSuspension" type="number" min="1" defaultValue={editingLeague?.redCardSuspension || 1} /></label>
          </div>
          <div className="form-tip"><ImageIcon size={18} /><p><strong>Imagem da competição</strong><span>A URL será usada na gestão e na página pública sem distorcer a proporção original.</span></p></div>
          <div className="form-tip"><ShieldCheck size={18} /><p><strong>Controle automático</strong><span>Cartões das partidas desta liga alimentarão a central disciplinar.</span></p></div>
          <div className="form-actions"><Button type="button" variant="ghost" onClick={() => { setModalOpen(false); setEditingLeague(null); setLeagueFormat('teams'); }}>Cancelar</Button><Button type="submit" icon={leagueFormat === 'draw' ? Shuffle : Trophy}>{editingLeague ? 'Salvar alterações' : leagueFormat === 'draw' ? 'Criar circuito' : 'Criar liga'}</Button></div>
        </form>
      </Modal>

      <DangerConfirmModal
        open={Boolean(deletingLeague)}
        onClose={() => setDeletingLeague(null)}
        title={`Excluir ${deletingLeague?.name || 'liga'}?`}
        description="A competição será removida com todo o histórico registrado dentro dela."
        consequences={[
          (() => {
            const count = data.matches.filter((match) => match.leagueId === deletingLeague?.id).length;
            return `${count} partida${count === 1 ? '' : 's'}, incluindo súmulas, check-ins e envios de estatísticas`;
          })(),
          'Classificação, artilharia, assistências e controle disciplinar deixarão de existir',
          deletingLeague?.isPublic ? 'A página pública e seus dados serão removidos' : 'Qualquer publicação residual da liga será removida',
          'Equipes e jogadores continuarão cadastrados na organização',
        ]}
        onConfirm={() => deletingLeague
          ? deleteEntityWithDependencies('leagues', deletingLeague.id, `a liga ${deletingLeague.name}`)
          : Promise.resolve()}
      />
    </>
  );
}
