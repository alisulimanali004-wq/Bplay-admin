import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Button, Input, useToast } from '@ui';
import { strongPassword } from '@shared/lib/validation';
import { useResetAdminPassword } from '../hooks/useAdminMutations';
import type { Admin } from '../api/admin.types';
import styles from './adminForm.module.css';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  admin: Admin | null;
}

/**
 * Sets an admin's password to a value the super-admin chooses.
 *
 * This used to "reset to the original value and reveal it once", which only
 * ever worked against the mock. The real endpoint REQUIRES an explicit
 * `password` in the body, generates nothing, and never echoes a password back —
 * so there is no original to recover and nothing to reveal. The modal therefore
 * collects the new value instead, applying the same strong-password rule as the
 * create form.
 */
export function ResetPasswordModal({ isOpen, onClose, admin }: Props) {
  const { t } = useTranslation();
  const toast = useToast();
  const reset = useResetAdminPassword();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Clear local + mutation state whenever the modal (re)opens — but never
  // auto-fire; a password change must be an explicit, deliberate action.
  useEffect(() => {
    if (isOpen) {
      setPassword('');
      setError(null);
      reset.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, admin]);

  const runReset = async () => {
    if (!admin) return;
    const parsed = strongPassword.safeParse(password);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'admin.errors.passwordWeak');
      return;
    }
    setError(null);
    try {
      await reset.mutateAsync({ id: admin.id, password });
      toast.success(t('admin.reset.doneToast'));
      onClose();
    } catch {
      /* error surfaced via reset.isError below */
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('admin.reset.title')}
      description={admin ? t('admin.reset.subtitle', { name: admin.name }) : undefined}
      size="sm"
      closeLabel={t('common.close')}
      footer={<Button onClick={onClose}>{t('common.close')}</Button>}
    >
      <p className={styles.revealWarn}>{t('admin.reset.confirmHint')}</p>
      <div className={styles.revealField}>
        <Input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          dir="ltr"
          autoComplete="new-password"
          placeholder={t('admin.reset.placeholder')}
          aria-label={t('admin.reset.title')}
          data-testid="admin-reset-value"
        />
      </div>
      {error && (
        <p className={styles.revealWarn} role="alert">
          {t(error)}
        </p>
      )}
      {reset.isError && (
        <p className={styles.revealWarn} role="alert">
          {t('admin.reset.error')}
        </p>
      )}
      <p className={styles.revealWarn}>{t('admin.reset.warn')}</p>
      <Button
        onClick={runReset}
        isLoading={reset.isPending}
        fullWidth
        data-testid="admin-reset-run"
      >
        {t('admin.reset.confirm')}
      </Button>
    </Modal>
  );
}
