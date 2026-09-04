import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button, EmptyState, GlobeIcon } from '@ui';
import { PATHS } from '@app/router/paths';
import styles from './NotFound.module.css';

/** Catch-all 404 — a full-viewport, design-system, localized page (RTL-safe). */
export default function NotFound() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className={styles.host}>
      <span className={styles.code} aria-hidden>
        404
      </span>
      <EmptyState
        icon={<GlobeIcon />}
        title={t('common.notFound.title')}
        description={t('common.notFound.message')}
        action={
          <Button onClick={() => navigate(PATHS.app)}>{t('common.notFound.backHome')}</Button>
        }
      />
    </div>
  );
}
