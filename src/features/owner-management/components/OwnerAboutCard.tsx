import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, Badge } from '@ui';
import { formatUrlLabel, safeHttpUrl } from '@shared/utils/url';
import { OWNER_TRUST_VARIANT, type Owner } from '../api/owner.types';
import styles from './OwnerAboutCard.module.css';

interface Props {
  owner: Owner;
}

/** The owner's KYC / profile details: legal identity, trust score, revenue, bio. */
export function OwnerAboutCard({ owner }: Props) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language.startsWith('ar') ? 'ar-SY' : 'en-US';

  const dob = owner.dateOfBirth
    ? new Date(owner.dateOfBirth).toLocaleDateString(locale, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : null;
  const revenue =
    typeof owner.monthlyRevenueSyp === 'number'
      ? new Intl.NumberFormat(locale).format(owner.monthlyRevenueSyp)
      : null;
  // The wire carries the tier itself — there is no 0-100 score to derive it from.
  const tier = owner.trustTier;

  const rows: Array<{ key: string; label: string; value: ReactNode }> = [];
  if (owner.legalName) rows.push({ key: 'legal', label: t('owner.about.legalName'), value: owner.legalName });
  if (dob) rows.push({ key: 'dob', label: t('owner.about.dob'), value: dob });
  if (owner.city) rows.push({ key: 'city', label: t('owner.about.city'), value: owner.city });
  if (owner.address) rows.push({ key: 'address', label: t('owner.about.address'), value: owner.address });
  if (owner.link) {
    // Owner-authored: only linkify an http(s) URL — see PlayerAboutCard.
    const href = safeHttpUrl(owner.link);
    rows.push({
      key: 'website',
      label: t('owner.about.website'),
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
        <span dir="ltr">{owner.link}</span>
      ),
    });
  }
  if (owner.intendedFacilityType) {
    rows.push({
      key: 'intent',
      label: t('owner.about.intent'),
      value: t(`owner.intent.${owner.intendedFacilityType}`),
    });
  }
  rows.push({
    key: 'trust',
    label: t('owner.about.trust'),
    value: (
      <Badge variant={OWNER_TRUST_VARIANT[tier]} size="sm">
        {t(`owner.trust.${tier}`)}
      </Badge>
    ),
  });
  if (revenue) {
    rows.push({
      key: 'revenue',
      label: t('owner.about.revenue'),
      value: `${revenue} ${t('owner.about.currency')}`,
    });
  }

  return (
    <Card className={styles.card} data-testid="owner-detail-about">
      <h2 className={styles.title}>{t('owner.about.title')}</h2>
      <dl className={styles.rows}>
        {rows.map((row) => (
          <div key={row.key} className={styles.row}>
            <dt className={styles.label}>{row.label}</dt>
            <dd className={styles.value}>{row.value}</dd>
          </div>
        ))}
      </dl>
      {owner.bio && (
        <p className={styles.bio} dir="auto">
          {owner.bio}
        </p>
      )}
    </Card>
  );
}
