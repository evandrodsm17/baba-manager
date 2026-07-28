import type { AppData } from '../types';

export type DeletableDataKey =
  | 'teams'
  | 'players'
  | 'venues'
  | 'leagues'
  | 'matches'
  | 'financialSettings'
  | 'financialCharges'
  | 'financialExpenses';

type PersistedDataKey =
  | DeletableDataKey
  | 'checkins'
  | 'matchConfirmations'
  | 'statSubmissions';

export interface DeletedDocument {
  key: PersistedDataKey;
  id: string;
}

export interface UpdatedDocument {
  key: PersistedDataKey;
  id: string;
  entity: AppData[PersistedDataKey][number];
}

export interface DeletionPlan {
  nextData: AppData;
  deletedDocuments: DeletedDocument[];
  updatedDocuments: UpdatedDocument[];
  deletedLeagueIds: string[];
  affectedLeagueIds: string[];
  removedCount: number;
}

const persistedKeys: PersistedDataKey[] = [
  'teams',
  'players',
  'venues',
  'leagues',
  'matches',
  'checkins',
  'matchConfirmations',
  'statSubmissions',
  'financialSettings',
  'financialCharges',
  'financialExpenses',
];

function cloneContent(data: AppData): AppData {
  return {
    ...data,
    teams: [...data.teams],
    players: [...data.players],
    venues: [...data.venues],
    leagues: [...data.leagues],
    matches: [...data.matches],
    checkins: [...data.checkins],
    matchConfirmations: [...data.matchConfirmations],
    statSubmissions: [...data.statSubmissions],
    financialSettings: [...data.financialSettings],
    financialCharges: [...data.financialCharges],
    financialExpenses: [...data.financialExpenses],
  };
}

function deleteMatches(next: AppData, matchIds: Set<string>) {
  if (!matchIds.size) return;
  next.matches = next.matches.filter((match) => !matchIds.has(match.id));
  next.checkins = next.checkins.filter((checkin) => !matchIds.has(checkin.matchId));
  next.matchConfirmations = next.matchConfirmations.filter((confirmation) => !matchIds.has(confirmation.matchId));
  next.statSubmissions = next.statSubmissions.filter((submission) => !matchIds.has(submission.matchId));
}

function deletePlayers(next: AppData, playerIds: Set<string>) {
  if (!playerIds.size) return;
  next.players = next.players.filter((player) => !playerIds.has(player.id));
  next.teams = next.teams.map((team) => ({
    ...team,
    playerIds: team.playerIds.filter((playerId) => !playerIds.has(playerId)),
  }));
  next.checkins = next.checkins.filter((checkin) => !playerIds.has(checkin.playerId));
  next.matchConfirmations = next.matchConfirmations.filter((confirmation) => !playerIds.has(confirmation.playerId));
  next.statSubmissions = next.statSubmissions.filter((submission) => !playerIds.has(submission.playerId));
  next.financialCharges = next.financialCharges.filter((charge) => !playerIds.has(charge.playerId));
  next.matches = next.matches.map((match) => ({
    ...match,
    selectedPlayerIds: match.selectedPlayerIds?.filter((playerId) => !playerIds.has(playerId)),
    homePlayerIds: match.homePlayerIds?.filter((playerId) => !playerIds.has(playerId)),
    awayPlayerIds: match.awayPlayerIds?.filter((playerId) => !playerIds.has(playerId)),
    waitingPlayerIds: match.waitingPlayerIds?.filter((playerId) => !playerIds.has(playerId)),
    drawOrder: match.drawOrder?.filter((playerId) => !playerIds.has(playerId)),
    events: match.events
      .filter((event) => !((event.type === 'yellow' || event.type === 'red') && event.playerId && playerIds.has(event.playerId)))
      .map((event) => {
        const nextEvent = { ...event };
        if (nextEvent.playerId && playerIds.has(nextEvent.playerId)) delete nextEvent.playerId;
        if (nextEvent.assistPlayerId && playerIds.has(nextEvent.assistPlayerId)) delete nextEvent.assistPlayerId;
        return nextEvent;
      }),
  }));
}

function buildPlan(original: AppData, nextData: AppData, organizationId: string, publicDataAffected: boolean): DeletionPlan {
  const deletedDocuments: DeletedDocument[] = [];
  const updatedDocuments: UpdatedDocument[] = [];

  persistedKeys.forEach((key) => {
    const before = original[key] as Array<{ id: string }>;
    const after = nextData[key] as Array<{ id: string }>;
    const beforeById = new Map(before.map((entity) => [entity.id, entity]));
    const afterById = new Map(after.map((entity) => [entity.id, entity]));

    before.forEach((entity) => {
      if (!afterById.has(entity.id)) deletedDocuments.push({ key, id: entity.id });
    });
    after.forEach((entity) => {
      const previous = beforeById.get(entity.id);
      if (previous && JSON.stringify(previous) !== JSON.stringify(entity)) {
        updatedDocuments.push({
          key,
          id: entity.id,
          entity: entity as AppData[PersistedDataKey][number],
        });
      }
    });
  });

  const deletedLeagueIds = original.leagues
    .filter((league) => league.organizationId === organizationId)
    .filter((league) => !nextData.leagues.some((remaining) => remaining.id === league.id))
    .map((league) => league.id);
  const affectedLeagueIds = publicDataAffected
    ? nextData.leagues
      .filter((league) => league.organizationId === organizationId)
      .map((league) => league.id)
    : [];

  return {
    nextData,
    deletedDocuments,
    updatedDocuments,
    deletedLeagueIds,
    affectedLeagueIds,
    removedCount: deletedDocuments.length,
  };
}

export function planEntityDeletion(
  data: AppData,
  key: DeletableDataKey,
  id: string,
  organizationId: string,
): DeletionPlan {
  const source = (data[key] as Array<{ id: string; organizationId: string }>).find((entity) => entity.id === id);
  if (!source || source.organizationId !== organizationId) {
    throw new Error('O registro não existe ou não pertence à organização atual.');
  }

  const next = cloneContent(data);
  let publicDataAffected = ['teams', 'players', 'venues', 'leagues', 'matches'].includes(key);

  if (key === 'matches') {
    deleteMatches(next, new Set([id]));
  } else if (key === 'players') {
    deletePlayers(next, new Set([id]));
  } else if (key === 'teams') {
    const playerIds = new Set(next.players.filter((player) => player.teamId === id).map((player) => player.id));
    const matchIds = new Set(next.matches
      .filter((match) => match.matchType !== 'draw' && (match.homeTeamId === id || match.awayTeamId === id))
      .map((match) => match.id));
    deleteMatches(next, matchIds);
    deletePlayers(next, playerIds);
    next.teams = next.teams.filter((team) => team.id !== id);
    next.leagues = next.leagues.map((league) => ({ ...league, teamIds: league.teamIds.filter((teamId) => teamId !== id) }));
  } else if (key === 'venues') {
    const matchIds = new Set(next.matches.filter((match) => match.venueId === id).map((match) => match.id));
    deleteMatches(next, matchIds);
    next.venues = next.venues.filter((venue) => venue.id !== id);
  } else if (key === 'leagues') {
    const matchIds = new Set(next.matches.filter((match) => match.leagueId === id).map((match) => match.id));
    deleteMatches(next, matchIds);
    next.leagues = next.leagues.filter((league) => league.id !== id);
  } else {
    next[key] = (next[key] as Array<{ id: string }>).filter((entity) => entity.id !== id) as never;
    publicDataAffected = false;
  }

  return buildPlan(data, next, organizationId, publicDataAffected);
}

export function planOrganizationCleanup(data: AppData, organizationId: string): DeletionPlan {
  const next = cloneContent(data);
  persistedKeys.forEach((key) => {
    next[key] = (next[key] as Array<{ organizationId?: string }>).filter(
      (entity) => entity.organizationId !== organizationId,
    ) as never;
  });
  return buildPlan(data, next, organizationId, true);
}
