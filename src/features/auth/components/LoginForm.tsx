import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { Alert, Field, Input, PasswordInput, Button } from '@ui';
import { useErrorMessage } from '@shared/hooks/useErrorMessage';
import { loginSchema, type LoginValues } from '../api/auth.schema';
import { useLoginMutation } from '../hooks/useAuthMutations';
import styles from './authForm.module.css';

export function LoginForm() {
  const { t } = useTranslation();
  const mutation = useLoginMutation();
  // Locked, disabled, rate-limited or simply wrong — the reason belongs next to
  // the form, not in a toast that disappears while the admin is still reading it.
  const failure = useErrorMessage(mutation.error);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = handleSubmit((values) => mutation.mutate(values));

  return (
    <form className={styles.form} onSubmit={onSubmit} noValidate>
      {failure && (
        <Alert variant="error" title={t('auth.errors.signInFailed')}>
          {failure}
        </Alert>
      )}
      <Field
        label={t('auth.email')}
        htmlFor="email"
        error={errors.email ? t(errors.email.message ?? '') : undefined}
      >
        <Input id="email" type="email" autoComplete="email" placeholder="admin@bplay.app" {...register('email')} />
      </Field>
      <Field
        label={t('auth.password')}
        htmlFor="password"
        error={errors.password ? t(errors.password.message ?? '') : undefined}
      >
        <PasswordInput
          id="password"
          autoComplete="current-password"
          placeholder="••••••••"
          showLabel={t('auth.showPassword')}
          hideLabel={t('auth.hidePassword')}
          {...register('password')}
        />
      </Field>
      <Button type="submit" fullWidth isLoading={mutation.isPending}>
        {t('auth.signIn')}
      </Button>
    </form>
  );
}
