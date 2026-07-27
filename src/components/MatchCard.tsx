import { ChevronRight, MapPin, Radio } from 'lucide-react';
import type { Match, Team, Venue } from '../types';
import { useNavigate } from '../lib/router';
import { formatMatchDate, getMatchTeams, isDrawMatch } from '../lib/utils';
import { Badge, TeamMark } from './UI';

export function MatchCard({
  match,
  teams,
  venues,
  compact = false,
}: {
  match: Match;
  teams: Team[];
  venues: Venue[];
  compact?: boolean;
}) {
  const navigate = useNavigate();
  const [home, away] = getMatchTeams(match, teams);
  const venue = venues.find((item) => item.id === match.venueId);
  if (!home || !away) return null;

  return (
    <article className={`match-card ${compact ? 'match-card--compact' : ''}`}>
      <div className="match-card__top">
        <Badge
          tone={match.status === 'finished' ? 'neutral' : match.status === 'live' ? 'danger' : 'lime'}
          dot={match.status === 'live'}
        >
          {match.status === 'finished' ? 'Finalizada' : match.status === 'live' ? 'Ao vivo' : formatMatchDate(match.startsAt)}
        </Badge>
        {isDrawMatch(match) && <Badge tone="success">Times sorteados</Badge>}
        {match.requiresGeolocation && <span className="geo-label"><Radio size={13} /> Check-in por localização</span>}
      </div>
      <div className="match-card__versus">
        <div className="match-card__team">
          <TeamMark {...home} size={compact ? 'sm' : 'md'} />
          <strong>{home.name}</strong>
        </div>
        <div className="match-card__score">
          {match.status === 'finished' ? (
            <strong>{match.homeScore} <span>×</span> {match.awayScore}</strong>
          ) : (
            <strong><span>VS</span></strong>
          )}
          <small>{new Date(match.startsAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</small>
        </div>
        <div className="match-card__team">
          <TeamMark {...away} size={compact ? 'sm' : 'md'} />
          <strong>{away.name}</strong>
        </div>
      </div>
      <div className="match-card__bottom">
        <span><MapPin size={14} />{venue?.name || 'Local a definir'}</span>
        <button type="button" onClick={() => navigate(`/partidas/${match.id}`)}>
          Ver detalhes <ChevronRight size={15} />
        </button>
      </div>
    </article>
  );
}
