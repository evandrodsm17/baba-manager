import { CheckCircle2, Clock3, LocateFixed, MapPin, Navigation, Radio, ShieldCheck, Smartphone, Wifi } from 'lucide-react';
import { useState } from 'react';
import { MatchCard } from '../components/MatchCard';
import { Badge, Button, EmptyState, PageHeader, SuccessSeal } from '../components/UI';
import { createId, useApp } from '../context/AppContext';
import { formatLongDate, haversineDistance } from '../lib/utils';
import type { Checkin } from '../types';

type CheckinState = 'idle' | 'locating' | 'success' | 'outside' | 'error';

export function CheckinPage() {
  const { data, currentUser, saveEntity, notify, isDemo } = useApp();
  const [state, setState] = useState<CheckinState>('idle');
  const [distance, setDistance] = useState<number>();
  const player = data.players.find((item) => item.id === currentUser?.playerId);
  const team = data.teams.find((item) => item.id === player?.teamId);
  const nextMatch = data.matches
    .filter((match) => match.status === 'scheduled' && (match.homeTeamId === team?.id || match.awayTeamId === team?.id))
    .sort((a, b) => +new Date(a.startsAt) - +new Date(b.startsAt))[0];
  const venue = data.venues.find((item) => item.id === nextMatch?.venueId);
  const existing = data.checkins.find((item) => item.matchId === nextMatch?.id && item.playerId === player?.id && item.validated);

  const persistCheckin = async (latitude?: number, longitude?: number, measuredDistance?: number) => {
    if (!nextMatch || !player) return;
    const entity: Checkin = {
      id: createId('checkin'),
      organizationId: player.organizationId,
      matchId: nextMatch.id,
      playerId: player.id,
      checkedAt: new Date().toISOString(),
      latitude,
      longitude,
      distanceMeters: measuredDistance,
      validated: true,
    };
    await saveEntity('checkins', entity, 'realizou check-in');
    setDistance(measuredDistance);
    setState('success');
    notify('Presença confirmada. Bom jogo!');
  };

  const checkin = async (simulate = false) => {
    if (!nextMatch || !venue || !player) return;
    if (existing) {
      setState('success');
      return;
    }
    if (!nextMatch.requiresGeolocation) {
      await persistCheckin();
      return;
    }
    setState('locating');
    if (simulate) {
      await new Promise((resolve) => window.setTimeout(resolve, 850));
      await persistCheckin(venue.latitude, venue.longitude, 18);
      return;
    }
    if (!navigator.geolocation) {
      setState('error');
      return;
    }
    navigator.geolocation.getCurrentPosition(async (position) => {
      const measured = haversineDistance(
        position.coords.latitude,
        position.coords.longitude,
        venue.latitude,
        venue.longitude,
      );
      setDistance(measured);
      if (measured > venue.checkinRadius) {
        setState('outside');
        return;
      }
      await persistCheckin(position.coords.latitude, position.coords.longitude, measured);
    }, () => setState('error'), { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 });
  };

  if (!nextMatch || !venue || !team) {
    return (
      <>
        <PageHeader eyebrow="PRESENÇA" title="Check-in" description="Confirme sua chegada às próximas partidas." />
        <EmptyState title="Nenhuma partida disponível" description="Assim que seu gerenciador agendar um jogo da sua equipe, o check-in aparecerá aqui." />
      </>
    );
  }

  const successful = state === 'success' || Boolean(existing);

  return (
    <>
      <PageHeader eyebrow="PRESENÇA" title="Check-in da partida" description="Confirme que você chegou ao local do jogo." />
      <div className="checkin-layout">
        <section className="checkin-card">
          <div className="checkin-card__visual">
            <div className="checkin-radar">
              <i /><i /><i />
              <span className={successful ? 'success' : ''}>{successful ? <CheckCircle2 size={30} /> : <LocateFixed size={30} />}</span>
            </div>
          </div>
          <div className="checkin-card__content">
            {successful ? (
              <div className="checkin-success">
                <SuccessSeal />
                <span className="eyebrow">PRESENÇA CONFIRMADA</span>
                <h2>Você está no jogo!</h2>
                <p>Seu check-in foi validado{distance ? ` a ${Math.round(distance)} metros do ponto central` : ''}.</p>
                <Badge tone="success"><ShieldCheck size={14} /> Localização validada</Badge>
              </div>
            ) : state === 'outside' ? (
              <div className="checkin-message checkin-message--error">
                <span><Navigation size={25} /></span><h2>Você está fora do raio</h2>
                <p>Sua distância é de aproximadamente <strong>{Math.round(distance || 0)} m</strong>. Aproxime-se do local e tente novamente.</p>
                <Button onClick={() => checkin()} icon={LocateFixed}>Tentar novamente</Button>
              </div>
            ) : state === 'error' ? (
              <div className="checkin-message checkin-message--error">
                <span><Smartphone size={25} /></span><h2>Localização indisponível</h2>
                <p>Ative a permissão de localização do navegador e tente novamente.</p>
                <Button onClick={() => checkin()} icon={LocateFixed}>Tentar novamente</Button>
              </div>
            ) : (
              <div className="checkin-message">
                <span className="eyebrow"><Radio size={14} /> VALIDAÇÃO SEGURA</span>
                <h2>{state === 'locating' ? 'Localizando você...' : 'Confirme sua chegada'}</h2>
                <p>{state === 'locating' ? 'Aguarde enquanto obtemos a posição mais precisa do seu celular.' : `Você precisa estar a até ${venue.checkinRadius} metros do local da partida.`}</p>
                <Button loading={state === 'locating'} onClick={() => checkin()} icon={LocateFixed}>Usar minha localização</Button>
                {isDemo && state !== 'locating' && <button className="demo-location" type="button" onClick={() => checkin(true)}>Simular presença no local</button>}
              </div>
            )}
          </div>
        </section>

        <aside className="checkin-aside">
          <MatchCard match={nextMatch} teams={data.teams} venues={data.venues} compact />
          <section className="panel checkin-info">
            <h3>Detalhes do check-in</h3>
            <div><span><MapPin size={17} /></span><p><small>Local</small><strong>{venue.name}</strong></p></div>
            <div><span><Clock3 size={17} /></span><p><small>Início</small><strong>{formatLongDate(nextMatch.startsAt)}</strong></p></div>
            <div><span><Wifi size={17} /></span><p><small>Raio autorizado</small><strong>{venue.checkinRadius} metros</strong></p></div>
          </section>
          <p className="privacy-note"><ShieldCheck size={15} /> Sua localização é usada somente para validar este check-in.</p>
        </aside>
      </div>
    </>
  );
}
