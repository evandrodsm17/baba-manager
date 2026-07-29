import { format, formatDistanceToNow, isToday, isTomorrow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Checkin, League, Match, MatchConfirmation, MatchEvent, Player, Team } from '../types';

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

export function isDrawMatch(match: Match) {
  return match.matchType === 'draw';
}

function temporaryTeamShortName(name: string, fallback: string) {
  const normalized = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]/g, '');
  return normalized.slice(0, 3).toUpperCase() || fallback;
}

export function getMatchTeams(match: Match, teams: Team[]): [Team | undefined, Team | undefined] {
  if (!isDrawMatch(match)) {
    return [
      teams.find((team) => team.id === match.homeTeamId),
      teams.find((team) => team.id === match.awayTeamId),
    ];
  }
  const homeName = match.homeTeamName?.trim() || 'Time Verde';
  const awayName = match.awayTeamName?.trim() || 'Time Preto';
  return [
    {
      id: match.homeTeamId,
      organizationId: match.organizationId,
      name: homeName,
      shortName: temporaryTeamShortName(homeName, 'VER'),
      color: match.homeTeamColor || '#b7f52e',
      playerIds: match.homePlayerIds || [],
    },
    {
      id: match.awayTeamId,
      organizationId: match.organizationId,
      name: awayName,
      shortName: temporaryTeamShortName(awayName, 'PRE'),
      color: match.awayTeamColor || '#5f7567',
      playerIds: match.awayPlayerIds || [],
    },
  ];
}

export function matchIncludesPlayer(match: Match, player?: Player) {
  if (!player) return false;
  if (isDrawMatch(match)) return Boolean(match.selectedPlayerIds?.includes(player.id));
  return match.homeTeamId === player.teamId || match.awayTeamId === player.teamId;
}

export function getMatchEligiblePlayerIds(match: Match, players: Player[]) {
  if (isDrawMatch(match)) return match.selectedPlayerIds || [];
  return players
    .filter((player) => player.teamId === match.homeTeamId || player.teamId === match.awayTeamId)
    .map((player) => player.id);
}

export interface ConfirmationQueue {
  eligiblePlayerIds: string[];
  confirmedPlayerIds: string[];
  waitingPlayerIds: string[];
  maybePlayerIds: string[];
  declinedPlayerIds: string[];
  pendingPlayerIds: string[];
  positionByPlayerId: Map<string, number>;
  confirmationByPlayerId: Map<string, MatchConfirmation>;
  confirmedGoalkeepers: number;
  capacity?: number;
}

export function buildConfirmationQueue(
  match: Match,
  players: Player[],
  confirmations: MatchConfirmation[],
): ConfirmationQueue {
  const eligiblePlayerIds = getMatchEligiblePlayerIds(match, players);
  const eligibleSet = new Set(eligiblePlayerIds);
  const playerById = new Map(players.map((player) => [player.id, player]));
  const confirmationByPlayerId = new Map<string, MatchConfirmation>();

  confirmations
    .filter((confirmation) => confirmation.matchId === match.id && eligibleSet.has(confirmation.playerId))
    .forEach((confirmation) => {
      const current = confirmationByPlayerId.get(confirmation.playerId);
      if (!current || confirmation.respondedAt > current.respondedAt) {
        confirmationByPlayerId.set(confirmation.playerId, confirmation);
      }
    });

  const goingPlayerIds = eligiblePlayerIds
    .filter((playerId) => confirmationByPlayerId.get(playerId)?.status === 'going')
    .sort((playerIdA, playerIdB) => {
      const playerA = playerById.get(playerIdA);
      const playerB = playerById.get(playerIdB);
      return (
        Number(playerA?.membershipType === 'guest') - Number(playerB?.membershipType === 'guest')
        || (confirmationByPlayerId.get(playerIdA)?.respondedAt || '')
          .localeCompare(confirmationByPlayerId.get(playerIdB)?.respondedAt || '')
      );
    });
  const configuredCapacity = match.confirmationLimit
    || (isDrawMatch(match) ? Math.max(1, match.maxPlayersPerTeam || 1) * 2 : undefined);
  const capacity = configuredCapacity && configuredCapacity > 0 ? configuredCapacity : undefined;
  const reservedGoalkeeperIds = isDrawMatch(match) && capacity
    ? goingPlayerIds
      .filter((playerId) => playerById.get(playerId)?.positions.some((position) => position.toLocaleLowerCase('pt-BR') === 'goleiro'))
      .slice(0, Math.min(2, capacity))
    : [];
  const confirmedSelection = capacity
    ? new Set([
      ...reservedGoalkeeperIds,
      ...goingPlayerIds
        .filter((playerId) => !reservedGoalkeeperIds.includes(playerId))
        .slice(0, Math.max(0, capacity - reservedGoalkeeperIds.length)),
    ])
    : new Set(goingPlayerIds);
  const confirmedPlayerIds = goingPlayerIds.filter((playerId) => confirmedSelection.has(playerId));
  const waitingPlayerIds = goingPlayerIds.filter((playerId) => !confirmedSelection.has(playerId));
  const confirmedSet = new Set(confirmedPlayerIds);
  const confirmedGoalkeepers = players.filter((player) => (
    confirmedSet.has(player.id)
    && player.positions.some((position) => position.toLocaleLowerCase('pt-BR') === 'goleiro')
  )).length;

  return {
    eligiblePlayerIds,
    confirmedPlayerIds,
    waitingPlayerIds,
    maybePlayerIds: eligiblePlayerIds.filter((playerId) => confirmationByPlayerId.get(playerId)?.status === 'maybe'),
    declinedPlayerIds: eligiblePlayerIds.filter((playerId) => confirmationByPlayerId.get(playerId)?.status === 'declined'),
    pendingPlayerIds: eligiblePlayerIds.filter((playerId) => !confirmationByPlayerId.has(playerId)),
    positionByPlayerId: new Map(goingPlayerIds.map((playerId, index) => [playerId, index + 1])),
    confirmationByPlayerId,
    confirmedGoalkeepers,
    capacity,
  };
}

export function confirmationDeadlinePassed(match: Match, now = new Date()) {
  return Boolean(match.confirmationDeadline && +new Date(match.confirmationDeadline) < +now);
}

export interface CheckinWindow {
  opensMinutesBefore: number;
  closesMinutesAfter: number;
  opensAt: Date;
  closesAt: Date;
  isOpen: boolean;
  isTooEarly: boolean;
  isClosed: boolean;
}

export function getCheckinWindow(match: Match, now = new Date()): CheckinWindow {
  const opensMinutesBefore = Math.max(0, match.checkinOpensMinutesBefore ?? 30);
  const closesMinutesAfter = Math.max(0, match.checkinClosesMinutesAfter ?? 20);
  const startsAt = +new Date(match.startsAt);
  const opensAt = new Date(startsAt - opensMinutesBefore * 60_000);
  const closesAt = new Date(startsAt + closesMinutesAfter * 60_000);
  const current = +now;
  return {
    opensMinutesBefore,
    closesMinutesAfter,
    opensAt,
    closesAt,
    isOpen: current >= +opensAt && current <= +closesAt,
    isTooEarly: current < +opensAt,
    isClosed: current > +closesAt,
  };
}

export function playerParticipatedInMatch(
  match: Match,
  player: Player,
  checkins: Checkin[] = [],
) {
  if (match.events.some((event) => event.playerId === player.id || event.assistPlayerId === player.id)) return true;
  if (match.highlights?.some((highlight) => highlight.playerId === player.id)) return true;
  if (checkins.some((checkin) => checkin.matchId === match.id && checkin.playerId === player.id && checkin.validated)) return true;
  if (isDrawMatch(match)) {
    return Boolean(match.homePlayerIds?.includes(player.id) || match.awayPlayerIds?.includes(player.id));
  }
  return matchIncludesPlayer(match, player);
}

export function getPlayerMatchTeamId(match: Match, playerId: string) {
  if (match.homePlayerIds?.includes(playerId)) return match.homeTeamId;
  if (match.awayPlayerIds?.includes(playerId)) return match.awayTeamId;
  return undefined;
}

export function shufflePlayerIds(playerIds: string[]) {
  const shuffled = [...playerIds];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[index]];
  }
  return shuffled;
}

export function drawPlayerTeams(playerIds: string[]) {
  const shuffled = shufflePlayerIds(playerIds);
  return {
    homePlayerIds: shuffled.filter((_, index) => index % 2 === 0),
    awayPlayerIds: shuffled.filter((_, index) => index % 2 === 1),
  };
}

export interface DrawLineup {
  homePlayerIds: string[];
  awayPlayerIds: string[];
  waitingPlayerIds: string[];
  pendingCheckinPlayerIds: string[];
  lineupReady: boolean;
  checkedInGoalkeepers: number;
  maxPlayersPerTeam: number;
  checkinPositionByPlayerId: Map<string, number>;
}

export function buildDrawLineup(
  match: Match,
  players: Player[],
  checkins: Checkin[],
  confirmations: MatchConfirmation[] = [],
): DrawLineup {
  const selectedIds = match.requiresConfirmation
    ? buildConfirmationQueue(match, players, confirmations).confirmedPlayerIds
    : match.selectedPlayerIds || [];
  const maxPlayersPerTeam = Math.max(1, match.maxPlayersPerTeam || Math.ceil(selectedIds.length / 2) || 1);
  const playerMap = new Map(players.map((player) => [player.id, player]));
  const earliestCheckin = new Map<string, Checkin>();

  checkins
    .filter((checkin) => checkin.matchId === match.id && checkin.validated && selectedIds.includes(checkin.playerId))
    .forEach((checkin) => {
      const current = earliestCheckin.get(checkin.playerId);
      if (!current || checkin.checkedAt < current.checkedAt) earliestCheckin.set(checkin.playerId, checkin);
    });

  const chronologicalIds = [...earliestCheckin.values()]
    .sort((a, b) => a.checkedAt.localeCompare(b.checkedAt))
    .map((checkin) => checkin.playerId);
  const checkinPositionByPlayerId = new Map(chronologicalIds.map((playerId, index) => [playerId, index + 1]));

  const priorityPlayers = chronologicalIds
    .map((playerId) => playerMap.get(playerId))
    .filter((player): player is Player => Boolean(player))
    .sort((a, b) => (
      Number(a.membershipType === 'guest') - Number(b.membershipType === 'guest')
      || (earliestCheckin.get(a.id)?.checkedAt || '').localeCompare(earliestCheckin.get(b.id)?.checkedAt || '')
    ));
  const goalkeepers = priorityPlayers.filter((player) => player.positions.some((position) => position.toLocaleLowerCase('pt-BR') === 'goleiro'));
  const pendingCheckinPlayerIds = selectedIds.filter((playerId) => !earliestCheckin.has(playerId));

  if (goalkeepers.length < 2) {
    return {
      homePlayerIds: [],
      awayPlayerIds: [],
      waitingPlayerIds: priorityPlayers.map((player) => player.id),
      pendingCheckinPlayerIds,
      lineupReady: false,
      checkedInGoalkeepers: goalkeepers.length,
      maxPlayersPerTeam,
      checkinPositionByPlayerId,
    };
  }

  const fixedGoalkeepers = goalkeepers.slice(0, 2);
  const capacity = maxPlayersPerTeam * 2;
  const remainingPriority = priorityPlayers.filter((player) => !fixedGoalkeepers.some((goalkeeper) => goalkeeper.id === player.id));
  const playingIds = [
    ...fixedGoalkeepers.map((player) => player.id),
    ...remainingPriority.slice(0, Math.max(0, capacity - 2)).map((player) => player.id),
  ];
  const playingSet = new Set(playingIds);
  const waitingPlayerIds = priorityPlayers.filter((player) => !playingSet.has(player.id)).map((player) => player.id);
  const drawOrder = [
    ...(match.drawOrder || []),
    ...selectedIds.filter((playerId) => !match.drawOrder?.includes(playerId)),
  ];
  const goalkeeperOrder = drawOrder.filter((playerId) => fixedGoalkeepers.some((player) => player.id === playerId));
  const [homeGoalkeeper, awayGoalkeeper] = goalkeeperOrder.length === 2
    ? goalkeeperOrder
    : fixedGoalkeepers.map((player) => player.id);
  const homePlayerIds = [homeGoalkeeper];
  const awayPlayerIds = [awayGoalkeeper];
  const remainingDraw = [
    ...drawOrder.filter((playerId) => playingSet.has(playerId) && playerId !== homeGoalkeeper && playerId !== awayGoalkeeper),
    ...playingIds.filter((playerId) => !drawOrder.includes(playerId) && playerId !== homeGoalkeeper && playerId !== awayGoalkeeper),
  ];

  remainingDraw.forEach((playerId) => {
    if (homePlayerIds.length >= maxPlayersPerTeam) awayPlayerIds.push(playerId);
    else if (awayPlayerIds.length >= maxPlayersPerTeam) homePlayerIds.push(playerId);
    else if (homePlayerIds.length <= awayPlayerIds.length) homePlayerIds.push(playerId);
    else awayPlayerIds.push(playerId);
  });

  return {
    homePlayerIds,
    awayPlayerIds,
    waitingPlayerIds,
    pendingCheckinPlayerIds,
    lineupReady: true,
    checkedInGoalkeepers: goalkeepers.length,
    maxPlayersPerTeam,
    checkinPositionByPlayerId,
  };
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
  if (league.format === 'draw') return [];
  const scheduledTeams = matches
    .filter((match) => match.leagueId === league.id && !isDrawMatch(match))
    .flatMap((match) => [match.homeTeamId, match.awayTeamId]);
  return [...new Set([...league.teamIds, ...scheduledTeams])];
}

export function getLeaguePlayers(league: League, matches: Match[], players: Player[]) {
  if (league.format !== 'draw') {
    const teamIds = getLeagueTeamIds(league, matches);
    return players.filter((player) => Boolean(player.teamId && teamIds.includes(player.teamId)));
  }
  const playerIds = new Set(
    matches
      .filter((match) => match.leagueId === league.id && isDrawMatch(match))
      .flatMap((match) => [
        ...(match.selectedPlayerIds || []),
        ...(match.homePlayerIds || []),
        ...(match.awayPlayerIds || []),
        ...(match.waitingPlayerIds || []),
        ...match.events.flatMap((event) => [event.playerId, event.assistPlayerId].filter((id): id is string => Boolean(id))),
        ...(match.highlights || []).map((highlight) => highlight.playerId),
      ]),
  );
  return players.filter((player) => playerIds.has(player.id));
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
