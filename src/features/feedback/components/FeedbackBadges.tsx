import { useTranslation } from 'react-i18next';
import { Badge } from '@ui';
import {
  feedbackKindBadgeVariant,
  feedbackSenderBadgeVariant,
  feedbackStatusBadgeVariant,
  type FeedbackKind,
  type FeedbackSenderType,
  type FeedbackStatus,
} from '../api/feedback.types';

export function FeedbackStatusBadge({ status }: { status: FeedbackStatus }) {
  const { t } = useTranslation();
  return (
    <Badge variant={feedbackStatusBadgeVariant(status)}>{t(`feedback.status.${status}`)}</Badge>
  );
}

export function FeedbackKindBadge({ kind }: { kind: FeedbackKind }) {
  const { t } = useTranslation();
  return <Badge variant={feedbackKindBadgeVariant(kind)}>{t(`feedback.kind.${kind}`)}</Badge>;
}

export function FeedbackSenderBadge({ type }: { type: FeedbackSenderType }) {
  const { t } = useTranslation();
  return (
    <Badge variant={feedbackSenderBadgeVariant(type)} size="sm">
      {t(`feedback.senderType.${type}`)}
    </Badge>
  );
}
