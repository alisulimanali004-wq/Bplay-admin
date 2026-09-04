import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@ui';
import { availableModerationActions, moderationActionVariant } from './moderation';
import { MODERATION_ICON } from './moderationIcons';
import { PostActionConfirm } from './PostActionConfirm';
import type { ModerationAction, Post } from '../api/community.types';
import styles from './communityActions.module.css';

interface Props {
  post: Post;
  /** Called after a moderation action succeeds (e.g. navigate to the list after delete). */
  onModerated?: (action: ModerationAction) => void;
}

/** The moderation actions on the post detail header (button form). */
export function PostStatusActions({ post, onModerated }: Props) {
  const { t } = useTranslation();
  const [pending, setPending] = useState<ModerationAction | null>(null);
  const actions = availableModerationActions(post.moderationStatus);

  if (actions.length === 0) return null;

  return (
    <div className={styles.headerActions}>
      {actions.map((action) => {
        const variant = moderationActionVariant(action);
        return (
          <Button
            key={action}
            leftIcon={MODERATION_ICON[action]}
            variant={variant === 'primary' ? 'secondary' : variant}
            onClick={() => setPending(action)}
            data-testid={`post-action-${action}`}
          >
            {t(`community.actions.${action}`)}
          </Button>
        );
      })}

      <PostActionConfirm
        post={post}
        action={pending}
        onClose={() => setPending(null)}
        onModerated={onModerated}
      />
    </div>
  );
}
