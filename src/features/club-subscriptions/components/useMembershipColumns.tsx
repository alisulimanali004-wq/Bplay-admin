import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Avatar, UserCell, type Column } from '@ui';
import { PlanCell } from './PlanCell';
import { SegmentBadges } from './SegmentBadges';
import { MembershipStatusBadge } from './MembershipStatusBadge';
import type { MembershipListItem, MembershipSortBy } from '../api';
import styles from './useMembershipColumns.module.css';

export interface UseMembershipColumnsOptions {
  /** Open the player's profile (the cell stops row-click propagation itself). */
  onPlayerClick: (playerId: string) => void;
  /** Open the club's facility profile (the cell stops row-click propagation itself). */
  onClubClick: (clubId: string) => void;
}

/** Maps a sortable column key to the list param it sorts by. */
export const SORT_BY_COLUMN: Record<string, MembershipSortBy> = {
  period: 'startDate',
  price: 'priceSyp',
};

/**
 * The oversight table columns: clickable player cell, clickable club cell,
 * plan, membership period (sortable), segment badges, status and a right-aligned
 * price (sortable).
 */
export function useMembershipColumns({
  onPlayerClick,
  onClubClick,
}: UseMembershipColumnsOptions): Column<MembershipListItem>[] {
  const { t, i18n } = useTranslation();
  const locale = i18n.language.startsWith('ar') ? 'ar-SY' : 'en-US';

  return useMemo<Column<MembershipListItem>[]>(() => {
    const nf = new Intl.NumberFormat(locale);
    const fmt = (value: string): string =>
      new Date(value).toLocaleDateString(locale, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });

    return [
      {
        key: 'player',
        header: t('membership.col.player'),
        render: (item) => (
          <UserCell
            name={item.playerName}
            photoUrl={item.playerPhotoUrl}
            onClick={() => onPlayerClick(item.playerId)}
            testId={`membership-player-${item.id}`}
          />
        ),
      },
      {
        key: 'club',
        header: t('membership.col.club'),
        render: (item) => (
          <button
            type="button"
            className={styles.clubLink}
            onClick={(event) => {
              event.stopPropagation();
              onClubClick(item.clubId);
            }}
            data-testid={`membership-club-link-${item.id}`}
          >
            <Avatar src={item.clubLogoUrl} name={item.clubName} size="sm" />
            <span className={styles.clubName}>{item.clubName}</span>
          </button>
        ),
      },
      {
        key: 'plan',
        header: t('membership.col.plan'),
        render: (item) => <PlanCell planName={item.planName} planType={item.planType} />,
      },
      {
        key: 'period',
        header: t('membership.col.period'),
        sortable: true,
        render: (item) => (
          <span className={styles.period} dir="ltr">
            {fmt(item.startDate)} – {fmt(item.endDate)}
          </span>
        ),
      },
      {
        key: 'segments',
        header: t('membership.col.segments'),
        render: (item) =>
          item.segments.length === 0 ? <span aria-hidden>&mdash;</span> : <SegmentBadges segments={item.segments} />,
      },
      {
        key: 'status',
        header: t('membership.col.status'),
        render: (item) => <MembershipStatusBadge status={item.status} />,
      },
      {
        key: 'price',
        header: t('membership.col.price'),
        align: 'end',
        sortable: true,
        render: (item) => (
          <span className={styles.price}>
            {nf.format(item.priceSyp)} {t('membership.currency')}
          </span>
        ),
      },
    ];
  }, [t, locale, onPlayerClick, onClubClick]);
}
