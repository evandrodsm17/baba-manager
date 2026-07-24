import { format, formatDistanceToNow, isToday, isTomorrow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Match, Player } from '../types';

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
      goals: leagueEvents.filter((event) => event.type === 'goal' && event.playerId === player.id).length,
      assists: leagueEvents.filter((event) => event.type === 'goal' && event.assistPlayerId === player.id).length,
      yellow: leagueEvents.filter((event) => event.type === 'yellow' && event.playerId === player.id).length,
      red: leagueEvents.filter((event) => event.type === 'red' && event.playerId === player.id).length,
    };
  });
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
