import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { IconButton, EyeIcon } from '@ui';
import { availableModerationActions, MODERATION_ROW_VARIANT } from './moderation';
import { MODERATION_ICON } from './moderationIcons';
import { PostActionConfirm } from './PostActionConfirm';
import type { ModerationAction, Post } from '../api/community.types';
import styles from './communityActions.module.css';

interface Props {
  post: Post;
  onView: (post: Post) => void;
}

/** Row / card actions: View + the moderation actions valid for this post's state. */
export function PostRowActions({ post, onView }: Props) {
  const { t } = useTranslation();
  const [pending, setPending] = useState<ModerationAction | null>(null);
  const actions = availableModerationActions(post.moderationStatus);

  return (
    <div className={styles.rowActions}>
      <IconButton
        size="sm"
        variant="ghost"
        label={t('community.actions.view')}
        icon={<EyeIcon />}
        onClick={() => onView(post)}
        data-testid={`post-view-${post.id}`}
      />
      {actions.map((action) => (
        <IconButton
          key={action}
          size="sm"
          variant={MODERATION_ROW_VARIANT[action]}
          label={t(`community.actions.${action}`)}
          icon={MODERATION_ICON[action]}
          onClick={() => setPending(action)}
          data-testid={`post-${action}-${post.id}`}
        />
      ))}

      <PostActionConfirm post={post} action={pending} onClose={() => setPending(null)} />
    </div>
  );
}
