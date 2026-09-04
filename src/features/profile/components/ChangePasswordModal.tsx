import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { Modal, Field, PasswordInput, Button } from '@ui';
import { errorMessageKey, isAppError } from '@shared/lib/errors';
import { changePasswordSchema, type ChangePasswordValues } from '../api/profile.schema';
import { useChangePassword } from '../hooks/useProfileMutations';
import styles from './profileForm.module.css';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export function ChangePasswordModal({ isOpen, onClose }: Props) {
  const { t } = useTranslation();
  const mutation = useChangePassword();
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<ChangePasswordValues>({
    resolver: zodResolver(changePasswordSchema),
    // Validate after a field is touched (then live), so strength / mismatch /
    // "same as current" errors surface as the user types — not only on submit.
    mode: 'onTouched',
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  });

  useEffect(() => {
    if (isOpen) reset();
  }, [isOpen, reset]);

  const submit = handleSubmit(async (values) => {
    try {
      await mutation.mutateAsync({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
        confirmPassword: values.confirmPassword,
      });
      onClose();
    } catch (error) {
      // The backend rejects a wrong current password (ERR_WRONG_PASSWORD) —
      // surface it on that field. The Field renders its message through t(), so
      // prefer the i18n KEY for a code we recognise; an unmapped failure falls
      // back to the server's sentence, which t() passes through unchanged.
      // Handing it the raw English sentence unconditionally showed English to an
      // Arabic admin even for the one error this modal exists to report.
      const key = errorMessageKey(error);
      const serverMessage = isAppError(error) ? error.message : undefined;
      setError('currentPassword', {
        message: key ?? serverMessage ?? 'profile.errors.wrongCurrent',
      });
    }
  });

  const toggles = { showLabel: t('auth.showPassword'), hideLabel: t('auth.hidePassword') };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('profile.password.title')}
      size="sm"
      closeLabel={t('common.close')}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" form="change-password" isLoading={mutation.isPending} data-testid="password-save">
            {t('profile.password.submit')}
          </Button>
        </>
      }
    >
      <form id="change-password" className={styles.form} onSubmit={submit} noValidate>
        <Field
          label={t('profile.password.current')}
          htmlFor="cp-current"
          required
          error={errors.currentPassword ? t(errors.currentPassword.message ?? '') : undefined}
        >
          <PasswordInput
            id="cp-current"
            autoComplete="current-password"
            {...toggles}
            {...register('currentPassword', { deps: ['newPassword'] })}
          />
        </Field>
        <Field
          label={t('profile.password.new')}
          htmlFor="cp-new"
          required
          hint={t('profile.password.hint')}
          error={errors.newPassword ? t(errors.newPassword.message ?? '') : undefined}
        >
          <PasswordInput
            id="cp-new"
            autoComplete="new-password"
            {...toggles}
            {...register('newPassword', { deps: ['confirmPassword'] })}
          />
        </Field>
        <Field
          label={t('profile.password.confirm')}
          htmlFor="cp-confirm"
          required
          error={errors.confirmPassword ? t(errors.confirmPassword.message ?? '') : undefined}
        >
          <PasswordInput id="cp-confirm" autoComplete="new-password" {...toggles} {...register('confirmPassword')} />
        </Field>
      </form>
    </Modal>
  );
}
