import { ExternalLink, MapPin } from 'lucide-react';

const googleMapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

function googleMapsUrl(latitude: number, longitude: number) {
  return `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
}

export function GoogleMapPreview({
  latitude,
  longitude,
  label,
}: {
  latitude: number;
  longitude: number;
  label: string;
}) {
  const query = encodeURIComponent(`${latitude},${longitude}`);
  const embedUrl = googleMapsApiKey
    ? `https://www.google.com/maps/embed/v1/place?key=${encodeURIComponent(googleMapsApiKey)}&q=${query}&zoom=17&maptype=satellite&language=pt-BR`
    : '';

  return (
    <div className={`mini-map ${embedUrl ? 'mini-map--google' : 'mini-map--fallback'}`}>
      {embedUrl ? (
        <iframe
          src={embedUrl}
          title={`Mapa de ${label}`}
          loading="lazy"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
        />
      ) : (
        <>
          <i className="mini-map__road mini-map__road--a" />
          <i className="mini-map__road mini-map__road--b" />
          <span><MapPin size={22} fill="currentColor" /></span>
        </>
      )}
      <small>{latitude.toFixed(4)}, {longitude.toFixed(4)}</small>
      <a href={googleMapsUrl(latitude, longitude)} target="_blank" rel="noreferrer" aria-label={`Abrir ${label} no Google Maps`}>
        <ExternalLink size={15} /> Google Maps
      </a>
    </div>
  );
}
