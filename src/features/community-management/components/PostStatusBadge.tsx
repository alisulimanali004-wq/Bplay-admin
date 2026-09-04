import { useTranslation } from 'react-i18next';
import { Badge } from '@ui';
import { moderationBadgeVariant, type ModerationStatus } from '../api/community.types';

/** The moderation-status pill: Published (mint) or Removed (red). */
export function PostStatusBadge({ status }: { status: ModerationStatus }) {
  const { t } = useTranslation();
  return (
    <Badge variant={moderationBadgeVariant(status)} size="sm">
      {t(`community.status.${status}`)}
    </Badge>
  );
}
