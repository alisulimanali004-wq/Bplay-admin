import { Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useUiStore } from '@shared/stores/uiStore';
import { useSessionBootstrap } from '@features/auth/hooks/useSessionBootstrap';
import { AppSidebar } from './AppSidebar';
import { Topbar } from './Topbar';
import styles from './DashboardLayout.module.css';

export default function DashboardLayout() {
  const { t } = useTranslation();
  const isSidebarOpen = useUiStore((s) => s.isSidebarOpen);
  const closeSidebar = useUiStore((s) => s.closeSidebar);

  // The authenticated shell is the one mount point every signed-in route passes
  // through — re-validate the persisted session here, once per load.
  useSessionBootstrap();

  return (
    <div className={styles.shell}>
      <a href="#main" className="skipLink">
        {t('common.skipToContent')}
      </a>
      <AppSidebar />
      {isSidebarOpen && <div className={styles.overlay} onClick={closeSidebar} />}
      <div className={styles.body}>
        <Topbar />
        <main id="main" className={styles.content}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
