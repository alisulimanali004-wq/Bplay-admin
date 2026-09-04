import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '@ui';
import { formatUrlLabel, safeHttpUrl } from '@shared/utils/url';
import type { Player } from '../api/player.types';
import styles from './playerCards.module.css';

interface Props {
  player: Player;
}

/** The player's profile details: gender, DOB, city, join date, sports + skill, bio. */
export function PlayerAboutCard({ player }: Props) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language.startsWith('ar') ? 'ar-SY' : 'en-US';
  const fmtDate = (value?: string) =>
    value
      ? new Date(value).toLocaleDateString(locale, { year: 'numeric', month: 'short', day: 'numeric' })
      : null;

  const dob = fmtDate(player.dateOfBirth);
  const joined = fmtDate(player.createdAt);

  const rows: Array<{ key: string; label: string; value: ReactNode }> = [];
  if (player.gender) rows.push({ key: 'gender', label: t('player.about.gender'), value: t(`player.gender.${player.gender}`) });
  if (dob) rows.push({ key: 'dob', label: t('player.about.dob'), value: dob });
  if (player.city) rows.push({ key: 'city', label: t('player.about.city'), value: player.city });
  if (joined) rows.push({ key: 'joined', label: t('player.about.joined'), value: joined });
  if (player.link) {
    // The link is player-authored: only render it as a link when the scheme is
    // http(s), otherwise a stored `javascript:…` would run with the admin session.
    const href = safeHttpUrl(player.link);
    rows.push({
      key: 'link',
      label: t('player.about.link'),
      value: href ? (
        <a
          className={styles.profileLink}
          href={href}
          target="_blank"
          rel="noreferrer noopener"
          dir="ltr"
        >
          {formatUrlLabel(href)}
        </a>
      ) : (
        <span dir="ltr">{player.link}</span>
      ),
    });
  }

  return (
    <Card padding="lg" className={styles.card} data-testid="player-detail-about">
      <h2 className={styles.title}>{t('player.about.title')}</h2>
      <dl className={styles.rows}>
        {rows.map((row) => (
          <div key={row.key} className={styles.row}>
            <dt className={styles.label}>{row.label}</dt>
            <dd className={styles.value}>{row.value}</dd>
          </div>
        ))}
        <div className={styles.row}>
          <dt className={styles.label}>{t('player.about.sports')}</dt>
          <dd>
            {player.sports.length > 0 ? (
              <span className={styles.tags}>
                {player.sports.map((entry) => (
                  <span key={entry.sport} className={styles.tag}>
                    {t(`player.sport.${entry.sport}`)}
                    <span className={styles.tagLevel}>· {t(`player.skill.${entry.skillLevel}`)}</span>
                  </span>
                ))}
              </span>
            ) : (
              <span className={styles.muted}>—</span>
            )}
          </dd>
        </div>
      </dl>
      {player.bio && (
        <p className={styles.bio} dir="auto">
          {player.bio}
        </p>
      )}
    </Card>
  );
}
