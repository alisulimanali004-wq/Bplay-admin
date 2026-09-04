import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { Button, Field, Input, Select, IconButton, PlusIcon, TrashIcon, clsx } from '@ui';
import { stepCourtsSchema, type StepCourtsValues } from '../../api/facility.schema';
import {
  SPORT_TYPES,
  PITCH_SURFACES,
  type CourtInput,
  type CreateFacilityInput,
  type PitchSurface,
  type SportType,
} from '../../api/facility.types';
import styles from './wizard.module.css';

export interface StepCourtsProps {
  draft: Partial<CreateFacilityInput>;
  onBack: (patch: Partial<CreateFacilityInput>) => void;
  onNext: (patch: Partial<CreateFacilityInput>) => void;
}

function blankCourt(): CourtInput {
  return {
    name: '',
    sport: 'football',
    // 0 (not NaN) so an empty price fails Zod's `.positive()` with the localized
    // message instead of the raw invalid_type text a NaN would produce.
    pricePerHour: 0,
    surface: 'artificial',
    isIndoor: false,
    hasLighting: true,
    capacity: undefined,
    isActive: true,
  };
}

interface ToggleProps {
  label: string;
  checked: boolean;
  onChange: () => void;
  testId?: string;
}

function Toggle({ label, checked, onChange, testId }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      className={styles.courtToggle}
      onClick={onChange}
      data-testid={testId}
    >
      <span className={clsx(styles.switch, checked && styles.switchOn)}>
        <span className={styles.knob} aria-hidden />
      </span>
      <span className={styles.courtToggleLabel}>{label}</span>
    </button>
  );
}

/** Wizard step (club only) — author the club's courts (add / edit / remove). */
export function StepCourts({ draft, onBack, onNext }: StepCourtsProps) {
  const { t } = useTranslation();

  const {
    handleSubmit,
    watch,
    setValue,
    getValues,
    formState: { errors, isSubmitted },
  } = useForm<StepCourtsValues>({
    resolver: zodResolver(stepCourtsSchema),
    defaultValues: {
      courts: draft.courts && draft.courts.length > 0 ? draft.courts : [blankCourt()],
    },
  });

  const courts = watch('courts');

  const update = (index: number, patch: Partial<CourtInput>) =>
    setValue(
      'courts',
      courts.map((court, i) => (i === index ? { ...court, ...patch } : court)),
      { shouldValidate: isSubmitted, shouldDirty: true },
    );

  const addCourt = () =>
    setValue('courts', [...courts, blankCourt()], { shouldValidate: false, shouldDirty: true });

  const removeCourt = (index: number) =>
    setValue(
      'courts',
      courts.filter((_, i) => i !== index),
      { shouldValidate: isSubmitted, shouldDirty: true },
    );

  const fieldError = (index: number, key: 'name' | 'pricePerHour'): string | undefined => {
    const list = errors.courts as
      | Array<Record<string, { message?: string }> | undefined>
      | undefined;
    const message = list?.[index]?.[key]?.message;
    return message ? t(message) : undefined;
  };

  const arrayError =
    typeof errors.courts?.message === 'string' ? t(errors.courts.message) : undefined;

  const submit = handleSubmit((values) => onNext({ courts: values.courts }));

  return (
    <form className={styles.form} onSubmit={submit} noValidate>
      <h2 className={styles.stepTitle}>{t('facility.wizard.courts.title')}</h2>
      <p className={styles.hint}>{t('facility.wizard.courts.hint')}</p>

      <div className={styles.courts}>
        {courts.map((court, index) => (
          <div key={index} className={styles.courtCard} data-testid={`wizard-court-${index}`}>
            <div className={styles.courtHead}>
              <span className={styles.courtIndex}>
                {t('facility.wizard.courts.court')} {index + 1}
              </span>
              <IconButton
                size="sm"
                variant="ghost"
                icon={<TrashIcon />}
                label={t('facility.wizard.courts.remove')}
                onClick={() => removeCourt(index)}
                disabled={courts.length === 1}
                data-testid={`wizard-court-remove-${index}`}
              />
            </div>

            <div className={styles.courtGrid}>
              <Field
                label={t('facility.wizard.courts.name')}
                htmlFor={`court-name-${index}`}
                required
                error={fieldError(index, 'name')}
              >
                <Input
                  id={`court-name-${index}`}
                  value={court.name}
                  onChange={(event) => update(index, { name: event.target.value })}
                />
              </Field>
              <Field label={t('facility.wizard.courts.sport')} htmlFor={`court-sport-${index}`}>
                <Select
                  id={`court-sport-${index}`}
                  value={court.sport}
                  onChange={(value) => update(index, { sport: value as SportType })}
                  aria-label={t('facility.wizard.courts.sport')}
                  options={SPORT_TYPES.map((sport) => ({
                    value: sport,
                    label: t(`facility.sport.${sport}`),
                  }))}
                />
              </Field>
              <Field
                label={t('facility.wizard.courts.price')}
                htmlFor={`court-price-${index}`}
                required
                error={fieldError(index, 'pricePerHour')}
              >
                <Input
                  id={`court-price-${index}`}
                  type="number"
                  min={0}
                  step="any"
                  inputMode="decimal"
                  value={court.pricePerHour > 0 ? court.pricePerHour : ''}
                  onChange={(event) => {
                    const next = event.target.valueAsNumber;
                    update(index, { pricePerHour: Number.isFinite(next) ? next : 0 });
                  }}
                />
              </Field>
              <Field label={t('facility.wizard.courts.surface')} htmlFor={`court-surface-${index}`}>
                <Select
                  id={`court-surface-${index}`}
                  value={court.surface}
                  onChange={(value) => update(index, { surface: value as PitchSurface })}
                  aria-label={t('facility.wizard.courts.surface')}
                  options={PITCH_SURFACES.map((surface) => ({
                    value: surface,
                    label: t(`facility.surface.${surface}`),
                  }))}
                />
              </Field>
              <Field label={t('facility.wizard.courts.capacity')} htmlFor={`court-capacity-${index}`}>
                <Input
                  id={`court-capacity-${index}`}
                  type="number"
                  min={1}
                  step={1}
                  inputMode="numeric"
                  value={court.capacity ?? ''}
                  onChange={(event) => {
                    const next = event.target.valueAsNumber;
                    update(index, { capacity: Number.isFinite(next) ? next : undefined });
                  }}
                />
              </Field>
            </div>

            <div className={styles.courtToggles}>
              <Toggle
                label={t('facility.profile.indoor')}
                checked={court.isIndoor}
                onChange={() => update(index, { isIndoor: !court.isIndoor })}
                testId={`wizard-court-indoor-${index}`}
              />
              <Toggle
                label={t('facility.profile.lighting')}
                checked={court.hasLighting}
                onChange={() => update(index, { hasLighting: !court.hasLighting })}
                testId={`wizard-court-lighting-${index}`}
              />
              <Toggle
                label={t('facility.wizard.courts.active')}
                checked={court.isActive}
                onChange={() => update(index, { isActive: !court.isActive })}
                testId={`wizard-court-active-${index}`}
              />
            </div>
          </div>
        ))}
      </div>

      {arrayError && (
        <p className={styles.error} role="alert">
          {arrayError}
        </p>
      )}

      <Button
        variant="secondary"
        leftIcon={<PlusIcon />}
        onClick={addCourt}
        className={styles.addCourt}
        data-testid="wizard-court-add"
      >
        {t('facility.wizard.courts.add')}
      </Button>

      <footer className={styles.footer}>
        <Button
          variant="ghost"
          className={styles.footerBack}
          onClick={() => onBack({ courts: getValues('courts') })}
          data-testid="wizard-back"
        >
          {t('facility.wizard.back')}
        </Button>
        <Button type="submit" data-testid="wizard-next">
          {t('facility.wizard.next')}
        </Button>
      </footer>
    </form>
  );
}
