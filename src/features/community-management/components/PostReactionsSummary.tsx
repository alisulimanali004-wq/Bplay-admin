import { useTranslation } from 'react-i18next';
import { clsx, Button, HeartIcon } from '@ui';
import { useDisclosure } from '@shared/hooks/useDisclosure';
import { REACTION_TYPES, type Post } from '../api/community.types';
import { ReactorListModal } from './ReactorListModal';
import styles from './communityCards.module.css';

interface Props {
  post: Post;
}

/** The reaction breakdown (a chip per non-zero type) + a "view all reactors" trigger. */
export function PostReactionsSummary({ post }: Props) {
  const { t } = useTranslation();
  const modal = useDisclosure();
  const active = REACTION_TYPES.filter((reaction) => post.interactions[reaction] > 0);

  return (
    <div className={styles.reactions}>
      {active.length === 0 ? (
        <span className={styles.reactionsEmpty}>{t('community.reactions.none')}</span>
      ) : (
        <div className={styles.chips}>
          {active.map((reaction) => (
            <span key={reaction} className={styles.chip}>
              <span className={clsx(styles.dot, styles[reaction])} aria-hidden />
              <span className={styles.chipLabel}>{t(`community.reaction.${reaction}`)}</span>
              <span className={styles.chipCount}>{post.interactions[reaction]}</span>
            </span>
          ))}
        </div>
      )}

      {post.totalReactions > 0 && (
        <Button
          variant="ghost"
          size="sm"
          leftIcon={<HeartIcon />}
          onClick={modal.open}
          data-testid="view-reactors"
        >
          {t('community.reactions.viewAll', { count: post.totalReactions })}
        </Button>
      )}

      <ReactorListModal postId={post.id} isOpen={modal.isOpen} onClose={modal.close} />
    </div>
  );
}
