import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Avatar,
  Button,
  EmptyState,
  Field,
  Modal,
  RegionTag,
  SearchInput,
  Select,
  Spinner,
  UsersIcon,
  clsx,
} from '@ui';
import { CONVERSATION_CATEGORIES } from '../api/chat.types';
import { startConversationSchema } from '../api/chat.schema';
import { useChatOwnerOptionsQuery } from '../hooks/useChatQueries';
import type { ChatOwnerOption, ConversationCategory } from '../api/chat.types';
import styles from './newConversationModal.module.css';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (input: {
    ownerId: string;
    category: ConversationCategory;
    facilityId?: string;
  }) => void;
  isSubmitting: boolean;
}

/**
 * FR-ADM-CHAT-003 / UC-CHAT-01 step 2 — "or starts one".
 *
 * A three-step form rather than a free-text search: the admin picks an OWNER
 * (only those their region scope covers — the picker is gated by the same rule
 * the list is), then the CHANNEL, and for a review thread the facility it is
 * about. Resolving the thread is idempotent on the server, so picking a pair
 * that already has a thread opens that one instead of forking the history.
 *
 * Validation runs through `startConversationSchema` so the client and the wire
 * agree on the one rule that matters: a review thread must name a facility.
 */
export function NewConversationModal({ isOpen, onClose, onSubmit, isSubmitting }: Props) {
  const { t } = useTranslation();
  // Fetch only while the modal is actually open.
  const ownersQuery = useChatOwnerOptionsQuery(isOpen);

  const [query, setQuery] = useState('');
  const [ownerId, setOwnerId] = useState<string | null>(null);
  const [category, setCategory] = useState<ConversationCategory>('general_support');
  const [facilityId, setFacilityId] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const owners = ownersQuery.data ?? [];
  const selected = owners.find((owner) => owner.id === ownerId) ?? null;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return owners;
    return owners.filter(
      (owner) =>
        owner.name.toLowerCase().includes(q) ||
        (owner.email?.toLowerCase().includes(q) ?? false) ||
        owner.facilities.some((facility) => facility.name.toLowerCase().includes(q)),
    );
  }, [owners, query]);

  const reset = () => {
    setQuery('');
    setOwnerId(null);
    setCategory('general_support');
    setFacilityId('');
    setError(null);
  };

  const close = () => {
    reset();
    onClose();
  };

  const pickOwner = (owner: ChatOwnerOption) => {
    setOwnerId(owner.id);
    setError(null);
    // Pre-select the only sensible facility so the common case is one click.
    setFacilityId(owner.facilities.length === 1 ? owner.facilities[0].id : '');
    // An owner with no facilities cannot have a review thread at all.
    if (owner.facilities.length === 0) setCategory('general_support');
  };

  const submit = () => {
    const result = startConversationSchema.safeParse({
      ownerId: ownerId ?? '',
      category,
      facilityId: category === 'facility_review' ? facilityId || undefined : undefined,
    });
    if (!result.success) {
      setError(result.error.issues[0]?.message ?? 'chat.errors.ownerRequired');
      return;
    }
    setError(null);
    onSubmit(result.data);
    reset();
  };

  const categoryOptions = CONVERSATION_CATEGORIES.filter(
    // Hide the review channel for an owner with nothing to review, rather than
    // offering a choice that can only fail validation.
    (option) => option !== 'facility_review' || (selected?.facilities.length ?? 0) > 0,
  ).map((option) => ({ value: option, label: t(`chat.category.${option}`) }));

  return (
    <Modal
      isOpen={isOpen}
      onClose={close}
      title={t('chat.newConversation.title')}
      description={t('chat.newConversation.description')}
      size="md"
      closeLabel={t('common.close')}
      footer={
        <>
          <Button variant="secondary" onClick={close}>
            {t('common.cancel')}
          </Button>
          <Button
            onClick={submit}
            disabled={!ownerId}
            isLoading={isSubmitting}
            data-testid="chat-start-submit"
          >
            {t('chat.newConversation.submit')}
          </Button>
        </>
      }
    >
      <div className={styles.body}>
        <Field label={t('chat.newConversation.owner')} required>
          <SearchInput
            value={query}
            onChange={setQuery}
            placeholder={t('chat.newConversation.searchOwners')}
            testId="chat-owner-search"
          />
        </Field>

        <div className={styles.list} role="radiogroup" aria-label={t('chat.newConversation.owner')}>
          {ownersQuery.isLoading && (
            <div className={styles.center}>
              <Spinner size="sm" />
            </div>
          )}

          {!ownersQuery.isLoading && filtered.length === 0 && (
            <EmptyState
              icon={<UsersIcon />}
              title={t('chat.newConversation.noOwners')}
              description={t('chat.newConversation.noOwnersHint')}
            />
          )}

          {filtered.map((owner) => (
            <button
              key={owner.id}
              type="button"
              role="radio"
              aria-checked={owner.id === ownerId}
              className={clsx(styles.owner, owner.id === ownerId && styles.ownerActive)}
              onClick={() => pickOwner(owner)}
              data-testid={`chat-owner-${owner.id}`}
            >
              <Avatar src={owner.photoUrl} name={owner.name} size="sm" />
              <span className={styles.ownerText}>
                <span className={styles.ownerName} dir="auto">
                  {owner.name}
                </span>
                <span className={styles.ownerMeta} dir="auto">
                  {owner.facilities.length > 0
                    ? t('chat.newConversation.facilityCount', { count: owner.facilities.length })
                    : t('chat.newConversation.noFacilities')}
                </span>
              </span>
              <RegionTag regionNames={owner.regionNames} isOrphan={owner.regionId === null} compact />
            </button>
          ))}
        </div>

        {selected && (
          <div className={styles.options}>
            <Field label={t('chat.newConversation.channel')} required>
              <Select
                value={category}
                onChange={(value) => {
                  setCategory(value as ConversationCategory);
                  setError(null);
                }}
                options={categoryOptions}
                aria-label={t('chat.newConversation.channel')}
              />
            </Field>

            {category === 'facility_review' && (
              <Field
                label={t('chat.newConversation.facility')}
                required
                error={error === 'chat.errors.facilityRequired' ? t(error) : undefined}
              >
                <Select
                  value={facilityId}
                  onChange={(value) => {
                    setFacilityId(value);
                    setError(null);
                  }}
                  options={selected.facilities.map((facility) => ({
                    value: facility.id,
                    label: facility.name,
                  }))}
                  placeholder={t('chat.newConversation.selectFacility')}
                  aria-label={t('chat.newConversation.facility')}
                />
              </Field>
            )}
          </div>
        )}

        {error && error !== 'chat.errors.facilityRequired' && (
          <p className={styles.error} role="alert">
            {t(error)}
          </p>
        )}
      </div>
    </Modal>
  );
}
