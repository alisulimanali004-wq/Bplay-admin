import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Avatar,
  Card,
  ClockIcon,
  EmptyState,
  ErrorState,
  GlobeIcon,
  InboxIcon,
  InfoIcon,
  MapPinIcon,
  PageContainer,
  PageHeader,
  RegionTag,
  Spinner,
} from '@ui';
import { PATHS } from '@app/router/paths';
import { useFeedbackQuery } from '../hooks/useFeedbackQuery';
import { useFeedbackFormat } from '../hooks/useFeedbackFormat';
import { FeedbackKindBadge, FeedbackSenderBadge, FeedbackStatusBadge } from '../components/FeedbackBadges';
import { FeedbackAttachments } from '../components/FeedbackAttachments';
import { FeedbackThread, FeedbackThreadHeading } from '../components/FeedbackThread';
import { FeedbackStatusActions } from '../components/FeedbackStatusActions';
import { ReplyComposer } from '../components/ReplyComposer';
import type { Feedback } from '../api/feedback.types';
import styles from './FeedbackDetailPage.module.css';

/** The exact phrase the api throws — kept in sync with feedback.api.mock.ts. */
const NOT_FOUND_MESSAGE = 'Feedback not found';

export default function FeedbackDetailPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { feedbackId } = useParams<{ feedbackId: string }>();
  const { data, isLoading, isError, error, refetch } = useFeedbackQuery(feedbackId);

  // An out-of-scope id fails as "not found" on purpose: a regional admin must not
  // be able to tell the difference between "does not exist" and "not yours".
  const isNotFound =
    (isError && error instanceof Error && error.message === NOT_FOUND_MESSAGE) ||
    (!isLoading && !isError && !data);

  return (
    <PageContainer>
      <PageHeader
        title={
          data
            ? t('feedback.detail.pageTitle', {
                kind: t(`feedback.kind.${data.kind}`),
                name: data.sender.name,
              })
            : t('feedback.title')
        }
        subtitle={data ? t('feedback.subtitle') : undefined}
        showBack
        onBack={() => navigate(PATHS.feedback)}
        backLabel={t('common.back')}
        actions={data ? <FeedbackStatusActions feedback={data} /> : undefined}
      />

      {isLoading ? (
        <div className={styles.center}>
          <Spinner size="lg" label={t('common.loading')} />
        </div>
      ) : isNotFound ? (
        <EmptyState
          icon={<InboxIcon />}
          title={t('feedback.detail.notFound')}
          description={t('feedback.detail.notFoundDesc')}
        />
      ) : isError || !data ? (
        <ErrorState
          title={t('feedback.state.errorTitle')}
          message={t('common.loadError')}
          retryLabel={t('common.retry')}
          onRetry={() => void refetch()}
        />
      ) : (
        <FeedbackDetailContent feedback={data} />
      )}
    </PageContainer>
  );
}

function FeedbackDetailContent({ feedback }: { feedback: Feedback }) {
  const { t } = useTranslation();
  const fmt = useFeedbackFormat();

  return (
    <div className={styles.page}>
      <Card padding="lg">
        <div className={styles.senderRow}>
          <Avatar src={feedback.sender.photoUrl} name={feedback.sender.name} size="lg" />
          <div className={styles.senderMain}>
            <span className={styles.senderName}>{feedback.sender.name}</span>
            {feedback.sender.email && (
              <span className={styles.senderEmail} dir="ltr">
                {feedback.sender.email}
              </span>
            )}
            <div className={styles.badges}>
              <FeedbackSenderBadge type={feedback.sender.type} />
              <FeedbackKindBadge kind={feedback.kind} />
              <FeedbackStatusBadge status={feedback.status} />
            </div>
          </div>
        </div>

        <dl className={styles.meta}>
          {feedback.sender.city && (
            <div className={styles.metaItem}>
              <dt>
                <MapPinIcon />
                {t('feedback.detail.city')}
              </dt>
              <dd>{feedback.sender.city}</dd>
            </div>
          )}
          <div className={styles.metaItem}>
            <dt>
              <GlobeIcon />
              {t('feedback.col.region')}
            </dt>
            <dd>
              <RegionTag regionNames={feedback.regionNames} isOrphan={feedback.isOrphan} />
            </dd>
          </div>
          <div className={styles.metaItem}>
            <dt>
              <ClockIcon />
              {t('feedback.detail.received')}
            </dt>
            <dd>{fmt.dateTime(feedback.createdAt)}</dd>
          </div>
          {/* Present on a `technical` report only — the app attaches it so the
              team can reproduce the bug instead of asking for the version. */}
          {feedback.deviceContext && (
            <div className={styles.metaItem}>
              <dt>
                <InfoIcon />
                {t('feedback.detail.device')}
              </dt>
              {/* `dir="ltr"` + <bdi>: a version/build string must not be
                  re-ordered by the surrounding Arabic paragraph. */}
              <dd dir="ltr" className={styles.deviceContext}>
                <bdi>
                  {[
                    `v${feedback.deviceContext.appVersion}`,
                    feedback.deviceContext.platform,
                    feedback.deviceContext.deviceModel,
                    feedback.deviceContext.osVersion,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </bdi>
              </dd>
            </div>
          )}
        </dl>

        {/* The sender's message. A plain text node — React escapes it, and the
            CSS keeps their line breaks without letting a long token overflow. */}
        <p className={styles.body} dir="auto" data-testid="feedback-body">
          {feedback.body}
        </p>

        <FeedbackAttachments attachments={feedback.attachments} />

        {feedback.status === 'closed' && feedback.closedAt && (
          <p className={styles.closedNote}>
            {t('feedback.detail.closedBy', {
              name: feedback.closedByName ?? '—',
              date: fmt.dateTime(feedback.closedAt),
            })}
          </p>
        )}
      </Card>

      <Card padding="lg">
        <FeedbackThreadHeading count={feedback.replyCount} />
        <FeedbackThread replies={feedback.replies} />
      </Card>

      <Card padding="lg">
        <ReplyComposer feedback={feedback} />
      </Card>
    </div>
  );
}
