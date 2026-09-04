import { useTranslation } from 'react-i18next';
import { Badge } from '@ui';
import { memberSegmentBadgeVariant, type MemberSegment } from '../api';
import styles from './SegmentBadges.module.css';

export interface SegmentBadgesProps {
  segments: MemberSegment[];
}

/** Renders one small Badge per member segment; nothing when the member has none. */
export function SegmentBadges({ segments }: SegmentBadgesProps) {
  const { t } = useTranslation();
  if (segments.length === 0) return null;
  return (
    <span className={styles.wrap}>
      {segments.map((segment) => (
        <Badge key={segment} variant={memberSegmentBadgeVariant[segment]} size="sm">
          {t(`membership.segment.${segment}`)}
        </Badge>
      ))}
    </span>
  );
}
