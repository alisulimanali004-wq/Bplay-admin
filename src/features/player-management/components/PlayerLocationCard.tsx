import { useTranslation } from 'react-i18next';
import { Card, MapView, EmptyState, MapPinIcon, InboxIcon } from '@ui';
import { formatLatLng, googleMapsLink } from '@shared/lib/geo';
import type { Player } from '../api/player.types';
import styles from './playerCards.module.css';

interface Props {
  player: Player;
}

/**
 * The player's pinned location: an interactive read-only map with a marker, the
 * exact lat/lng, and a link that opens the real Google Maps.
 */
export function PlayerLocationCard({ player }: Props) {
  const { t } = useTranslation();
  const location = player.location;

  return (
    <Card padding="lg" className={styles.card} data-testid="player-location-card">
      <div className={styles.head}>
        <h2 className={styles.title}>
          <MapPinIcon className={styles.titleIcon} />
          {t('player.location.title')}
        </h2>
        {location && (
          <a
            className={styles.mapLink}
            href={googleMapsLink(location.lat, location.lng)}
            target="_blank"
            rel="noreferrer"
            data-testid="player-location-gmaps"
          >
            <MapPinIcon />
            {t('player.location.viewOnMap')}
          </a>
        )}
      </div>

      {location ? (
        <>
          <MapView lat={location.lat} lng={location.lng} />
          <span className={styles.coords} dir="ltr">
            {formatLatLng(location.lat, location.lng)}
          </span>
        </>
      ) : (
        <EmptyState icon={<InboxIcon />} title={t('player.location.empty')} />
      )}
    </Card>
  );
}
