import type { AppData, UserProfile } from '../types';

const org = 'org-arena-12';
const currentMonth = new Date().toISOString().slice(0, 7);

export const demoUsers: Record<'master' | 'manager' | 'player', UserProfile> = {
  master: {
    id: 'user-master',
    uid: 'demo-master',
    name: 'Evandro Mota',
    email: 'master@babamanager.app',
    role: 'master',
    platformRole: 'master',
    accesses: [
      { id: 'master', role: 'master' },
      { id: 'manager:rafael-demo', role: 'manager', organizationId: org, organizationName: 'Arena do Baba', managerInviteId: 'rafael-demo' },
      { id: 'player:p1', role: 'player', organizationId: org, organizationName: 'Arena do Baba', playerId: 'p1', playerName: 'Carlos Eduardo', teamId: 't1' },
    ],
    active: true,
    lastAccess: new Date().toISOString(),
  },
  manager: {
    id: 'user-manager',
    uid: 'demo-manager',
    name: 'Rafael Torres',
    email: 'rafael@arenadobaba.com',
    role: 'manager',
    organizationId: org,
    managerInviteId: 'rafael@arenadobaba.com',
    accesses: [
      { id: 'manager:rafael@arenadobaba.com', role: 'manager', organizationId: org, organizationName: 'Arena do Baba', managerInviteId: 'rafael@arenadobaba.com' },
      { id: 'player:p1', role: 'player', organizationId: org, organizationName: 'Arena do Baba', playerId: 'p1', playerName: 'Carlos Eduardo', teamId: 't1' },
    ],
    active: true,
    lastAccess: new Date().toISOString(),
  },
  player: {
    id: 'user-player',
    uid: 'demo-player',
    name: 'Carlos Eduardo',
    email: 'cadu@arenadobaba.com',
    role: 'player',
    organizationId: org,
    playerId: 'p1',
    accesses: [
      { id: 'player:p1', role: 'player', organizationId: org, organizationName: 'Arena do Baba', playerId: 'p1', playerName: 'Carlos Eduardo', teamId: 't1' },
      { id: 'manager:rafael@arenadobaba.com', role: 'manager', organizationId: org, organizationName: 'Arena do Baba', managerInviteId: 'rafael@arenadobaba.com' },
    ],
    active: true,
    lastAccess: new Date().toISOString(),
  },
};

export const demoData: AppData = {
  organizations: [
    { id: org, name: 'Arena do Baba', ownerId: 'demo-manager', plan: 'pro', active: true },
    { id: 'org-pelada', name: 'Liga da Pelada', ownerId: 'manager-2', plan: 'starter', active: true },
    { id: 'org-veteranos', name: 'Veteranos FC', ownerId: 'manager-3', plan: 'starter', active: true },
  ],
  teams: [
    { id: 't1', organizationId: org, name: 'Trovão FC', shortName: 'TRO', color: '#c8ff32', playerIds: ['p1', 'p2', 'p3', 'p4'] },
    { id: 't2', organizationId: org, name: 'Atlético do Vale', shortName: 'ATV', color: '#fd6d46', playerIds: ['p5', 'p6', 'p7', 'p8'] },
    { id: 't3', organizationId: org, name: 'Unidos da Vila', shortName: 'UDV', color: '#79a8ff', playerIds: ['p9', 'p10'] },
    { id: 't4', organizationId: org, name: 'Resenha 12', shortName: 'R12', color: '#f7c948', playerIds: [] },
  ],
  players: [
    { id: 'p1', organizationId: org, teamId: 't1', name: 'Carlos Eduardo', nickname: 'Cadu', email: 'cadu@arenadobaba.com', positions: ['Atacante'], shirtNumber: 9, membershipType: 'subscriber', status: 'active' },
    { id: 'p2', organizationId: org, teamId: 't1', name: 'Lucas Nascimento', nickname: 'Luquinhas', positions: ['Meia', 'Atacante'], shirtNumber: 10, membershipType: 'subscriber', status: 'active' },
    { id: 'p3', organizationId: org, teamId: 't1', name: 'Bruno Lima', nickname: 'Brunão', positions: ['Zagueiro'], shirtNumber: 4, membershipType: 'guest', status: 'active' },
    { id: 'p4', organizationId: org, teamId: 't1', name: 'Marcos Paulo', nickname: 'Marquinhos', positions: ['Goleiro'], shirtNumber: 1, membershipType: 'subscriber', status: 'active' },
    { id: 'p5', organizationId: org, teamId: 't2', name: 'Diego Santos', nickname: 'Diego', positions: ['Atacante'], shirtNumber: 11, membershipType: 'subscriber', status: 'active' },
    { id: 'p6', organizationId: org, teamId: 't2', name: 'André Luiz', nickname: 'Deco', positions: ['Meia'], shirtNumber: 8, membershipType: 'guest', status: 'active' },
    { id: 'p7', organizationId: org, teamId: 't2', name: 'Thiago Moreira', nickname: 'Thi', positions: ['Lateral'], shirtNumber: 2, status: 'suspended' },
    { id: 'p8', organizationId: org, teamId: 't2', name: 'Felipe Rocha', positions: ['Goleiro'], shirtNumber: 12, status: 'active' },
    { id: 'p9', organizationId: org, teamId: 't3', name: 'João Pedro', nickname: 'JP', positions: ['Atacante'], shirtNumber: 7, status: 'active' },
    { id: 'p10', organizationId: org, teamId: 't3', name: 'Mateus Costa', positions: ['Volante', 'Zagueiro'], shirtNumber: 5, status: 'active' },
  ],
  venues: [
    { id: 'v1', organizationId: org, name: 'Arena Pituaçu', address: 'Av. Pinto de Aguiar, Salvador - BA', latitude: -12.9556, longitude: -38.4177, checkinRadius: 250, requiresGeolocation: true },
    { id: 'v2', organizationId: org, name: 'Quadra da Vila', address: 'Rua das Acácias, 120 - Salvador', latitude: -12.9712, longitude: -38.5014, checkinRadius: 150, requiresGeolocation: false },
    { id: 'v3', organizationId: org, name: 'Campo do Parque', address: 'Parque da Cidade, Salvador - BA', latitude: -13.0047, longitude: -38.4937, checkinRadius: 300, requiresGeolocation: true },
  ],
  leagues: [
    { id: 'l1', organizationId: org, name: 'Copa Resenha', season: '2026', teamIds: ['t1', 't2', 't3', 't4'], status: 'active', yellowCardLimit: 3, redCardSuspension: 1, isPublic: true, publishedAt: new Date().toISOString() },
    { id: 'l2', organizationId: org, name: 'Torneio de Verão', season: '2026', teamIds: ['t1', 't2'], status: 'finished', yellowCardLimit: 2, redCardSuspension: 1 },
  ],
  matches: [
    { id: 'm1', organizationId: org, leagueId: 'l1', venueId: 'v1', homeTeamId: 't1', awayTeamId: 't2', startsAt: new Date(Date.now() + 86400000).toISOString(), status: 'scheduled', requiresGeolocation: true, events: [] },
    { id: 'm2', organizationId: org, leagueId: 'l1', venueId: 'v2', homeTeamId: 't3', awayTeamId: 't4', startsAt: new Date(Date.now() + 3 * 86400000).toISOString(), status: 'scheduled', requiresGeolocation: false, events: [] },
    {
      id: 'm5', organizationId: org, venueId: 'v2', homeTeamId: 'm5-green', awayTeamId: 'm5-black', matchType: 'draw',
      selectedPlayerIds: ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p8', 'p9'],
      homePlayerIds: [], awayPlayerIds: [], waitingPlayerIds: [],
      drawOrder: ['p5', 'p4', 'p9', 'p1', 'p8', 'p6', 'p2', 'p3'], maxPlayersPerTeam: 3,
      drawnAt: new Date().toISOString(), startsAt: new Date(Date.now() + 12 * 3600000).toISOString(),
      status: 'scheduled', requiresGeolocation: false, events: [], notes: 'Times definidos por sorteio entre os participantes.',
    },
    {
      id: 'm3', organizationId: org, leagueId: 'l1', venueId: 'v3', homeTeamId: 't1', awayTeamId: 't3',
      startsAt: new Date(Date.now() - 6 * 86400000).toISOString(), status: 'finished', homeScore: 3, awayScore: 1, requiresGeolocation: true,
      events: [
        { id: 'e1', type: 'goal', playerId: 'p1', assistPlayerId: 'p2', teamId: 't1', minute: 12 },
        { id: 'e2', type: 'goal', playerId: 'p1', assistPlayerId: 'p3', teamId: 't1', minute: 31 },
        { id: 'e3', type: 'goal', playerId: 'p2', assistPlayerId: 'p1', teamId: 't1', minute: 42 },
        { id: 'e4', type: 'goal', playerId: 'p9', teamId: 't3', minute: 49 },
        { id: 'e5', type: 'yellow', playerId: 'p3', teamId: 't1', minute: 37 },
      ],
    },
    {
      id: 'm4', organizationId: org, leagueId: 'l1', venueId: 'v1', homeTeamId: 't2', awayTeamId: 't3',
      startsAt: new Date(Date.now() - 13 * 86400000).toISOString(), status: 'finished', homeScore: 2, awayScore: 2, requiresGeolocation: true,
      events: [
        { id: 'e6', type: 'goal', playerId: 'p5', assistPlayerId: 'p6', teamId: 't2', minute: 8 },
        { id: 'e7', type: 'goal', playerId: 'p6', teamId: 't2', minute: 25 },
        { id: 'e8', type: 'goal', playerId: 'p9', assistPlayerId: 'p10', teamId: 't3', minute: 34 },
        { id: 'e9', type: 'goal', playerId: 'p9', teamId: 't3', minute: 53 },
        { id: 'e10', type: 'red', playerId: 'p7', teamId: 't2', minute: 48 },
      ],
    },
  ],
  checkins: [
    { id: 'c1', organizationId: org, matchId: 'm3', playerId: 'p1', checkedAt: new Date(Date.now() - 6 * 86400000).toISOString(), distanceMeters: 42, validated: true },
    { id: 'c2', organizationId: org, matchId: 'm3', playerId: 'p2', checkedAt: new Date(Date.now() - 6 * 86400000).toISOString(), distanceMeters: 88, validated: true },
    { id: 'c-m5-1', organizationId: org, matchId: 'm5', playerId: 'p3', checkedAt: new Date(Date.now() - 42 * 60000).toISOString(), validated: true },
    { id: 'c-m5-2', organizationId: org, matchId: 'm5', playerId: 'p1', checkedAt: new Date(Date.now() - 39 * 60000).toISOString(), validated: true },
    { id: 'c-m5-3', organizationId: org, matchId: 'm5', playerId: 'p4', checkedAt: new Date(Date.now() - 35 * 60000).toISOString(), validated: true },
    { id: 'c-m5-4', organizationId: org, matchId: 'm5', playerId: 'p2', checkedAt: new Date(Date.now() - 30 * 60000).toISOString(), validated: true },
    { id: 'c-m5-5', organizationId: org, matchId: 'm5', playerId: 'p8', checkedAt: new Date(Date.now() - 24 * 60000).toISOString(), validated: true },
    { id: 'c-m5-6', organizationId: org, matchId: 'm5', playerId: 'p5', checkedAt: new Date(Date.now() - 18 * 60000).toISOString(), validated: true },
    { id: 'c-m5-7', organizationId: org, matchId: 'm5', playerId: 'p6', checkedAt: new Date(Date.now() - 12 * 60000).toISOString(), validated: true },
  ],
  statSubmissions: [
    {
      id: 'm3-p1',
      organizationId: org,
      matchId: 'm3',
      playerId: 'p1',
      teamId: 't1',
      goals: 2,
      assists: 1,
      note: 'Dois gols no primeiro tempo e uma assistência.',
      status: 'pending',
      createdAt: new Date(Date.now() - 45 * 60000).toISOString(),
    },
  ],
  financialSettings: [
    { id: org, organizationId: org, monthlyFee: 80, dueDay: 10, enabled: true, updatedAt: new Date().toISOString() },
  ],
  financialCharges: [
    {
      id: `monthly-${currentMonth}-p1`, organizationId: org, playerId: 'p1', type: 'monthly',
      description: `Mensalidade ${currentMonth}`, referenceMonth: currentMonth, amount: 80,
      dueDate: `${currentMonth}-10`, status: 'paid', createdAt: `${currentMonth}-01T12:00:00.000Z`,
      paidAt: `${currentMonth}-08T18:30:00.000Z`, paymentMethod: 'pix',
    },
    {
      id: `monthly-${currentMonth}-p2`, organizationId: org, playerId: 'p2', type: 'monthly',
      description: `Mensalidade ${currentMonth}`, referenceMonth: currentMonth, amount: 80,
      dueDate: `${currentMonth}-10`, status: 'pending', createdAt: `${currentMonth}-01T12:00:00.000Z`,
    },
    {
      id: `monthly-${currentMonth}-p4`, organizationId: org, playerId: 'p4', type: 'monthly',
      description: `Mensalidade ${currentMonth}`, referenceMonth: currentMonth, amount: 80,
      dueDate: `${currentMonth}-10`, status: 'paid', createdAt: `${currentMonth}-01T12:00:00.000Z`,
      paidAt: `${currentMonth}-09T20:00:00.000Z`, paymentMethod: 'cash',
    },
    {
      id: `guest-${currentMonth}-p3`, organizationId: org, playerId: 'p3', type: 'guest',
      description: 'Participação avulsa', referenceMonth: currentMonth, amount: 25,
      dueDate: `${currentMonth}-20`, status: 'pending', createdAt: `${currentMonth}-15T12:00:00.000Z`,
    },
  ],
  financialExpenses: [
    {
      id: `expense-venue-${currentMonth}`, organizationId: org, category: 'venue',
      description: 'Aluguel da quadra', referenceMonth: currentMonth, amount: 240,
      dueDate: `${currentMonth}-05`, status: 'paid', createdAt: `${currentMonth}-01T12:00:00.000Z`,
      paidAt: `${currentMonth}-05T15:00:00.000Z`, paymentMethod: 'pix',
    },
    {
      id: `expense-equipment-${currentMonth}`, organizationId: org, category: 'equipment',
      description: 'Bolas e coletes', referenceMonth: currentMonth, amount: 95,
      dueDate: `${currentMonth}-28`, status: 'pending', createdAt: `${currentMonth}-18T12:00:00.000Z`,
    },
  ],
  managerInvites: [
    { id: 'rafael@arenadobaba.com', email: 'rafael@arenadobaba.com', name: 'Rafael Torres', organizationId: org, organizationName: 'Arena do Baba', status: 'accepted', createdAt: '2026-01-12T12:00:00.000Z', lastAccess: new Date(Date.now() - 3600000).toISOString() },
    { id: 'marina@ligadapelada.com', email: 'marina@ligadapelada.com', name: 'Marina Alves', organizationId: 'org-pelada', organizationName: 'Liga da Pelada', status: 'accepted', createdAt: '2026-02-03T12:00:00.000Z', lastAccess: new Date(Date.now() - 2 * 86400000).toISOString() },
    { id: 'paulo@veteranosfc.com', email: 'paulo@veteranosfc.com', name: 'Paulo Nunes', organizationId: 'org-veteranos', organizationName: 'Veteranos FC', status: 'pending', createdAt: new Date(Date.now() - 86400000).toISOString() },
  ],
  auditLogs: [
    { id: 'a1', organizationId: org, actorName: 'Rafael Torres', action: 'registrou o placar', entity: 'Trovão FC 3 × 1 Unidos da Vila', createdAt: new Date(Date.now() - 2 * 3600000).toISOString() },
    { id: 'a2', organizationId: org, actorName: 'Rafael Torres', action: 'adicionou um jogador', entity: 'Mateus Costa', createdAt: new Date(Date.now() - 9 * 3600000).toISOString() },
    { id: 'a3', organizationId: 'org-pelada', actorName: 'Marina Alves', action: 'criou uma partida', entity: 'Final da Liga da Pelada', createdAt: new Date(Date.now() - 86400000).toISOString() },
    { id: 'a4', organizationId: 'org-veteranos', actorName: 'Paulo Nunes', action: 'criou uma equipe', entity: 'Veteranos FC', createdAt: new Date(Date.now() - 2 * 86400000).toISOString() },
  ],
};
