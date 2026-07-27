import { format, formatDistanceToNow, isToday, isTomorrow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { League, Match, MatchEvent, Player } from '../types';

export interface Standing {
  teamId: string;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  points: number;
}

export function formatMatchDate(value: string) {
  const date = new Date(value);
  if (isToday(date)) return `Hoje, ${format(date, 'HH:mm')}`;
  if (isTomorrow(date)) return `Amanhã, ${format(date, 'HH:mm')}`;
  return format(date, "dd MMM, HH:mm", { locale: ptBR });
}

export function formatLongDate(value: string) {
  return format(new Date(value), "EEEE, dd 'de' MMMM · HH:mm", { locale: ptBR });
}

export function timeAgo(value?: string) {
  if (!value) return 'Nunca acessou';
  return formatDistanceToNow(new Date(value), { locale: ptBR, addSuffix: true });
}

export function initials(name: string) {
  return name
    .split(' ')
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

export function playerDisplayName(player?: Player) {
  if (!player) return 'Jogador';
  return player.nickname || player.name.split(' ')[0];
}

export function getPlayerStats(players: Player[], matches: Match[]) {
  return players.map((player) => {
    const leagueEvents = matches
      .filter((match) => match.status === 'finished' && Boolean(match.leagueId))
      .flatMap((match) => match.events);
    return {
      ...player,
      goals: leagueEvents.filter((event) => (
        event.type === 'goal'
        && !event.ownGoal
        && event.playerId === player.id
      )).length,
      assists: leagueEvents.filter((event) => (
        (event.type === 'goal' && event.assistPlayerId === player.id)
        || (event.type === 'assist' && event.playerId === player.id)
      )).length,
      yellow: leagueEvents.filter((event) => event.type === 'yellow' && event.playerId === player.id).length,
      red: leagueEvents.filter((event) => event.type === 'red' && event.playerId === player.id).length,
    };
  });
}

export function getLeagueTeamIds(league: League, matches: Match[]) {
  const scheduledTeams = matches
    .filter((match) => match.leagueId === league.id)
    .flatMap((match) => [match.homeTeamId, match.awayTeamId]);
  return [...new Set([...league.teamIds, ...scheduledTeams])];
}

export function calculateStandings(league: League, matches: Match[]): Standing[] {
  const table = new Map<string, Standing>();
  getLeagueTeamIds(league, matches).forEach((teamId) => table.set(teamId, {
    teamId,
    played: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    points: 0,
  }));
  matches
    .filter((match) => match.leagueId === league.id && match.status === 'finished')
    .forEach((match) => {
      const home = table.get(match.homeTeamId);
      const away = table.get(match.awayTeamId);
      if (!home || !away) return;
      const homeScore = match.homeScore || 0;
      const awayScore = match.awayScore || 0;
      home.played += 1;
      away.played += 1;
      home.goalsFor += homeScore;
      home.goalsAgainst += awayScore;
      away.goalsFor += awayScore;
      away.goalsAgainst += homeScore;
      if (homeScore > awayScore) {
        home.wins += 1;
        home.points += 3;
        away.losses += 1;
      } else if (awayScore > homeScore) {
        away.wins += 1;
        away.points += 3;
        home.losses += 1;
      } else {
        home.draws += 1;
        away.draws += 1;
        home.points += 1;
        away.points += 1;
      }
    });
  return [...table.values()].sort((a, b) => (
    b.points - a.points
    || (b.goalsFor - b.goalsAgainst) - (a.goalsFor - a.goalsAgainst)
    || b.goalsFor - a.goalsFor
  ));
}

export function scoreFromEvents(events: MatchEvent[], homeTeamId: string, awayTeamId: string) {
  return events.reduce((score, event) => {
    if (event.type !== 'goal') return score;
    if (event.teamId === homeTeamId) score.homeScore += 1;
    if (event.teamId === awayTeamId) score.awayScore += 1;
    return score;
  }, { homeScore: 0, awayScore: 0 });
}

export function haversineDistance(
  latitudeA: number,
  longitudeA: number,
  latitudeB: number,
  longitudeB: number,
) {
  const radius = 6371e3;
  const radians = (degrees: number) => degrees * Math.PI / 180;
  const phi1 = radians(latitudeA);
  const phi2 = radians(latitudeB);
  const deltaPhi = radians(latitudeB - latitudeA);
  const deltaLambda = radians(longitudeB - longitudeA);
  const a = Math.sin(deltaPhi / 2) ** 2
    + Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) ** 2;
  return radius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
