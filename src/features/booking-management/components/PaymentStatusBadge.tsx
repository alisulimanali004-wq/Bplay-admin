import { useTranslation } from 'react-i18next';
import { Badge } from '@ui';
import { paymentStatusBadgeVariant, type PaymentStatus } from '../api/booking.types';

export interface PaymentStatusBadgeProps {
  status: PaymentStatus;
  size?: 'sm' | 'md';
}

/** The one way to render a payment status — shared status→variant mapping + i18n label. */
export function PaymentStatusBadge({ status, size = 'md' }: PaymentStatusBadgeProps) {
  const { t } = useTranslation();
  return (
    <Badge variant={paymentStatusBadgeVariant(status)} size={size}>
      {t(`booking.paymentStatus.${status}`)}
    </Badge>
  );
}
