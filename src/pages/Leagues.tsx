import { AlertTriangle, Copy, Edit3, ExternalLink, Globe2, ImageIcon, Medal, Plus, ShieldCheck, Sparkles, Trophy } from 'lucide-react';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Avatar, Badge, Button, EmptyState, Modal, PageHeader, TeamMark } from '../components/UI';
import { createId, useApp } from '../context/AppContext';
import { calculateStandings, getLeagueTeamIds, getPlayerStats, playerDisplayName } from '../lib/utils';
import type { League } from '../types';

export function Leagues() {
  const { data, currentUser, saveEntity, notify } = useApp();
  const orgId = currentUser?.organizationId;
  const canManage = currentUser?.role === 'manager';
  const leagues = data.leagues.filter((league) => league.organizationId === orgId);
  const [selectedId, setSelectedId] = useState(leagues.find((league) => league.status === 'active')?.id || leagues[0]?.id);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingLeague, setEditingLeague] = useState<League | null>(null);
  const [copying, setCopying] = useState(false);
  const selected = leagues.find((league) => league.id === selectedId);
  const leagueMatches = data.matches.filter((match) => match.leagueId === selected?.id);
  const leagueTeamIds = useMemo(
    () => selected ? getLeagueTeamIds(selected, data.matches) : [],
    [selected, data.matches],
  );
  const standings = selected ? calculateStandings(selected, data.matches) : [];
  const stats = useMemo(() => getPlayerStats(
    data.players.filter((player) => player.organizationId === orgId && leagueTeamIds.includes(player.teamId)),
    leagueMatches,
  ), [data.players, leagueMatches, leagueTeamIds, orgId]);
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
      teamIds: form.getAll('teamIds').map(String),
      status: editingLeague?.status || 'active',
      yellowCardLimit: Number(form.get('yellowCardLimit')) || 3,
      redCardSuspension: Number(form.get('redCardSuspension')) || 1,
    };
    await saveEntity('leagues', entity, editingLeague ? 'atualizou uma liga' : 'criou uma liga');
    setSelectedId(entity.id);
    notify(editingLeague ? 'Liga atualizada.' : 'Liga criada. Os próximos resultados já podem valer pontos.');
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
        description="Classificação, artilharia e disciplina calculadas a partir das súmulas."
        action={canManage ? (
          <div className="page-header__actions">
            {selected && (
              <>
                <Button variant="ghost" icon={Edit3} onClick={() => openLeagueForm(selected)}>Editar liga</Button>
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
                <span><Trophy size={18} /></span>
                <div><strong>{league.name}</strong><small>Temporada {league.season}</small></div>
                <Badge tone={league.status === 'active' ? 'success' : 'neutral'} dot>{league.status === 'active' ? 'Em andamento' : 'Encerrada'}</Badge>
              </button>
            ))}
          </div>

          {selected && (
            <>
              <div className={`league-banner ${selected.imageUrl ? 'league-banner--with-image' : ''}`}>
                {selected.imageUrl && <img className="league-banner__image" src={selected.imageUrl} alt={`Imagem da liga ${selected.name}`} />}
                <div className="league-banner__content"><span className="eyebrow"><Sparkles size={14} /> TEMPORADA {selected.season}</span><h2>{selected.name}</h2><p>{leagueTeamIds.length} equipes · {leagueMatches.filter((match) => match.status === 'finished').length} partidas realizadas</p></div>
                <div className="league-banner__rules"><span><strong>{selected.yellowCardLimit}</strong><small>amarelos = suspensão</small></span><span><strong>{selected.redCardSuspension}</strong><small>jogo por vermelho</small></span></div>
              </div>

              {(canManage || selected.isPublic) && (
                <section className={`league-publication ${selected.isPublic ? 'league-publication--active' : ''}`}>
                  <span><Globe2 size={20} /></span>
                  <div>
                    <strong>{selected.isPublic ? 'Página pública ativa' : 'Compartilhe esta liga'}</strong>
                    <p>{selected.isPublic
                      ? 'Classificação, partidas e rankings podem ser vistos sem login.'
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
                <section className="panel league-grid__table">
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
                </section>

                <section className="panel">
                  <div className="section-header"><div><h2>Artilharia</h2><p>Gols nesta competição</p></div><Medal size={20} /></div>
                  <div className="scorers">
                    {scorers.length ? scorers.map((player, index) => {
                      const team = data.teams.find((item) => item.id === player.teamId);
                      return (
                        <div className="scorer" key={player.id}>
                          <b>{index + 1}</b><Avatar name={player.name} src={player.photoUrl} size="sm" tone={team?.color} />
                          <span><strong>{playerDisplayName(player)}</strong><small>{team?.shortName} · {player.assists} assist.</small></span>
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
                            <span><strong>{player.name}</strong><small>{team?.name}</small></span>
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
        onClose={() => { setModalOpen(false); setEditingLeague(null); }}
        title={editingLeague ? 'Editar liga' : 'Criar nova liga'}
        description="Defina a identidade, as equipes e as regras disciplinares."
        size="lg"
      >
        <form className="form" onSubmit={saveLeague}>
          <div className="form-row form-row--2">
            <label><span>Nome da competição</span><input name="name" required defaultValue={editingLeague?.name} placeholder="Ex.: Copa Resenha" /></label>
            <label><span>Temporada</span><input name="season" required defaultValue={editingLeague?.season || new Date().getFullYear()} /></label>
          </div>
          <label><span>URL da imagem da liga <small>(opcional)</small></span><input name="imageUrl" type="url" defaultValue={editingLeague?.imageUrl} placeholder="https://..." /></label>
          <fieldset className="team-picker">
            <legend>Equipes participantes</legend>
            <div>{data.teams.filter((team) => team.organizationId === orgId).map((team) => <label key={team.id}><input type="checkbox" name="teamIds" value={team.id} defaultChecked={editingLeague?.teamIds.includes(team.id)} /><TeamMark {...team} size="sm" /><span>{team.name}</span><i /></label>)}</div>
          </fieldset>
          <div className="form-row form-row--2">
            <label><span>Limite de cartões amarelos</span><input name="yellowCardLimit" type="number" min="1" defaultValue={editingLeague?.yellowCardLimit || 3} /></label>
            <label><span>Jogos de suspensão por vermelho</span><input name="redCardSuspension" type="number" min="1" defaultValue={editingLeague?.redCardSuspension || 1} /></label>
          </div>
          <div className="form-tip"><ImageIcon size={18} /><p><strong>Imagem da competição</strong><span>A URL será usada na gestão e na página pública sem distorcer a proporção original.</span></p></div>
          <div className="form-tip"><ShieldCheck size={18} /><p><strong>Controle automático</strong><span>Cartões das partidas desta liga alimentarão a central disciplinar.</span></p></div>
          <div className="form-actions"><Button type="button" variant="ghost" onClick={() => { setModalOpen(false); setEditingLeague(null); }}>Cancelar</Button><Button type="submit" icon={Trophy}>{editingLeague ? 'Salvar alterações' : 'Criar liga'}</Button></div>
        </form>
      </Modal>
    </>
  );
}
