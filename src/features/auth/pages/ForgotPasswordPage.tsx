import { useTranslation } from 'react-i18next';
import { AuthCard } from '../components/AuthCard';
import { ForgotPasswordForm } from '../components/ForgotPasswordForm';

export default function ForgotPasswordPage() {
  const { t } = useTranslation();
  return (
    <AuthCard title={t('auth.forgotTitle')} subtitle={t('auth.forgotSubtitle')}>
      <ForgotPasswordForm />
    </AuthCard>
  );
}
