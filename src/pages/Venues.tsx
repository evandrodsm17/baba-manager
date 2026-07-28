import { Crosshair, Edit3, MapPin, Navigation, Plus, Radio, Ruler, Trash2 } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { DangerConfirmModal } from '../components/DangerConfirmModal';
import { Badge, Button, EmptyState, Modal, PageHeader } from '../components/UI';
import { GoogleMapPreview } from '../components/GoogleMapPreview';
import { createId, useApp } from '../context/AppContext';
import type { Venue } from '../types';

export function Venues() {
  const { data, currentUser, saveEntity, deleteEntityWithDependencies, notify } = useApp();
  const orgId = currentUser?.organizationId;
  const venues = data.venues.filter((venue) => venue.organizationId === orgId);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Venue | null>(null);
  const [deleting, setDeleting] = useState<Venue | null>(null);
  const [coordinates, setCoordinates] = useState({ latitude: '', longitude: '' });
  const [locating, setLocating] = useState(false);

  const openForm = (venue?: Venue) => {
    setEditing(venue || null);
    setCoordinates({
      latitude: venue ? String(venue.latitude) : '',
      longitude: venue ? String(venue.longitude) : '',
    });
    setModalOpen(true);
  };

  const captureLocation = () => {
    if (!navigator.geolocation) {
      notify('Este navegador não oferece geolocalização.', 'error');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoordinates({ latitude: position.coords.latitude.toFixed(6), longitude: position.coords.longitude.toFixed(6) });
        setLocating(false);
        notify('Coordenadas capturadas.');
      },
      () => {
        setLocating(false);
        notify('Não foi possível acessar sua localização.', 'error');
      },
      { enableHighAccuracy: true, timeout: 12000 },
    );
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const entity: Venue = {
      id: editing?.id || createId('venue'),
      organizationId: orgId || '',
      name: String(form.get('name')).trim(),
      address: String(form.get('address')).trim(),
      latitude: Number(form.get('latitude')),
      longitude: Number(form.get('longitude')),
      checkinRadius: Number(form.get('checkinRadius')) || 200,
      requiresGeolocation: form.get('requiresGeolocation') === 'on',
    };
    await saveEntity('venues', entity, editing ? 'atualizou um local' : 'adicionou um local');
    notify(editing ? 'Local atualizado.' : 'Novo local cadastrado.');
    setModalOpen(false);
  };

  return (
    <>
      <PageHeader eyebrow="CAMPOS E QUADRAS" title="Locais" description="Cadastre coordenadas e defina o raio permitido para check-in." action={<Button icon={Plus} onClick={() => openForm()}>Novo local</Button>} />
      {venues.length ? (
        <div className="venues-grid">
          {venues.map((venue) => (
            <article className="venue-card" key={venue.id}>
              <GoogleMapPreview latitude={venue.latitude} longitude={venue.longitude} label={venue.name} />
              <div className="venue-card__body">
                <div className="venue-card__title">
                  <div><h2>{venue.name}</h2><p>{venue.address}</p></div>
                  <div className="venue-card__actions">
                    <button className="icon-button" type="button" title="Editar local" aria-label={`Editar ${venue.name}`} onClick={() => openForm(venue)}><Edit3 size={17} /></button>
                    <button className="icon-button icon-button--danger" type="button" title="Excluir local" aria-label={`Excluir ${venue.name}`} onClick={() => setDeleting(venue)}><Trash2 size={16} /></button>
                  </div>
                </div>
                <div className="venue-card__meta">
                  <span><Ruler size={16} /><b>{venue.checkinRadius} m</b> de raio</span>
                  {venue.requiresGeolocation ? <Badge tone="lime" dot>Geo obrigatória</Badge> : <Badge tone="neutral">Geo opcional</Badge>}
                </div>
              </div>
            </article>
          ))}
          <button type="button" className="venue-card venue-card--add" onClick={() => openForm()}><span><Plus size={23} /></span><strong>Adicionar local</strong><small>Use as coordenadas do campo</small></button>
        </div>
      ) : <EmptyState title="Nenhum local cadastrado" description="Cadastre um campo ou quadra para liberar o agendamento e o check-in." action={<Button icon={Plus} onClick={() => openForm()}>Cadastrar local</Button>} />}

      <section className="geo-explainer">
        <span><Navigation size={23} /></span>
        <div><h3>Como funciona a validação?</h3><p>No check-in, calculamos a distância entre o celular do jogador e as coordenadas do local. Você decide em cada partida se essa validação será obrigatória.</p></div>
        <Badge tone="success"><Radio size={13} /> Privacidade preservada</Badge>
      </section>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Editar local' : 'Novo local'} description="Use a localização no próprio campo para obter coordenadas mais precisas." size="lg">
        <form className="form" onSubmit={submit}>
          <div className="form-row form-row--2">
            <label><span>Nome do local</span><input name="name" required defaultValue={editing?.name} placeholder="Ex.: Arena Pituaçu" /></label>
            <label><span>Endereço</span><input name="address" required defaultValue={editing?.address} placeholder="Rua, número, cidade" /></label>
          </div>
          <div className="coordinate-box">
            <div className="form-row form-row--2">
              <label><span>Latitude</span><input name="latitude" type="number" step="any" required value={coordinates.latitude} onChange={(event) => setCoordinates({ ...coordinates, latitude: event.target.value })} placeholder="-12.9556" /></label>
              <label><span>Longitude</span><input name="longitude" type="number" step="any" required value={coordinates.longitude} onChange={(event) => setCoordinates({ ...coordinates, longitude: event.target.value })} placeholder="-38.4177" /></label>
            </div>
            <Button type="button" variant="secondary" icon={Crosshair} loading={locating} onClick={captureLocation}>Usar minha localização atual</Button>
          </div>
          <label><span>Raio permitido para check-in</span><div className="input-suffix"><input name="checkinRadius" type="number" min="20" max="5000" defaultValue={editing?.checkinRadius || 200} /><span>metros</span></div></label>
          <label className="toggle-field"><input type="checkbox" name="requiresGeolocation" defaultChecked={editing?.requiresGeolocation ?? true} /><i /><span><strong>Usar geolocalização como padrão</strong><small>Novas partidas neste local virão com a validação habilitada.</small></span></label>
          <div className="form-actions"><Button type="button" variant="ghost" onClick={() => setModalOpen(false)}>Cancelar</Button><Button type="submit" icon={MapPin}>{editing ? 'Salvar alterações' : 'Cadastrar local'}</Button></div>
        </form>
      </Modal>

      <DangerConfirmModal
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        title={`Excluir ${deleting?.name || 'local'}?`}
        description="Partidas associadas a este campo ou quadra não podem permanecer sem local."
        consequences={[
          (() => {
            const count = data.matches.filter((match) => match.venueId === deleting?.id).length;
            return `${count} partida${count === 1 ? '' : 's'} ${count === 1 ? 'será excluída' : 'serão excluídas'}`;
          })(),
          (() => {
            const count = data.checkins.filter((checkin) => data.matches.some((match) => match.id === checkin.matchId && match.venueId === deleting?.id)).length;
            return `${count} check-in${count === 1 ? '' : 's'} vinculado${count === 1 ? '' : 's'} ${count === 1 ? 'será removido' : 'serão removidos'}`;
          })(),
          'Súmulas e envios de estatísticas dessas partidas também serão excluídos',
          'Páginas públicas de ligas afetadas serão atualizadas',
        ]}
        onConfirm={() => deleting
          ? deleteEntityWithDependencies('venues', deleting.id, `o local ${deleting.name}`)
          : Promise.resolve()}
      />
    </>
  );
}
