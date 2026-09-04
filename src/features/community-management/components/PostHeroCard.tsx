import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Card,
  Badge,
  ImageLightbox,
  PlayIcon,
  MessageCircleIcon,
  ShareIcon,
  ImageIcon,
  Thumb,
  type LightboxItem,
} from '@ui';
import { useDisclosure } from '@shared/hooks/useDisclosure';
import { postMedia, type Post } from '../api/community.types';
import { AuthorCell } from './AuthorCell';
import { PostStatusBadge } from './PostStatusBadge';
import { PostReactionsSummary } from './PostReactionsSummary';
import styles from './communityCards.module.css';

interface Props {
  post: Post;
}

/** The post detail identity + content block: author, badges, body, media gallery, engagement. */
export function PostHeroCard({ post }: Props) {
  const { t, i18n } = useTranslation();
  const lightbox = useDisclosure();
  const [startIndex, setStartIndex] = useState(0);

  const media = postMedia(post);
  // PostMedia ({ kind, src }) is already assignable to LightboxItem (alt is optional).
  const items: LightboxItem[] = media;
  const removed = post.moderationStatus === 'removed';
  const locale = i18n.language.startsWith('ar') ? 'ar-SY' : 'en-US';
  const created = new Date(post.createdAt).toLocaleDateString(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  const removedAt = post.removedAt
    ? new Date(post.removedAt).toLocaleDateString(locale, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : null;

  const openMedia = (index: number) => {
    setStartIndex(index);
    lightbox.open();
  };

  return (
    <Card padding="lg" className={styles.hero} data-testid="post-hero">
      <div className={styles.heroHead}>
        <AuthorCell actor={post.author} subtitle={created} />
        <div className={styles.badges}>
          <Badge variant={post.visibility === 'public' ? 'info' : 'neutral'} size="sm">
            {t(`community.visibility.${post.visibility}`)}
          </Badge>
          <PostStatusBadge status={post.moderationStatus} />
        </div>
      </div>

      {removed && (
        <div className={styles.removedBanner}>
          <span className={styles.removedTitle}>{t('community.moderation.removedTitle')}</span>
          {post.removedReason && <span className={styles.removedText}>{post.removedReason}</span>}
          {(post.removedBy || removedAt) && (
            <span className={styles.removedMeta}>
              {t('community.moderation.removedBy', {
                name: post.removedBy ?? '—',
                date: removedAt ?? '—',
              })}
            </span>
          )}
        </div>
      )}

      {post.body && <p className={styles.body}>{post.body}</p>}

      {media.length > 0 && (
        <div className={styles.media}>
          {media.map((item, index) => (
            <button
              key={`${item.src}-${index}`}
              type="button"
              className={styles.mediaThumb}
              onClick={() => openMedia(index)}
              aria-label={t('community.detail.viewMedia')}
            >
              {item.kind === 'video' ? (
                <span className={styles.videoThumb}>
                  <PlayIcon fill="currentColor" />
                </span>
              ) : (
                <Thumb
                  src={item.src}
                  className={styles.mediaImg}
                  fallbackClassName={styles.videoThumb}
                  fallback={<ImageIcon />}
                />
              )}
            </button>
          ))}
        </div>
      )}

      <div className={styles.metrics}>
        <PostReactionsSummary post={post} />
        <span className={styles.metric}>
          <MessageCircleIcon /> {t('community.metrics.comments', { count: post.totalComments })}
        </span>
        <span className={styles.metric}>
          <ShareIcon /> {t('community.metrics.shares', { count: post.totalShares })}
        </span>
      </div>

      <ImageLightbox
        isOpen={lightbox.isOpen}
        onClose={lightbox.close}
        items={items}
        initialIndex={startIndex}
        alt={post.body ?? post.author.name}
        title={post.author.name}
        closeLabel={t('common.close')}
        zoomInLabel={t('common.zoomIn')}
        zoomOutLabel={t('common.zoomOut')}
        resetLabel={t('common.resetZoom')}
        prevLabel={t('community.media.prev')}
        nextLabel={t('community.media.next')}
      />
    </Card>
  );
}
