import { useTranslation } from 'react-i18next';
import { IconButton, MenuIcon } from '@ui';
import { useUiStore } from '@shared/stores/uiStore';
import { NotificationBell } from '@features/notifications/components/NotificationBell';
import { LanguageSwitcher } from './LanguageSwitcher';
import styles from './Topbar.module.css';

export function Topbar() {
  const { t } = useTranslation();
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);

  return (
    <header className={styles.topbar}>
      <IconButton
        className={styles.menuButton}
        variant="ghost"
        label={t('common.appName')}
        icon={<MenuIcon />}
        onClick={toggleSidebar}
      />
      <div className={styles.spacer} />
      {/* FR-ADM-SET-006 — the unread counter lives in the shell so it is visible
          from every page, not only from the notification centre. It also owns the
          SSE connection, being the one component mounted for the whole session. */}
      <NotificationBell />
      <LanguageSwitcher />
    </header>
  );
}
