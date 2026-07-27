import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  where,
  type Firestore,
} from 'firebase/firestore';
import { getLeagueTeamIds } from './utils';
import type { AppData, League, PublicLeagueSnapshot, PublicMatch } from '../types';

function withoutUndefined(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(withoutUndefined);
  if (value && typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype) {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, entry]) => entry !== undefined)
        .map(([key, entry]) => [key, withoutUndefined(entry)]),
    );
  }
  return value;
}

export function buildPublicLeagueSnapshot(data: AppData, league: League) {
  const matches = data.matches.filter((match) => match.leagueId === league.id);
  const teamIds = getLeagueTeamIds(league, matches);
  const teams = data.teams.filter((team) => teamIds.includes(team.id));
  const players = data.players
    .filter((player) => teamIds.includes(player.teamId))
    .map((player) => {
      const publicPlayer = { ...player };
      delete publicPlayer.email;
      return publicPlayer;
    });
  const venues = new Map(data.venues.map((venue) => [venue.id, venue]));
  const organization = data.organizations.find((item) => item.id === league.organizationId);
  const now = new Date().toISOString();
  const publicMatches: PublicMatch[] = matches.map((match) => {
    const venue = venues.get(match.venueId);
    return {
      ...match,
      ...(venue ? { venueName: venue.name, venueAddress: venue.address } : {}),
    };
  });
  const snapshot: PublicLeagueSnapshot = {
    id: league.id,
    organizationId: league.organizationId,
    organizationName: organization?.name || 'Organização',
    name: league.name,
    season: league.season,
    ...(league.imageUrl ? { imageUrl: league.imageUrl } : {}),
    teamIds,
    status: league.status,
    yellowCardLimit: league.yellowCardLimit,
    redCardSuspension: league.redCardSuspension,
    isPublic: Boolean(league.isPublic),
    publishedAt: league.publishedAt || now,
    updatedAt: now,
    teamCount: teams.length,
    playerCount: players.length,
    matchCount: matches.length,
    finishedMatchCount: matches.filter((match) => match.status === 'finished').length,
    teams,
    players,
  };
  return { snapshot, matches: publicMatches };
}

export async function syncPublicLeagueSnapshot(
  firestore: Firestore,
  data: AppData,
  leagueId: string,
) {
  const league = data.leagues.find((item) => item.id === leagueId);
  if (!league) return;
  const leagueRef = doc(firestore, 'publicLeagues', league.id);
  if (!league.isPublic) {
    const existing = await getDoc(leagueRef);
    if (existing.exists()) await deleteDoc(leagueRef);
    return;
  }

  const publication = buildPublicLeagueSnapshot(data, league);
  await setDoc(
    leagueRef,
    withoutUndefined(publication.snapshot) as Record<string, unknown>,
  );

  const matchesRef = collection(leagueRef, 'matches');
  const existingMatches = await getDocs(matchesRef);
  const currentIds = new Set(publication.matches.map((match) => match.id));
  await Promise.all([
    ...publication.matches.map((match) => setDoc(
      doc(matchesRef, match.id),
      withoutUndefined(match) as Record<string, unknown>,
    )),
    ...existingMatches.docs
      .filter((matchDocument) => !currentIds.has(matchDocument.id))
      .map((matchDocument) => deleteDoc(matchDocument.ref)),
  ]);
}

export async function loadPublicLeagueList(firestore: Firestore) {
  const snapshot = await getDocs(query(
    collection(firestore, 'publicLeagues'),
    where('isPublic', '==', true),
  ));
  return snapshot.docs
    .map((item) => ({ id: item.id, ...item.data() }) as PublicLeagueSnapshot)
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function loadPublicLeague(
  firestore: Firestore,
  leagueId: string,
) {
  const leagueRef = doc(firestore, 'publicLeagues', leagueId);
  const leagueDocument = await getDoc(leagueRef);
  if (!leagueDocument.exists() || leagueDocument.data().isPublic !== true) return null;
  const matchesDocument = await getDocs(collection(leagueRef, 'matches'));
  return {
    league: { id: leagueDocument.id, ...leagueDocument.data() } as PublicLeagueSnapshot,
    matches: matchesDocument.docs.map((item) => ({ id: item.id, ...item.data() }) as PublicMatch),
  };
}
