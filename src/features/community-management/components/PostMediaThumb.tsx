import { clsx, PlayIcon, ImageIcon, Thumb } from '@ui';
import { hasVideo, postMedia, type Post } from '../api/community.types';
import styles from './PostMediaThumb.module.css';

interface Props {
  post: Post;
  size?: 'sm' | 'lg';
}

/**
 * A compact media preview for list rows and grid cards: the first image (or a
 * neutral tile for a video-only post), a play overlay when the post has video,
 * and a "+N" badge when there is more than one media item. Purely decorative —
 * the surrounding row/card is what navigates.
 */
export function PostMediaThumb({ post, size = 'sm' }: Props) {
  const media = postMedia(post);
  if (media.length === 0) return null;

  const poster = media.find((item) => item.kind === 'image')?.src;
  const video = hasVideo(post);
  const extra = media.length - 1;

  return (
    <span className={clsx(styles.thumb, styles[size])}>
      <Thumb
        src={poster}
        className={styles.img}
        fallbackClassName={styles.tile}
        fallback={<ImageIcon />}
      />
      {video && (
        <span className={styles.play} aria-hidden>
          <PlayIcon fill="currentColor" />
        </span>
      )}
      {extra > 0 && <span className={styles.count}>+{extra}</span>}
    </span>
  );
}
