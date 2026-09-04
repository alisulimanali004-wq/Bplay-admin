import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Card,
  Badge,
  IconButton,
  RatingStars,
  Spinner,
  EmptyState,
  ErrorState,
  EyeIcon,
  EyeOffIcon,
  InboxIcon,
  clsx,
} from '@ui';
import { PATHS } from '@app/router/paths';
import { type PlayerRating } from '../api/player.types';
import { usePlayerRatings } from '../hooks/usePlayerRelated';
import { useRatingModeration } from '../hooks/usePlayerModeration';
import styles from './playerCards.module.css';

interface Props {
  playerId: string;
}

/**
 * Both directions of a player's ratings.
 *
 * GIVEN — what this player thought of facilities, courts and coaches.
 * RECEIVED — what others thought of THEM, earned per match.
 *
 * The two are shown separately rather than merged: they answer different
 * questions, and when an admin is judging a report the received side is usually
 * the one that matters. Only the given side is moderatable here — hiding a
 * review the player did not write belongs to that reviewer's own record.
 */
export function PlayerRatingsCard({ playerId }: Props) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { data, isLoading, isError, refetch } = usePlayerRatings(playerId);
  const moderation = useRatingModeration(playerId);
  const locale = i18n.language.startsWith('ar') ? 'ar-SY' : 'en-US';
  const ratings = data?.given ?? [];
  const received = data?.received ?? [];
  const averageReceived = data?.averageReceived ?? null;

  const formatDate = (value: string) =>
    new Date(value).toLocaleDateString(locale, { year: 'numeric', month: 'short', day: 'numeric' });

  const toggle = (rating: PlayerRating) =>
    moderation.mutate({ ratingId: rating.id, hidden: !rating.hidden });

  return (
    <Card padding="lg" className={styles.card} data-testid="player-ratings-card">
      <div className={styles.head}>
        <h2 className={styles.title}>{t('player.ratings.received')}</h2>
        {averageReceived !== null && (
          <span className={styles.receivedAvg}>
            <RatingStars value={averageReceived} size="sm" />
            <span dir="ltr">
              {averageReceived.toFixed(1)} · {t('player.ratings.count', { count: received.length })}
            </span>
          </span>
        )}
      </div>

      {isLoading ? (
        <Spinner />
      ) : isError ? (
        <ErrorState
          message={t('common.loadError')}
          retryLabel={t('common.retry')}
          onRetry={() => void refetch()}
        />
      ) : (
        <>
          {received.length === 0 ? (
            <EmptyState icon={<InboxIcon />} title={t('player.ratings.emptyReceived')} />
          ) : (
            <div className={styles.list}>
              {received.map((entry) => (
                <div
                  key={entry.id}
                  className={clsx(styles.ratingRow, entry.hidden && styles.ratingHidden)}
                >
                  <div className={styles.ratingMain}>
                    <div className={styles.ratingHead}>
                      <span className={styles.ratingTarget}>
                        {entry.reviewerName ?? t('player.ratings.unknownReviewer')}
                      </span>
                      <RatingStars value={entry.stars} size="sm" />
                      {entry.hidden && (
                        <Badge variant="danger" size="sm">
                          {t('player.ratings.hiddenTag')}
                        </Badge>
                      )}
                    </div>
                    {entry.comment && <p className={styles.comment}>“{entry.comment}”</p>}
                    <span className={styles.meta}>{formatDate(entry.date)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className={styles.head}>
            <h2 className={styles.title}>{t('player.ratings.given')}</h2>
          </div>

          {ratings.length === 0 ? (
            <EmptyState icon={<InboxIcon />} title={t('player.ratings.empty')} />
          ) : (
            <div className={styles.list}>
          {ratings.map((rating) => (
            <div
              key={rating.id}
              className={clsx(styles.ratingRow, rating.hidden && styles.ratingHidden)}
            >
              <div className={styles.ratingMain}>
                <div className={styles.ratingHead}>
                  {rating.targetId ? (
                    <button
                      type="button"
                      className={styles.linkTarget}
                      onClick={() => navigate(`${PATHS.facilityManagement}/${rating.targetId}`)}
                    >
                      {rating.targetName}
                    </button>
                  ) : (
                    <span className={styles.ratingTarget}>{rating.targetName}</span>
                  )}
                  <Badge variant="neutral" size="sm">
                    {t(`player.ratingTarget.${rating.target}`)}
                  </Badge>
                  <RatingStars value={rating.stars} size="sm" />
                  {rating.hidden && (
                    <Badge variant="danger" size="sm">
                      {t('player.ratings.hiddenTag')}
                    </Badge>
                  )}
                </div>
                {rating.comment && <p className={styles.comment}>“{rating.comment}”</p>}
                <span className={styles.meta}>{formatDate(rating.date)}</span>
              </div>
              <div className={styles.actionsCell}>
                <IconButton
                  size="sm"
                  variant={rating.hidden ? 'ghost' : 'danger'}
                  label={t(rating.hidden ? 'player.ratings.show' : 'player.ratings.hide')}
                  icon={rating.hidden ? <EyeIcon /> : <EyeOffIcon />}
                  onClick={() => toggle(rating)}
                  data-testid={`player-rating-toggle-${rating.id}`}
                />
              </div>
            </div>
              ))}
            </div>
          )}
        </>
      )}
    </Card>
  );
}
