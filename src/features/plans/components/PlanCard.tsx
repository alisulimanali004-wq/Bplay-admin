import { useTranslation } from 'react-i18next';
import {
  Badge,
  Button,
  Card,
  CheckIcon,
  clsx,
  EditIcon,
  IconButton,
  PowerIcon,
  StarIcon,
  TrashIcon,
  UsersIcon,
} from '@ui';
import { usePlanFormat } from '../hooks/usePlanFormat';
import { PlanFeatureRows } from './PlanFeatureRows';
import {
  planAudienceBadgeVariant,
  planKindBadgeVariant,
  unlocksCommunity,
  yearlySavingPercent,
  type Plan,
} from '../api/plan.types';
import styles from './planCard.module.css';

interface Props {
  plan: Plan;
  onOpen: (plan: Plan) => void;
  onEdit: (plan: Plan) => void;
  onToggleActive: (plan: Plan) => void;
  onDelete: (plan: Plan) => void;
  /** True while this specific card's activate/deactivate call is in flight. */
  isToggling?: boolean;
}

/**
 * One plan in the catalog grid. The card is audience-driven: a player plan shows
 * its term price and player entitlements, an owner tier shows monthly + yearly
 * pricing and the facility feature gate.
 */
export function PlanCard({
  plan,
  onOpen,
  onEdit,
  onToggleActive,
  onDelete,
  isToggling = false,
}: Props) {
  const { t } = useTranslation();
  const fmt = usePlanFormat();
  const saving = yearlySavingPercent(plan);
  const isOwner = plan.audience === 'owner';

  return (
    <Card
      padding="md"
      className={clsx(styles.card, !plan.isActive && styles.inactive)}
      data-testid={`plan-card-${plan.id}`}
    >
      <span className={clsx(styles.accent, styles[`accent-${plan.audience}`])} aria-hidden />

      <header className={styles.head}>
        <div className={styles.titleWrap}>
          <button
            type="button"
            className={styles.name}
            onClick={() => onOpen(plan)}
            data-testid={`plan-open-${plan.id}`}
          >
            {plan.name}
          </button>
          <span className={styles.tier} dir="ltr">
            {plan.tier}
          </span>
        </div>
        {plan.isRecommended && (
          <span className={styles.recommended} title={t('plan.badge.recommended')}>
            <StarIcon />
            <span>{t('plan.badge.recommended')}</span>
          </span>
        )}
      </header>

      <div className={styles.badges}>
        <Badge variant={planAudienceBadgeVariant(plan.audience)} size="sm">
          {t(`plan.audience.${plan.audience}`)}
        </Badge>
        <Badge variant={planKindBadgeVariant(plan.kind)} size="sm">
          {t(`plan.kind.${plan.kind}`)}
        </Badge>
        {unlocksCommunity(plan) && (
          <Badge variant="info" size="sm">
            {t('plan.badge.community')}
          </Badge>
        )}
        {plan.trialDays !== null && plan.trialDays > 0 && (
          <Badge variant="warning" size="sm">
            {t('plan.badge.trial', { n: fmt.number(plan.trialDays) })}
          </Badge>
        )}
      </div>

      {!plan.isActive && (
        <p className={styles.disabledStrip}>{t('plan.card.deactivatedNote')}</p>
      )}

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

      {/* A free tier has nothing to say about a yearly price. */}
      {isOwner && plan.kind === 'paid' && plan.yearlyPriceSyp !== null && (
        <p className={styles.yearly}>
          <bdi>{fmt.money(plan.yearlyPriceSyp)}</bdi> {t('plan.price.perYear')}
          {saving > 0 && (
            <bdi className={styles.saving}>−{fmt.number(saving)}%</bdi>
          )}
        </p>
      )}

      {plan.description && <p className={styles.description}>{plan.description}</p>}

      {plan.highlights.length > 0 && (
        <ul className={styles.highlights}>
          {plan.highlights.map((highlight) => (
            <li key={highlight}>
              <CheckIcon />
              <span>{highlight}</span>
            </li>
          ))}
        </ul>
      )}

      <PlanFeatureRows plan={plan} />

      <footer className={styles.footer}>
        <span className={styles.subscribers} title={t('plan.col.subscribers')}>
          <UsersIcon />
          <bdi>{fmt.number(plan.subscriberCount)}</bdi>
        </span>
        <div className={styles.actions}>
          <Button
            size="sm"
            variant="secondary"
            leftIcon={<EditIcon />}
            onClick={() => onEdit(plan)}
            data-testid={`plan-edit-${plan.id}`}
          >
            {t('common.edit')}
          </Button>
          <Button
            size="sm"
            variant={plan.isActive ? 'caution' : 'primary'}
            leftIcon={<PowerIcon />}
            isLoading={isToggling}
            onClick={() => onToggleActive(plan)}
            data-testid={`plan-toggle-${plan.id}`}
          >
            {t(plan.isActive ? 'plan.actions.deactivate' : 'plan.actions.activate')}
          </Button>
          <IconButton
            size="sm"
            variant="danger"
            label={t('common.delete')}
            icon={<TrashIcon />}
            onClick={() => onDelete(plan)}
            data-testid={`plan-delete-card-${plan.id}`}
          />
        </div>
      </footer>
    </Card>
  );
}
