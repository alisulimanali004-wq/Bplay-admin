import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Badge,
  Button,
  Card,
  CheckIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ConfirmDialog,
  EditIcon,
  EmptyState,
  ErrorState,
  InboxIcon,
  MessageCircleIcon,
  PageContainer,
  PageHeader,
  PowerIcon,
  Spinner,
  StarIcon,
  TrashIcon,
  UsersIcon,
} from '@ui';
import { useDisclosure } from '@shared/hooks/useDisclosure';
import { PATHS } from '@app/router/paths';
import { usePlanQuery } from '../hooks/usePlanQuery';
import { usePlansQuery } from '../hooks/usePlansQuery';
import { useMovePlan, useSetPlanActive } from '../hooks/usePlanMutations';
import { usePlanFormat } from '../hooks/usePlanFormat';
import { PlanFeatureRows } from '../components/PlanFeatureRows';
import { PlanFormModal } from '../components/PlanFormModal';
import { PlanDeleteDialog } from '../components/PlanDeleteDialog';
import {
  planAudienceBadgeVariant,
  planKindBadgeVariant,
  planStatus,
  planStatusBadgeVariant,
  unlocksCommunity,
  yearlySavingPercent,
} from '../api/plan.types';
import styles from './PlanDetailPage.module.css';

/** The exact phrase the api throws — kept in sync with plan.api.mock.ts. */
const NOT_FOUND_MESSAGE = 'Plan not found';

/** One unfiltered read of the catalog: the only way to know this plan's real position. */
const ORDER_PARAMS = { sortBy: 'displayOrder', sortDir: 'asc', pageSize: 500 } as const;

export default function PlanDetailPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { planId } = useParams<{ planId: string }>();
  const fmt = usePlanFormat();
  const { data: plan, isLoading, isError, error, refetch } = usePlanQuery(planId);
  const { data: catalog } = usePlansQuery(ORDER_PARAMS);
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const deactivate = useDisclosure();
  const setActive = useSetPlanActive();
  const move = useMovePlan();

  // Position inside this plan's own audience. `displayOrder` is a sort weight, not
  // an ordinal — it keeps gaps after a delete — so the index is the truth here, and
  // it is also what tells us whether a move would be a no-op.
  const siblings = (catalog?.items ?? [])
    .filter((item) => item.audience === plan?.audience)
    .sort((a, b) => a.displayOrder - b.displayOrder);
  const position = plan ? siblings.findIndex((item) => item.id === plan.id) : -1;
  const isFirst = position <= 0;
  const isLast = position === -1 || position === siblings.length - 1;

  if (isLoading) {
    return (
      <PageContainer>
        <div className={styles.center}>
          <Spinner size="lg" />
        </div>
      </PageContainer>
    );
  }

  const isNotFound =
    (isError && error instanceof Error && error.message === NOT_FOUND_MESSAGE) ||
    (!isLoading && !isError && !plan);

  if (isNotFound) {
    return (
      <PageContainer>
        <PageHeader
          title={t('plan.detail.notFound')}
          showBack
          onBack={() => navigate(PATHS.plans)}
          backLabel={t('common.back')}
        />
        <EmptyState icon={<InboxIcon />} title={t('plan.detail.notFound')} />
      </PageContainer>
    );
  }

  if (isError || !plan) {
    return (
      <PageContainer>
        <PageHeader
          title={t('plan.title')}
          showBack
          onBack={() => navigate(PATHS.plans)}
          backLabel={t('common.back')}
        />
        <ErrorState
          title={t('plan.state.errorTitle')}
          message={t('common.loadError')}
          retryLabel={t('common.retry')}
          onRetry={() => void refetch()}
        />
      </PageContainer>
    );
  }

  const isOwner = plan.audience === 'owner';
  const saving = yearlySavingPercent(plan);

  return (
    <PageContainer>
      <PageHeader
        title={plan.name}
        subtitle={plan.description || t(`plan.audience.${plan.audience}Hint`)}
        showBack
        onBack={() => navigate(PATHS.plans)}
        backLabel={t('common.back')}
        actions={
          <>
            <Button
              variant="secondary"
              leftIcon={<EditIcon />}
              onClick={() => setIsEditing(true)}
              data-testid="plan-detail-edit"
            >
              {t('common.edit')}
            </Button>
            <Button
              variant={plan.isActive ? 'caution' : 'primary'}
              leftIcon={<PowerIcon />}
              isLoading={setActive.isPending}
              data-testid="plan-detail-toggle"
              onClick={() =>
                plan.isActive
                  ? deactivate.open()
                  : setActive.mutate({ id: plan.id, isActive: true })
              }
            >
              {t(plan.isActive ? 'plan.actions.deactivate' : 'plan.actions.activate')}
            </Button>
            <Button
              variant="danger"
              leftIcon={<TrashIcon />}
              onClick={() => setIsDeleting(true)}
              data-testid="plan-detail-delete"
            >
              {t('common.delete')}
            </Button>
          </>
        }
      />

      <div className={styles.badges} data-testid="plan-detail-badges">
        <Badge variant={planStatusBadgeVariant(plan)}>{t(`plan.status.${planStatus(plan)}`)}</Badge>
        <Badge variant={planAudienceBadgeVariant(plan.audience)}>
          {t(`plan.audience.${plan.audience}`)}
        </Badge>
        <Badge variant={planKindBadgeVariant(plan.kind)}>{t(`plan.kind.${plan.kind}`)}</Badge>
        <span className={styles.tier} dir="ltr">
          {plan.tier}
        </span>
        {plan.isRecommended && (
          <span className={styles.recommended}>
            <StarIcon />
            {t('plan.badge.recommended')}
          </span>
        )}
      </div>

      <div className={styles.sectionGrid}>
        <Card padding="lg">
          <h2 className={styles.cardTitle}>{t('plan.detail.pricing')}</h2>
          <div className={styles.priceBlock}>
            <span className={styles.price}>
              <bdi>{fmt.money(plan.priceSyp)}</bdi>
            </span>
            <span className={styles.term}>
              {isOwner
                ? t('plan.price.perMonth')
                : plan.durationDays === null
                  ? t('plan.price.ongoing')
                  : t('plan.price.perTerm', { n: fmt.number(plan.durationDays) })}
            </span>
          </div>
          <dl className={styles.facts}>
            {isOwner && (
              <div className={styles.fact}>
                <dt>{t('plan.form.yearlyPrice')}</dt>
                <dd>
                  {plan.yearlyPriceSyp === null ? (
                    '—'
                  ) : (
                    <>
                      <bdi>{fmt.money(plan.yearlyPriceSyp)}</bdi>
                      {saving > 0 && <span className={styles.saving}>−{fmt.number(saving)}%</span>}
                    </>
                  )}
                </dd>
              </div>
            )}
            {!isOwner && (
              <div className={styles.fact}>
                <dt>{t('plan.col.duration')}</dt>
                <dd>
                  {plan.durationDays === null ? t('plan.price.ongoing') : fmt.days(plan.durationDays)}
                </dd>
              </div>
            )}
            <div className={styles.fact}>
              <dt>{t('plan.detail.trial')}</dt>
              <dd>{plan.trialDays === null ? t('plan.form.trialNone') : fmt.days(plan.trialDays)}</dd>
            </div>
          </dl>
        </Card>

        <Card padding="lg">
          <h2 className={styles.cardTitle}>{t('plan.detail.reach')}</h2>
          <div className={styles.subscribers}>
            <UsersIcon />
            <span className={styles.subscriberCount}>
              <bdi>{fmt.number(plan.subscriberCount)}</bdi>
            </span>
            <span className={styles.subscriberLabel}>{t('plan.col.subscribers')}</span>
          </div>
          {/* PN4: the subscriber count is exactly what makes delete impossible. */}
          <p className={styles.note}>
            {plan.subscriberCount > 0 ? t('plan.detail.deleteBlockedNote') : t('plan.detail.deletableNote')}
          </p>
          <dl className={styles.facts}>
            <div className={styles.fact}>
              <dt>{t('plan.detail.position')}</dt>
              <dd className={styles.positionRow}>
                <bdi>{fmt.number(Math.max(position, 0) + 1)}</bdi>
                <Button
                  size="sm"
                  variant="ghost"
                  leftIcon={<ChevronUpIcon />}
                  disabled={move.isPending || isFirst}
                  onClick={() => move.mutate({ id: plan.id, direction: 'up' })}
                  data-testid="plan-detail-move-up"
                >
                  {t('plan.actions.moveUp')}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  leftIcon={<ChevronDownIcon />}
                  disabled={move.isPending || isLast}
                  onClick={() => move.mutate({ id: plan.id, direction: 'down' })}
                  data-testid="plan-detail-move-down"
                >
                  {t('plan.actions.moveDown')}
                </Button>
              </dd>
            </div>
            <div className={styles.fact}>
              <dt>{t('plan.detail.updatedAt')}</dt>
              <dd>{fmt.date(plan.updatedAt)}</dd>
            </div>
            <div className={styles.fact}>
              <dt>{t('plan.detail.createdAt')}</dt>
              <dd>{fmt.date(plan.createdAt)}</dd>
            </div>
          </dl>
        </Card>

        <Card padding="lg">
          <h2 className={styles.cardTitle}>
            {isOwner ? t('plan.detail.featureGate') : t('plan.detail.entitlements')}
          </h2>
          <PlanFeatureRows plan={plan} variant="detail" />
        </Card>

        <Card padding="lg">
          <h2 className={styles.cardTitle}>{t('plan.detail.highlights')}</h2>
          {plan.highlights.length === 0 ? (
            <p className={styles.note}>{t('plan.form.highlightEmpty')}</p>
          ) : (
            <ul className={styles.highlights}>
              {plan.highlights.map((highlight) => (
                <li key={highlight}>
                  <CheckIcon />
                  <span>{highlight}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {!isOwner && (
          <Card padding="lg" className={styles.wide}>
            <h2 className={styles.cardTitle}>
              <MessageCircleIcon />
              {t('plan.detail.communityTitle')}
            </h2>
            <p className={styles.note}>
              {unlocksCommunity(plan)
                ? t('plan.detail.communityGranted')
                : plan.entitlements.communityPost && !plan.isActive
                  ? t('plan.detail.communityInactive')
                  : t('plan.detail.communityDenied')}
            </p>
          </Card>
        )}
      </div>

      <PlanFormModal isOpen={isEditing} onClose={() => setIsEditing(false)} plan={plan} />
      <PlanDeleteDialog
        isOpen={isDeleting}
        onClose={() => setIsDeleting(false)}
        plan={plan}
        onDeleted={() => navigate(PATHS.plans)}
      />
      <ConfirmDialog
        isOpen={deactivate.isOpen}
        onClose={deactivate.close}
        title={t('plan.confirm.deactivateTitle')}
        message={t('plan.confirm.deactivateMessage', { name: plan.name })}
        confirmText={t('plan.actions.deactivate')}
        cancelText={t('common.cancel')}
        variant="caution"
        isLoading={setActive.isPending}
        onConfirm={async () => {
          await setActive.mutateAsync({ id: plan.id, isActive: false });
          deactivate.close();
        }}
      />
    </PageContainer>
  );
}
