import { AlertTriangle, Medal, Plus, ShieldCheck, Sparkles, Trophy } from 'lucide-react';
import { useMemo, useState, type FormEvent } from 'react';
import { Avatar, Badge, Button, EmptyState, Modal, PageHeader, TeamMark } from '../components/UI';
import { createId, useApp } from '../context/AppContext';
import { getPlayerStats, playerDisplayName } from '../lib/utils';
import type { League, Match } from '../types';

interface Standing {
  teamId: string;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  points: number;
}

function getLeagueTeamIds(league: League, matches: Match[]) {
  const scheduledTeams = matches
    .filter((match) => match.leagueId === league.id)
    .flatMap((match) => [match.homeTeamId, match.awayTeamId]);
  return [...new Set([...league.teamIds, ...scheduledTeams])];
}

function calculateStandings(league: League, matches: Match[]): Standing[] {
  const table = new Map<string, Standing>();
  getLeagueTeamIds(league, matches).forEach((teamId) => table.set(teamId, { teamId, played: 0, wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0, points: 0 }));
  matches.filter((match) => match.leagueId === league.id && match.status === 'finished').forEach((match) => {
    const home = table.get(match.homeTeamId);
    const away = table.get(match.awayTeamId);
    if (!home || !away) return;
    const homeScore = match.homeScore || 0;
    const awayScore = match.awayScore || 0;
    home.played++; away.played++;
    home.goalsFor += homeScore; home.goalsAgainst += awayScore;
    away.goalsFor += awayScore; away.goalsAgainst += homeScore;
    if (homeScore > awayScore) { home.wins++; home.points += 3; away.losses++; }
    else if (awayScore > homeScore) { away.wins++; away.points += 3; home.losses++; }
    else { home.draws++; away.draws++; home.points++; away.points++; }
  });
  return [...table.values()].sort((a, b) => b.points - a.points || (b.goalsFor - b.goalsAgainst) - (a.goalsFor - a.goalsAgainst) || b.goalsFor - a.goalsFor);
}

export function Leagues() {
  const { data, currentUser, saveEntity, notify } = useApp();
  const orgId = currentUser?.organizationId;
  const canManage = currentUser?.role === 'manager';
  const leagues = data.leagues.filter((league) => league.organizationId === orgId);
  const [selectedId, setSelectedId] = useState(leagues.find((league) => league.status === 'active')?.id || leagues[0]?.id);
  const [modalOpen, setModalOpen] = useState(false);
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

  const createLeague = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const entity: League = {
      id: createId('league'),
      organizationId: orgId || '',
      name: String(form.get('name')).trim(),
      season: String(form.get('season')).trim(),
      teamIds: form.getAll('teamIds').map(String),
      status: 'active',
      yellowCardLimit: Number(form.get('yellowCardLimit')) || 3,
      redCardSuspension: Number(form.get('redCardSuspension')) || 1,
    };
    await saveEntity('leagues', entity, 'criou uma liga');
    setSelectedId(entity.id);
    notify('Liga criada. Os próximos resultados já podem valer pontos.');
    setModalOpen(false);
  };

  return (
    <>
      <PageHeader
        eyebrow="COMPETIÇÕES"
        title="Ligas e rankings"
        description="Classificação, artilharia e disciplina calculadas a partir das súmulas."
        action={canManage ? <Button icon={Plus} onClick={() => setModalOpen(true)}>Nova liga</Button> : undefined}
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
              <div className="league-banner">
                <div><span className="eyebrow"><Sparkles size={14} /> TEMPORADA {selected.season}</span><h2>{selected.name}</h2><p>{leagueTeamIds.length} equipes · {leagueMatches.filter((match) => match.status === 'finished').length} partidas realizadas</p></div>
                <div className="league-banner__rules"><span><strong>{selected.yellowCardLimit}</strong><small>amarelos = suspensão</small></span><span><strong>{selected.redCardSuspension}</strong><small>jogo por vermelho</small></span></div>
              </div>

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
        <EmptyState title="Nenhuma liga criada" description="Crie uma competição para gerar classificação e estatísticas oficiais." action={canManage ? <Button icon={Plus} onClick={() => setModalOpen(true)}>Criar liga</Button> : undefined} />
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Criar nova liga" description="Escolha as equipes e defina as regras disciplinares." size="lg">
        <form className="form" onSubmit={createLeague}>
          <div className="form-row form-row--2">
            <label><span>Nome da competição</span><input name="name" required placeholder="Ex.: Copa Resenha" /></label>
            <label><span>Temporada</span><input name="season" required defaultValue={new Date().getFullYear()} /></label>
          </div>
          <fieldset className="team-picker">
            <legend>Equipes participantes</legend>
            <div>{data.teams.filter((team) => team.organizationId === orgId).map((team) => <label key={team.id}><input type="checkbox" name="teamIds" value={team.id} /><TeamMark {...team} size="sm" /><span>{team.name}</span><i /></label>)}</div>
          </fieldset>
          <div className="form-row form-row--2">
            <label><span>Limite de cartões amarelos</span><input name="yellowCardLimit" type="number" min="1" defaultValue="3" /></label>
            <label><span>Jogos de suspensão por vermelho</span><input name="redCardSuspension" type="number" min="1" defaultValue="1" /></label>
          </div>
          <div className="form-tip"><ShieldCheck size={18} /><p><strong>Controle automático</strong><span>Cartões das partidas desta liga alimentarão a central disciplinar.</span></p></div>
          <div className="form-actions"><Button type="button" variant="ghost" onClick={() => setModalOpen(false)}>Cancelar</Button><Button type="submit" icon={Trophy}>Criar liga</Button></div>
        </form>
      </Modal>
    </>
  );
}
