import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Card, Badge, Button, Spinner, EmptyState, ErrorState, InboxIcon } from '@ui';
import { PATHS } from '@app/router/paths';
import { reportStatusBadgeVariant, type PlayerReport } from '../api/player.types';
import { usePlayerReports } from '../hooks/usePlayerRelated';
import { useReportModeration } from '../hooks/usePlayerModeration';
import styles from './playerCards.module.css';

interface Props {
  playerId: string;
}

/** Reports filed by, or against, the player — with resolve/dismiss moderation. */
export function PlayerReportsCard({ playerId }: Props) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { data, isLoading, isError, refetch } = usePlayerReports(playerId);
  const moderation = useReportModeration(playerId);
  // Scope the in-flight spinner/lockout to the row being moderated.
  const pendingReportId = moderation.isPending ? moderation.variables?.reportId : undefined;
  const locale = i18n.language.startsWith('ar') ? 'ar-SY' : 'en-US';
  const reports = data ?? [];

  const canModerate = (report: PlayerReport) =>
    report.direction === 'against' && (report.status === 'open' || report.status === 'reviewing');

  return (
    <Card padding="lg" className={styles.card} data-testid="player-reports-card">
      <div className={styles.head}>
        <h2 className={styles.title}>{t('player.tabs.reports')}</h2>
      </div>

      {isLoading ? (
        <Spinner />
      ) : isError ? (
        <ErrorState
          message={t('common.loadError')}
          retryLabel={t('common.retry')}
          onRetry={() => void refetch()}
        />
      ) : reports.length === 0 ? (
        <EmptyState icon={<InboxIcon />} title={t('player.reports.empty')} />
      ) : (
        <div className={styles.list}>
          {reports.map((report) => (
            <div key={report.id} className={styles.ratingRow}>
              <div className={styles.ratingMain}>
                <div className={styles.ratingHead}>
                  <Badge variant={report.direction === 'against' ? 'danger' : 'neutral'} size="sm">
                    {t(`player.reports.direction.${report.direction}`)}
                  </Badge>
                  {report.counterpartyId ? (
                    <button
                      type="button"
                      className={styles.linkTarget}
                      onClick={() => navigate(`${PATHS.playerManagement}/${report.counterpartyId}`)}
                    >
                      {report.counterpartyName}
                    </button>
                  ) : (
                    <span className={styles.ratingTarget}>{report.counterpartyName}</span>
                  )}
                  <Badge variant={reportStatusBadgeVariant(report.status)} size="sm">
                    {t(`player.reportStatus.${report.status}`)}
                  </Badge>
                </div>
                <p className={styles.comment}>
                  {report.reason}
                  <span className={styles.muted}> · {t(`player.reports.context.${report.context}`)}</span>
                </p>
                {report.details && <span className={styles.meta}>{report.details}</span>}
                {report.resolutionNote && (
                  <span className={styles.meta}>
                    {t('player.reports.resolution')}: “{report.resolutionNote}”
                  </span>
                )}
                <span className={styles.meta}>
                  {new Date(report.date).toLocaleDateString(locale, {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </span>
              </div>
              {canModerate(report) && (
                <div className={styles.actionsCell}>
                  <Button
                    size="sm"
                    variant="secondary"
                    isLoading={pendingReportId === report.id}
                    onClick={() => moderation.mutate({ reportId: report.id, action: 'resolve' })}
                    data-testid={`player-report-resolve-${report.id}`}
                  >
                    {t('player.reports.resolve')}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    isLoading={pendingReportId === report.id}
                    onClick={() => moderation.mutate({ reportId: report.id, action: 'dismiss' })}
                    data-testid={`player-report-dismiss-${report.id}`}
                  >
                    {t('player.reports.dismiss')}
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
