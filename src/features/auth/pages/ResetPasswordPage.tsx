import { useTranslation } from 'react-i18next';
import { AuthCard } from '../components/AuthCard';
import { ResetPasswordForm } from '../components/ResetPasswordForm';

export default function ResetPasswordPage() {
  const { t } = useTranslation();
  return (
    <AuthCard title={t('auth.resetTitle')} subtitle={t('auth.resetSubtitle')}>
      <ResetPasswordForm />
    </AuthCard>
  );
}
