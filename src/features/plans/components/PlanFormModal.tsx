import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Controller, useForm, type Control, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import {
  Button,
  CheckIcon,
  Field,
  ImageIcon,
  Input,
  MessageCircleIcon,
  PlusIcon,
  Select,
  SparklesIcon,
  StarIcon,
  Switch,
  Tabs,
  Textarea,
  TrashIcon,
  TrendingUpIcon,
  IconButton,
  Modal,
  type TabItem,
} from '@ui';
import { usePlanFormat } from '../hooks/usePlanFormat';
import { useCreatePlan, useUpdatePlan } from '../hooks/usePlanMutations';
import { planFormSchema, type PlanFormValues } from '../api/plan.schema';
import {
  BLANK_ENTITLEMENTS,
  BLANK_FEATURE_GATE,
  MAX_PLAN_HIGHLIGHTS,
  type Plan,
} from '../api/plan.types';
import styles from './planForm.module.css';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  plan: Plan | null;
}

type TabKey = 'basics' | 'pricing' | 'features' | 'highlights';

/** Which tab owns which field — drives the per-tab error badge and the jump-on-invalid. */
const FIELD_TAB: Record<string, TabKey> = {
  audience: 'basics',
  kind: 'basics',
  tier: 'basics',
  name: 'basics',
  description: 'basics',
  isRecommended: 'basics',
  priceSyp: 'pricing',
  yearlyPriceSyp: 'pricing',
  durationDays: 'pricing',
  trialDays: 'pricing',
  entitlements: 'features',
  featureGate: 'features',
  highlights: 'highlights',
};

const BLANK: PlanFormValues = {
  audience: 'player',
  kind: 'paid',
  tier: '',
  name: '',
  description: '',
  priceSyp: 0,
  yearlyPriceSyp: null,
  durationDays: 30,
  trialDays: null,
  entitlements: { ...BLANK_ENTITLEMENTS },
  featureGate: { ...BLANK_FEATURE_GATE },
  highlights: [],
  isRecommended: false,
};

/** A number input that speaks the catalog's null semantics: empty === unlimited. */
function NumberControl({
  id,
  value,
  onChange,
  onBlur,
  nullable,
  placeholder,
  step,
  testId,
}: {
  id: string;
  value: number | null;
  onChange: (value: number | null) => void;
  onBlur?: () => void;
  nullable?: boolean;
  placeholder?: string;
  step?: number;
  testId?: string;
}) {
  return (
    <Input
      id={id}
      type="number"
      inputMode="numeric"
      dir="ltr"
      min={0}
      step={step}
      placeholder={placeholder}
      data-testid={testId}
      value={value === null ? '' : String(value)}
      onBlur={onBlur}
      onChange={(event) => {
        const raw = event.target.value;
        if (raw === '') {
          onChange(nullable ? null : 0);
          return;
        }
        const parsed = Number(raw);
        onChange(Number.isFinite(parsed) ? parsed : nullable ? null : 0);
      }}
    />
  );
}

/** The marketing bullets the apps render under the plan name (mobile `top_features`). */
function HighlightsEditor({
  value,
  onChange,
}: {
  value: string[];
  onChange: (value: string[]) => void;
}) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState('');
  const isFull = value.length >= MAX_PLAN_HIGHLIGHTS;

  const add = () => {
    const next = draft.trim();
    if (next === '' || isFull || value.includes(next)) return;
    onChange([...value, next]);
    setDraft('');
  };

  return (
    <div className={styles.highlights}>
      <div className={styles.highlightRow}>
        <Input
          id="plan-highlight-draft"
          value={draft}
          placeholder={t('plan.form.highlightPlaceholder')}
          disabled={isFull}
          data-testid="plan-highlight-draft"
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              add();
            }
          }}
        />
        <Button
          type="button"
          variant="secondary"
          leftIcon={<PlusIcon />}
          disabled={isFull || draft.trim() === ''}
          onClick={add}
          data-testid="plan-highlight-add"
        >
          {t('plan.form.highlightAdd')}
        </Button>
      </div>

      {value.length === 0 ? (
        <p className={styles.hint}>{t('plan.form.highlightEmpty')}</p>
      ) : (
        <ul className={styles.highlightList}>
          {value.map((highlight, index) => (
            <li key={highlight} className={styles.highlightItem}>
              <CheckIcon />
              <span className={styles.highlightText}>{highlight}</span>
              <IconButton
                size="sm"
                variant="danger"
                label={t('plan.form.highlightRemove')}
                icon={<TrashIcon />}
                onClick={() => onChange(value.filter((_, i) => i !== index))}
                data-testid={`plan-highlight-remove-${index}`}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** A labelled switch bound to a boolean path of the form. */
function SwitchField({
  control,
  name,
  label,
  description,
  icon,
  testId,
}: {
  control: Control<PlanFormValues>;
  name:
    | `entitlements.${'communityPost' | 'communityMedia' | 'advancedStats' | 'prioritySupport'}`
    | `featureGate.${'bannerUpload' | 'reviewReply' | 'campaigns' | 'prioritySupport'}`
    | 'isRecommended';
  label: string;
  description?: string;
  icon?: ReactNode;
  testId?: string;
}) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <Switch
          checked={Boolean(field.value)}
          onChange={field.onChange}
          label={label}
          description={description}
          icon={icon}
          testId={testId}
        />
      )}
    />
  );
}

/**
 * Create / edit a platform plan. The tabs and the fields inside them are derived
 * from the plan's audience — a player plan and an owner tier are priced and gated
 * differently — mirroring how athlux derives its plan dialog from the segment.
 */
export function PlanFormModal({ isOpen, onClose, plan }: Props) {
  const { t } = useTranslation();
  const fmt = usePlanFormat();
  const createMutation = useCreatePlan();
  const updateMutation = useUpdatePlan();
  const isEditing = plan !== null;
  const mutation = isEditing ? updateMutation : createMutation;
  const [tab, setTab] = useState<TabKey>('basics');

  // Syncs the form to the plan DURING render, so an edit never flashes the blanks.
  const values = useMemo<PlanFormValues>(
    () =>
      plan
        ? {
            audience: plan.audience,
            kind: plan.kind,
            tier: plan.tier,
            name: plan.name,
            description: plan.description,
            priceSyp: plan.priceSyp,
            yearlyPriceSyp: plan.yearlyPriceSyp,
            durationDays: plan.durationDays,
            trialDays: plan.trialDays,
            entitlements: { ...plan.entitlements },
            featureGate: { ...plan.featureGate },
            highlights: [...plan.highlights],
            isRecommended: plan.isRecommended,
          }
        : BLANK,
    // isOpen forces a fresh sync each time the modal opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [plan, isOpen],
  );

  const {
    control,
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<PlanFormValues>({
    resolver: zodResolver(planFormSchema) as unknown as Resolver<PlanFormValues>,
    mode: 'onTouched',
    defaultValues: BLANK,
  });

  // The modal stays mounted while closed (only its panel unmounts), so the form
  // state survives a close. Re-seed it on every open — RHF's `values` prop would
  // not, because it diffs against the last APPLIED values, not the live fields:
  // reopening Create after a submit, or Edit after a Cancel, would show stale input.
  useEffect(() => {
    if (!isOpen) return;
    reset(values);
    setTab('basics');
  }, [isOpen, values, reset]);

  const audience = watch('audience');
  const kind = watch('kind');
  const priceSyp = watch('priceSyp');
  const durationDays = watch('durationDays');
  const yearlyPriceSyp = watch('yearlyPriceSyp');
  const isOwner = audience === 'owner';
  const isFree = kind === 'free';

  const err = (key: keyof PlanFormValues) => {
    const message = errors[key]?.message;
    return message ? t(message) : undefined;
  };

  const nestedErr = (group: 'entitlements' | 'featureGate', key: string) => {
    const groupErrors = errors[group] as Record<string, { message?: string }> | undefined;
    const message = groupErrors?.[key]?.message;
    return message ? t(message) : undefined;
  };

  /** How many validation errors each tab currently holds (shown on the tab). */
  const errorCounts = Object.keys(errors).reduce<Record<TabKey, number>>(
    (acc, key) => {
      const target = FIELD_TAB[key];
      if (target) acc[target] += 1;
      return acc;
    },
    { basics: 0, pricing: 0, features: 0, highlights: 0 },
  );

  const tabs: TabItem[] = (['basics', 'pricing', 'features', 'highlights'] as TabKey[]).map(
    (key) => ({
      key,
      label: t(`plan.form.tab.${key}`),
      badge: errorCounts[key] > 0 ? errorCounts[key] : undefined,
    }),
  );

  /** Keep the two prices coherent when the plan flips between free and paid. */
  const onKindChange = (next: 'free' | 'paid') => {
    setValue('kind', next, { shouldValidate: true });
    if (next === 'free') {
      setValue('priceSyp', 0, { shouldValidate: true });
      setValue('yearlyPriceSyp', isOwner ? 0 : null, { shouldValidate: true });
    }
  };

  /** Audience decides which pricing model applies, so clear the other one. */
  const onAudienceChange = (next: 'player' | 'owner') => {
    setValue('audience', next, { shouldValidate: true });
    if (next === 'owner') {
      setValue('durationDays', null, { shouldValidate: true });
      setValue('yearlyPriceSyp', kind === 'free' ? 0 : null, { shouldValidate: true });
      setValue('entitlements', { ...BLANK_ENTITLEMENTS }, { shouldValidate: true });
    } else {
      setValue('yearlyPriceSyp', null, { shouldValidate: true });
      setValue('durationDays', kind === 'paid' ? 30 : null, { shouldValidate: true });
      setValue('featureGate', { ...BLANK_FEATURE_GATE }, { shouldValidate: true });
    }
  };

  const submit = handleSubmit(
    async (data) => {
      const payload = {
        kind: data.kind,
        name: data.name,
        description: data.description,
        priceSyp: data.priceSyp,
        yearlyPriceSyp: data.yearlyPriceSyp,
        durationDays: data.durationDays,
        trialDays: data.trialDays,
        entitlements: data.entitlements,
        featureGate: data.featureGate,
        highlights: data.highlights,
        isRecommended: data.isRecommended,
      };
      if (plan) {
        // `audience` and `tier` are deliberately absent: both are immutable keys.
        await updateMutation.mutateAsync({ id: plan.id, input: payload });
      } else {
        await createMutation.mutateAsync({ ...payload, audience: data.audience, tier: data.tier });
      }
      onClose();
    },
    (invalid) => {
      // Jump to the first tab that actually holds an error — otherwise the submit
      // silently fails for a field the admin cannot see.
      const first = Object.keys(invalid).find((key) => FIELD_TAB[key]);
      if (first) setTab(FIELD_TAB[first]);
    },
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t(isEditing ? 'plan.form.editTitle' : 'plan.form.createTitle')}
      description={t('plan.form.subtitle')}
      size="lg"
      closeLabel={t('common.close')}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button
            type="submit"
            form="plan-form"
            isLoading={mutation.isPending}
            data-testid="plan-submit"
          >
            {t(isEditing ? 'plan.form.saveSubmit' : 'plan.form.createSubmit')}
          </Button>
        </>
      }
    >
      <form id="plan-form" className={styles.form} onSubmit={submit} noValidate>
        <Tabs
          items={tabs}
          value={tab}
          onChange={(key) => setTab(key as TabKey)}
          aria-label={t('plan.form.tabs')}
        />

        {isEditing && (
          <p className={styles.notice}>{t('plan.form.editNotice')}</p>
        )}

        <div className={styles.panel} role="tabpanel" aria-label={t(`plan.form.tab.${tab}`)}>
          {tab === 'basics' && (
            <>
              <div className={styles.grid2}>
                <Field
                  label={t('plan.form.audience')}
                  htmlFor="plan-audience"
                  error={err('audience')}
                  hint={isEditing ? t('plan.form.audienceLocked') : t('plan.form.audienceHint')}
                >
                  <Controller
                    control={control}
                    name="audience"
                    render={({ field }) => (
                      <Select
                        id="plan-audience"
                        value={field.value}
                        disabled={isEditing}
                        aria-label={t('plan.form.audience')}
                        onChange={(value) => onAudienceChange(value as 'player' | 'owner')}
                        options={[
                          { value: 'player', label: t('plan.audience.player') },
                          { value: 'owner', label: t('plan.audience.owner') },
                        ]}
                      />
                    )}
                  />
                </Field>

                <Field
                  label={t('plan.form.kind')}
                  htmlFor="plan-kind"
                  error={err('kind')}
                  hint={t('plan.form.kindHint')}
                >
                  <Controller
                    control={control}
                    name="kind"
                    render={({ field }) => (
                      <Select
                        id="plan-kind"
                        value={field.value}
                        aria-label={t('plan.form.kind')}
                        onChange={(value) => onKindChange(value as 'free' | 'paid')}
                        options={[
                          { value: 'free', label: t('plan.kind.free') },
                          { value: 'paid', label: t('plan.kind.paid') },
                        ]}
                      />
                    )}
                  />
                </Field>
              </div>

              <div className={styles.grid2}>
                <Field label={t('plan.form.name')} htmlFor="plan-name" error={err('name')}>
                  <Input id="plan-name" data-testid="plan-name" {...register('name')} />
                </Field>
                <Field
                  label={t('plan.form.tier')}
                  htmlFor="plan-tier"
                  error={err('tier')}
                  hint={isEditing ? t('plan.form.tierLocked') : t('plan.form.tierHint')}
                >
                  <Input
                    id="plan-tier"
                    dir="ltr"
                    placeholder="pro"
                    disabled={isEditing}
                    data-testid="plan-tier"
                    {...register('tier')}
                  />
                </Field>
              </div>

              <Field
                label={t('plan.form.description')}
                htmlFor="plan-description"
                error={err('description')}
              >
                <Textarea
                  id="plan-description"
                  rows={3}
                  data-testid="plan-description"
                  {...register('description')}
                />
              </Field>

              <SwitchField
                control={control}
                name="isRecommended"
                label={t('plan.form.recommended')}
                description={t('plan.form.recommendedHint')}
                icon={<StarIcon />}
                testId="plan-recommended"
              />
            </>
          )}

          {tab === 'pricing' && (
            <>
              <div className={styles.grid2}>
                <Field
                  label={isOwner ? t('plan.form.monthlyPrice') : t('plan.form.price')}
                  htmlFor="plan-price"
                  error={err('priceSyp')}
                  hint={isFree ? t('plan.form.freePriceHint') : undefined}
                >
                  <Controller
                    control={control}
                    name="priceSyp"
                    render={({ field }) => (
                      <NumberControl
                        id="plan-price"
                        value={field.value}
                        onBlur={field.onBlur}
                        onChange={field.onChange}
                        step={1000}
                        testId="plan-price"
                      />
                    )}
                  />
                </Field>

                {isOwner ? (
                  <Field
                    label={t('plan.form.yearlyPrice')}
                    htmlFor="plan-yearly"
                    error={err('yearlyPriceSyp')}
                    hint={t('plan.form.yearlyHint')}
                  >
                    <Controller
                      control={control}
                      name="yearlyPriceSyp"
                      render={({ field }) => (
                        <NumberControl
                          id="plan-yearly"
                          value={field.value}
                          onBlur={field.onBlur}
                          onChange={field.onChange}
                          nullable
                          step={1000}
                          testId="plan-yearly"
                        />
                      )}
                    />
                  </Field>
                ) : (
                  <Field
                    label={t('plan.form.durationDays')}
                    htmlFor="plan-duration"
                    error={err('durationDays')}
                    hint={t('plan.form.durationHint')}
                  >
                    <Controller
                      control={control}
                      name="durationDays"
                      render={({ field }) => (
                        <NumberControl
                          id="plan-duration"
                          value={field.value}
                          onBlur={field.onBlur}
                          onChange={field.onChange}
                          nullable
                          placeholder={t('plan.form.durationOngoing')}
                          testId="plan-duration"
                        />
                      )}
                    />
                  </Field>
                )}
              </div>

              <Field
                label={t('plan.form.trialDays')}
                htmlFor="plan-trial"
                error={err('trialDays')}
                hint={t('plan.form.trialHint')}
              >
                <Controller
                  control={control}
                  name="trialDays"
                  render={({ field }) => (
                    <NumberControl
                      id="plan-trial"
                      value={field.value}
                      onBlur={field.onBlur}
                      onChange={field.onChange}
                      nullable
                      placeholder={t('plan.form.trialNone')}
                      testId="plan-trial"
                    />
                  )}
                />
              </Field>

              <div className={styles.preview} data-testid="plan-price-preview">
                <span className={styles.previewLabel}>{t('plan.form.pricePreview')}</span>
                <span className={styles.previewValue}>
                  <bdi>{fmt.money(priceSyp)}</bdi>{' '}
                  {isOwner
                    ? t('plan.price.perMonth')
                    : durationDays === null
                      ? t('plan.price.ongoing')
                      : t('plan.price.perTerm', { n: fmt.number(durationDays) })}
                </span>
                {isOwner && yearlyPriceSyp !== null && (
                  <span className={styles.previewSub}>
                    <bdi>{fmt.money(yearlyPriceSyp)}</bdi> {t('plan.price.perYear')}
                  </span>
                )}
              </div>
            </>
          )}

          {tab === 'features' &&
            (isOwner ? (
              <>
                <div className={styles.grid2}>
                  <Field
                    label={t('plan.gate.maxFacilities')}
                    htmlFor="plan-max-facilities"
                    error={nestedErr('featureGate', 'maxFacilities')}
                    hint={t('plan.form.unlimitedHint')}
                  >
                    <Controller
                      control={control}
                      name="featureGate.maxFacilities"
                      render={({ field }) => (
                        <NumberControl
                          id="plan-max-facilities"
                          value={field.value}
                          onBlur={field.onBlur}
                          onChange={field.onChange}
                          nullable
                          placeholder={t('plan.value.unlimited')}
                          testId="plan-max-facilities"
                        />
                      )}
                    />
                  </Field>
                  <Field
                    label={t('plan.gate.statsRetentionDays')}
                    htmlFor="plan-stats-days"
                    error={nestedErr('featureGate', 'statsRetentionDays')}
                    hint={t('plan.form.unlimitedHint')}
                  >
                    <Controller
                      control={control}
                      name="featureGate.statsRetentionDays"
                      render={({ field }) => (
                        <NumberControl
                          id="plan-stats-days"
                          value={field.value}
                          onBlur={field.onBlur}
                          onChange={field.onChange}
                          nullable
                          placeholder={t('plan.value.unlimited')}
                          testId="plan-stats-days"
                        />
                      )}
                    />
                  </Field>
                </div>

                <div className={styles.switches}>
                  <SwitchField
                    control={control}
                    name="featureGate.bannerUpload"
                    label={t('plan.gate.bannerUpload')}
                    icon={<ImageIcon />}
                    testId="plan-gate-banner"
                  />
                  <SwitchField
                    control={control}
                    name="featureGate.reviewReply"
                    label={t('plan.gate.reviewReply')}
                    icon={<StarIcon />}
                    testId="plan-gate-review"
                  />
                  <SwitchField
                    control={control}
                    name="featureGate.campaigns"
                    label={t('plan.gate.campaigns')}
                    icon={<SparklesIcon />}
                    testId="plan-gate-campaigns"
                  />
                  <SwitchField
                    control={control}
                    name="featureGate.prioritySupport"
                    label={t('plan.gate.prioritySupport')}
                    icon={<CheckIcon />}
                    testId="plan-gate-support"
                  />
                </div>
              </>
            ) : (
              <>
                <div className={styles.switches}>
                  <SwitchField
                    control={control}
                    name="entitlements.communityPost"
                    label={t('plan.entitlement.communityPost')}
                    description={t('plan.entitlement.communityPostHint')}
                    icon={<MessageCircleIcon />}
                    testId="plan-ent-community"
                  />
                  <SwitchField
                    control={control}
                    name="entitlements.communityMedia"
                    label={t('plan.entitlement.communityMedia')}
                    icon={<ImageIcon />}
                    testId="plan-ent-media"
                  />
                  <SwitchField
                    control={control}
                    name="entitlements.advancedStats"
                    label={t('plan.entitlement.advancedStats')}
                    icon={<TrendingUpIcon />}
                    testId="plan-ent-stats"
                  />
                  <SwitchField
                    control={control}
                    name="entitlements.prioritySupport"
                    label={t('plan.entitlement.prioritySupport')}
                    icon={<SparklesIcon />}
                    testId="plan-ent-support"
                  />
                </div>

                <Field
                  label={t('plan.entitlement.monthlyBookingLimit')}
                  htmlFor="plan-booking-limit"
                  error={nestedErr('entitlements', 'monthlyBookingLimit')}
                  hint={t('plan.form.unlimitedHint')}
                >
                  <Controller
                    control={control}
                    name="entitlements.monthlyBookingLimit"
                    render={({ field }) => (
                      <NumberControl
                        id="plan-booking-limit"
                        value={field.value}
                        onBlur={field.onBlur}
                        onChange={field.onChange}
                        nullable
                        placeholder={t('plan.value.unlimited')}
                        testId="plan-booking-limit"
                      />
                    )}
                  />
                </Field>
              </>
            ))}

          {tab === 'highlights' && (
            <Field
              label={t('plan.form.highlights')}
              error={err('highlights')}
              hint={t('plan.form.highlightsHint', { n: MAX_PLAN_HIGHLIGHTS })}
              tintControl={false}
            >
              <Controller
                control={control}
                name="highlights"
                render={({ field }) => (
                  <HighlightsEditor value={field.value} onChange={field.onChange} />
                )}
              />
            </Field>
          )}
        </div>
      </form>
    </Modal>
  );
}
