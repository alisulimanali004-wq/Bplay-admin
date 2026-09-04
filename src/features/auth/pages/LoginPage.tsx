import { useTranslation } from 'react-i18next';
import { AuthCard } from '../components/AuthCard';
import { LoginForm } from '../components/LoginForm';

export default function LoginPage() {
  const { t } = useTranslation();
  return (
    <AuthCard title={t('auth.loginTitle')} subtitle={t('auth.loginSubtitle')}>
      <LoginForm />
    </AuthCard>
  );
}
