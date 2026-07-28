export type UserRole = 'master' | 'manager' | 'player';
export type MatchStatus = 'scheduled' | 'live' | 'finished';
export type MatchType = 'teams' | 'draw';
export type EventType = 'goal' | 'assist' | 'yellow' | 'red';

export interface UserAccess {
  id: string;
  role: UserRole;
  organizationId?: string;
  organizationName?: string;
  managerInviteId?: string;
  playerId?: string;
  playerName?: string;
  teamId?: string;
  teamName?: string;
}

export interface UserProfile {
  id: string;
  uid: string;
  name: string;
  email: string;
  photoUrl?: string;
  role: UserRole;
  organizationId?: string;
  managerInviteId?: string;
  playerId?: string;
  accesses: UserAccess[];
  platformRole?: 'master';
  active: boolean;
  lastAccess?: string;
}

export interface Organization {
  id: string;
  name: string;
  ownerId: string;
  plan: 'starter' | 'pro';
  active: boolean;
}

export interface Team {
  id: string;
  organizationId: string;
  name: string;
  shortName: string;
  badgeUrl?: string;
  color: string;
  foundedYear?: number;
  playerIds: string[];
}

export interface Player {
  id: string;
  organizationId: string;
  organizationName?: string;
  teamId: string;
  teamName?: string;
  name: string;
  nickname?: string;
  email?: string;
  photoUrl?: string;
  positions: string[];
  shirtNumber?: number;
  membershipType?: 'subscriber' | 'guest';
  status: 'active' | 'suspended' | 'inactive';
}

export interface Venue {
  id: string;
  organizationId: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  checkinRadius: number;
  requiresGeolocation: boolean;
}

export interface League {
  id: string;
  organizationId: string;
  name: string;
  season: string;
  imageUrl?: string;
  teamIds: string[];
  status: 'active' | 'finished' | 'draft';
  yellowCardLimit: number;
  redCardSuspension: number;
  isPublic?: boolean;
  publishedAt?: string;
}

export interface MatchEvent {
  id: string;
  type: EventType;
  playerId?: string;
  assistPlayerId?: string;
  teamId: string;
  minute: number;
  ownGoal?: boolean;
}

export interface Match {
  id: string;
  organizationId: string;
  leagueId?: string;
  venueId: string;
  homeTeamId: string;
  awayTeamId: string;
  matchType?: MatchType;
  selectedPlayerIds?: string[];
  homePlayerIds?: string[];
  awayPlayerIds?: string[];
  waitingPlayerIds?: string[];
  drawOrder?: string[];
  maxPlayersPerTeam?: number;
  homeTeamName?: string;
  awayTeamName?: string;
  homeTeamColor?: string;
  awayTeamColor?: string;
  drawnAt?: string;
  startsAt: string;
  status: MatchStatus;
  homeScore?: number;
  awayScore?: number;
  requiresGeolocation: boolean;
  events: MatchEvent[];
  notes?: string;
}

export interface PublicMatch extends Match {
  venueName?: string;
  venueAddress?: string;
}

export interface PublicLeagueSnapshot {
  id: string;
  organizationId: string;
  organizationName: string;
  name: string;
  season: string;
  imageUrl?: string;
  teamIds: string[];
  status: League['status'];
  yellowCardLimit: number;
  redCardSuspension: number;
  isPublic: boolean;
  publishedAt: string;
  updatedAt: string;
  teamCount: number;
  playerCount: number;
  matchCount: number;
  finishedMatchCount: number;
  teams: Team[];
  players: Player[];
}

export interface Checkin {
  id: string;
  organizationId: string;
  matchId: string;
  playerId: string;
  checkedAt: string;
  latitude?: number;
  longitude?: number;
  distanceMeters?: number;
  validated: boolean;
}

export interface StatSubmission {
  id: string;
  organizationId: string;
  matchId: string;
  playerId: string;
  teamId: string;
  goals: number;
  assists: number;
  note?: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
}

export interface FinancialSettings {
  id: string;
  organizationId: string;
  monthlyFee: number;
  dueDay: number;
  enabled: boolean;
  updatedAt: string;
}

export interface FinancialCharge {
  id: string;
  organizationId: string;
  playerId: string;
  type: 'monthly' | 'guest' | 'other';
  description: string;
  referenceMonth: string;
  amount: number;
  dueDate: string;
  status: 'pending' | 'paid' | 'cancelled';
  createdAt: string;
  paidAt?: string;
  paymentMethod?: 'pix' | 'cash' | 'transfer' | 'card' | 'other';
  notes?: string;
}

export interface FinancialExpense {
  id: string;
  organizationId: string;
  category: 'venue' | 'referee' | 'equipment' | 'other';
  description: string;
  referenceMonth: string;
  amount: number;
  dueDate: string;
  status: 'pending' | 'paid' | 'cancelled';
  createdAt: string;
  paidAt?: string;
  paymentMethod?: 'pix' | 'cash' | 'transfer' | 'card' | 'other';
  notes?: string;
}

export interface ManagerInvite {
  id: string;
  email: string;
  name: string;
  organizationId: string;
  organizationName: string;
  status: 'pending' | 'accepted' | 'disabled';
  createdAt: string;
  lastAccess?: string;
}

export interface AuditLog {
  id: string;
  organizationId?: string;
  actorName: string;
  action: string;
  entity: string;
  createdAt: string;
}

export interface AppData {
  organizations: Organization[];
  teams: Team[];
  players: Player[];
  venues: Venue[];
  leagues: League[];
  matches: Match[];
  checkins: Checkin[];
  statSubmissions: StatSubmission[];
  financialSettings: FinancialSettings[];
  financialCharges: FinancialCharge[];
  financialExpenses: FinancialExpense[];
  managerInvites: ManagerInvite[];
  auditLogs: AuditLog[];
}
