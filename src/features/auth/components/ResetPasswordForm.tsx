import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { Link, useSearchParams } from 'react-router-dom';
import { Field, PasswordInput, Button } from '@ui';
import { PATHS } from '@app/router/paths';
import { resetSchema, type ResetValues } from '../api/auth.schema';
import { useResetPasswordMutation } from '../hooks/useAuthMutations';
import styles from './authForm.module.css';

export function ResetPasswordForm() {
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const token = params.get('token') ?? 'mock-token';
  const mutation = useResetPasswordMutation();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetValues>({
    resolver: zodResolver(resetSchema),
    defaultValues: { password: '', confirmPassword: '' },
  });

  const onSubmit = handleSubmit((values) => mutation.mutate({ token, password: values.password }));

  return (
    <form className={styles.form} onSubmit={onSubmit} noValidate>
      <Field
        label={t('auth.newPassword')}
        htmlFor="password"
        error={errors.password ? t(errors.password.message ?? '') : undefined}
      >
        <PasswordInput
          id="password"
          autoComplete="new-password"
          showLabel={t('auth.showPassword')}
          hideLabel={t('auth.hidePassword')}
          {...register('password')}
        />
      </Field>
      <Field
        label={t('auth.confirmPassword')}
        htmlFor="confirmPassword"
        error={errors.confirmPassword ? t(errors.confirmPassword.message ?? '') : undefined}
      >
        <PasswordInput
          id="confirmPassword"
          autoComplete="new-password"
          showLabel={t('auth.showPassword')}
          hideLabel={t('auth.hidePassword')}
          {...register('confirmPassword')}
        />
      </Field>
      <Button type="submit" fullWidth isLoading={mutation.isPending}>
        {t('auth.resetSubmit')}
      </Button>
      <Link className={styles.link} to={PATHS.login}>
        {t('auth.backToLogin')}
      </Link>
    </form>
  );
}
