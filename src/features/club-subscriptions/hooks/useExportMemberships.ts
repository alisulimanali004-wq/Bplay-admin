import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useToast } from '@ui';
import { getMemberships } from '../api';
import type { MembershipListParams } from '../api';
import { exportMemberships } from '../lib/membershipExport';

/**
 * Export the whole filtered set (not just the current page) to `.xlsx`. Re-runs
 * the same query with a large page size, then hands the rows to the exporter.
 */
export function useExportMemberships() {
  const toast = useToast();
  const { t, i18n } = useTranslation();

  return useMutation({
    mutationFn: async (params: MembershipListParams) => {
      const result = await getMemberships({ ...params, page: 1, pageSize: 100_000 });
      const locale = i18n.language.startsWith('ar') ? 'ar-SY' : 'en-US';
      await exportMemberships(result.items, t, locale);
    },
    onError: () => toast.error(t('membership.exportError')),
  });
}
