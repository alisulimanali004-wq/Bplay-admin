import { AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useToastStore } from './toast';
import { ToastCard } from './ToastCard';
import styles from './Toaster.module.css';

/** Mounts once at the app root (in AppProviders). Renders the live toast stack. */
export function Toaster() {
  const { t } = useTranslation();
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);

  return (
    <div className={styles.host} role="region" aria-live="polite" aria-label={t('common.notifications')}>
      <AnimatePresence initial={false}>
        {toasts.map((toast) => (
          <ToastCard key={toast.id} toast={toast} onDismiss={dismiss} />
        ))}
      </AnimatePresence>
    </div>
  );
}
