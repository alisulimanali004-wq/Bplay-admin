import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Alert, Field, Input, Button } from '@ui';
import { useErrorMessage } from '@shared/hooks/useErrorMessage';
import { PATHS } from '@app/router/paths';
import { forgotSchema, type ForgotValues } from '../api/auth.schema';
import { useForgotPasswordMutation } from '../hooks/useAuthMutations';
import styles from './authForm.module.css';

export function ForgotPasswordForm() {
  const { t } = useTranslation();
  const mutation = useForgotPasswordMutation();
  const failure = useErrorMessage(mutation.error);
  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<ForgotValues>({
    resolver: zodResolver(forgotSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = handleSubmit((values) => mutation.mutate(values));

  // The reset link lands on the backend's own hosted page, so the journey
  // continues in the mailbox — not on another screen here.
  if (mutation.isSuccess) {
    return (
      <div className={styles.form}>
        <Alert variant="success" title={t('auth.forgotSentTitle')}>
          {t('auth.forgotSentBody', { email: getValues('email') })}
        </Alert>
        <p className={styles.note}>{t('auth.forgotSentHint')}</p>
        <Link className={styles.link} to={PATHS.login}>
          {t('auth.backToLogin')}
        </Link>
      </div>
    );
  }

  return (
    <form className={styles.form} onSubmit={onSubmit} noValidate>
      {failure && <Alert variant="error">{failure}</Alert>}
      <Field
        label={t('auth.email')}
        htmlFor="email"
        error={errors.email ? t(errors.email.message ?? '') : undefined}
      >
        <Input id="email" type="email" autoComplete="email" placeholder="admin@bplay.app" {...register('email')} />
      </Field>
      <Button type="submit" fullWidth isLoading={mutation.isPending}>
        {t('auth.sendReset')}
      </Button>
      <Link className={styles.link} to={PATHS.login}>
        {t('auth.backToLogin')}
      </Link>
    </form>
  );
}
