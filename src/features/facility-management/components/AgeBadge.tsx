import { useTranslation } from 'react-i18next';
import { Badge, ClockIcon } from '@ui';
import { isAged } from '../api/facility.types';

export interface AgeBadgeProps {
  createdAt: string;
}

/**
 * "Submitted {age}" pill for the review queue. Neutral while fresh; flips to
 * the amber warning pair once the submission has waited over 48h.
 */
export function AgeBadge({ createdAt }: AgeBadgeProps) {
  const { t } = useTranslation();
  const hours = Math.max(0, Math.floor((Date.now() - new Date(createdAt).getTime()) / 3_600_000));
  const age =
    hours < 1
      ? t('facility.age.justNow')
      : hours < 24
        ? t('facility.age.hours', { count: hours })
        : t('facility.age.days', { count: Math.floor(hours / 24) });

  return (
    <Badge variant={isAged(createdAt) ? 'warning' : 'neutral'} size="sm">
      <ClockIcon />
      {t('facility.queue.submitted', { age })}
    </Badge>
  );
}
