import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Modal, Select, Spinner, ErrorState, EmptyState, UserCell, Badge, InboxIcon } from '@ui';
import { useAuthRole } from '@shared/stores/authStore';
import { REACTION_TYPES, REACTION_VARIANT, type ReactionType } from '../api/community.types';
import { usePostReactors } from '../hooks/usePostRelated';
import { actorProfilePath } from './AuthorCell';
import styles from './communityCards.module.css';

interface Props {
  postId: string;
  isOpen: boolean;
  onClose: () => void;
}

/** Modal listing everyone who reacted to a post, filterable by reaction type. Each row deep-links to a profile. */
export function ReactorListModal({ postId, isOpen, onClose }: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const canOpenProfiles = useAuthRole() === 'super_admin';
  const [filter, setFilter] = useState<'all' | ReactionType>('all');
  // Fetch only while the modal is open (a popular post could have many reactors).
  const { data, isLoading, isError, refetch } = usePostReactors(postId, isOpen);
  const reactors = (data ?? []).filter((reactor) => filter === 'all' || reactor.reaction === filter);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('community.reactors.title')}
      size="md"
      closeLabel={t('common.close')}
    >
      <div className={styles.filter}>
        <Select
          aria-label={t('community.reactors.filter')}
          value={filter}
          onChange={(value) => setFilter(value as 'all' | ReactionType)}
          options={[
            { value: 'all', label: t('community.reactors.all') },
            ...REACTION_TYPES.map((reaction) => ({
              value: reaction,
              label: t(`community.reaction.${reaction}`),
            })),
          ]}
        />
      </div>

      {isLoading ? (
        <Spinner />
      ) : isError ? (
        <ErrorState
          message={t('common.loadError')}
          retryLabel={t('common.retry')}
          onRetry={() => void refetch()}
        />
      ) : reactors.length === 0 ? (
        <EmptyState icon={<InboxIcon />} title={t('community.reactors.empty')} />
      ) : (
        <div className={styles.list}>
          {reactors.map((reactor) => (
            <UserCell
              key={reactor.id}
              name={reactor.name}
              photoUrl={reactor.logoUrl}
              onClick={
                canOpenProfiles
                  ? () => {
                      onClose();
                      navigate(actorProfilePath(reactor));
                    }
                  : undefined
              }
              trailing={
                <Badge variant={REACTION_VARIANT[reactor.reaction]} size="sm">
                  {t(`community.reaction.${reactor.reaction}`)}
                </Badge>
              }
              testId={`reactor-${reactor.id}`}
            />
          ))}
        </div>
      )}
    </Modal>
  );
}
