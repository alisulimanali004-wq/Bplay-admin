import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useToast } from '@ui';
import { getBookings } from '../api';
import { exportBookings } from '../lib/bookingExport';
import type { BookingListParams } from '../api/booking.types';

/**
 * Export the current view to `.xlsx`: refetch the whole filtered/scoped result
 * set (all pages) with the same params, then write the spreadsheet. Read-only
 * oversight ships view + export only — this is the feature's sole write action.
 */
export function useExportBookings() {
  const toast = useToast();
  const { t, i18n } = useTranslation();
  const locale = i18n.language.startsWith('ar') ? 'ar-SY' : 'en-US';

  return useMutation({
    mutationFn: async (params: BookingListParams) => {
      const result = await getBookings({ ...params, page: 1, pageSize: 100_000 });
      await exportBookings(result.items, t, locale);
    },
    onError: () => toast.error(t('common.loadError')),
  });
}
