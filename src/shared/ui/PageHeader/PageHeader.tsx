import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { IconButton } from '../IconButton/IconButton';
import { ArrowStartIcon } from '../icons';
import styles from './PageHeader.module.css';

export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  showBack?: boolean;
  onBack?: () => void;
  backLabel?: string;
}

/** The one page title/actions row. A page's <h1> lives only here. */
export function PageHeader({
  title,
  subtitle,
  actions,
  showBack = false,
  onBack,
  backLabel = 'Back',
}: PageHeaderProps) {
  const navigate = useNavigate();
  const back = onBack ?? (showBack ? () => navigate(-1) : undefined);

  return (
    <header className={styles.header}>
      <div className={styles.titleWrap}>
        {back && (
          <IconButton
            variant="ghost"
            label={backLabel}
            icon={<ArrowStartIcon className="flipInRtl" />}
            onClick={back}
          />
        )}
        <div>
          <h1 className={styles.title}>{title}</h1>
          {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
        </div>
      </div>
      {actions && <div className={styles.actions}>{actions}</div>}
    </header>
  );
}
