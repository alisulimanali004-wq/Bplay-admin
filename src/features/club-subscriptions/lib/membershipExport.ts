import type { TFunction } from 'i18next';
import { exportToXlsx, type XlsxColumn } from '@shared/lib/exportXlsx';
import type { MembershipListItem } from '../api';

/**
 * Export the already-filtered, already-scoped membership rows to an `.xlsx`.
 * Read-only: turns the current oversight list into a downloadable spreadsheet.
 */
export function exportMemberships(
  items: MembershipListItem[],
  t: TFunction,
  locale: string,
): Promise<void> {
  const nf = new Intl.NumberFormat(locale);
  const fmt = (value: string): string =>
    new Date(value).toLocaleDateString(locale, { year: 'numeric', month: 'short', day: 'numeric' });

  const columns: XlsxColumn<MembershipListItem>[] = [
    { header: t('membership.col.player'), value: (m) => m.playerName },
    { header: t('membership.col.club'), value: (m) => m.clubName },
    { header: t('membership.col.plan'), value: (m) => m.planName },
    { header: t('membership.detail.planType'), value: (m) => t(`membership.planType.${m.planType}`) },
    { header: t('membership.col.status'), value: (m) => t(`membership.status.${m.status}`) },
    {
      header: t('membership.col.segments'),
      value: (m) => m.segments.map((segment) => t(`membership.segment.${segment}`)).join(', '),
    },
    { header: t('membership.detail.start'), value: (m) => fmt(m.startDate) },
    { header: t('membership.detail.end'), value: (m) => fmt(m.endDate) },
    {
      header: `${t('membership.col.price')} (${t('membership.currency')})`,
      value: (m) => nf.format(m.priceSyp),
    },
  ];

  return exportToXlsx('bplay-club-subscriptions', t('membership.title'), columns, items);
}
