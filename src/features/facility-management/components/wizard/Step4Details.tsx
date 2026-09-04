import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import type { z } from 'zod';
import { Button, Field, Input, Select, clsx } from '@ui';
import {
  step4ClubSchema,
  step4PitchSchema,
  type Step4ClubValues,
  type Step4PitchValues,
} from '../../api/facility.schema';
import {
  PITCH_SURFACES,
  type CreateFacilityInput,
  type DayHours,
  type FacilityKind,
  type WorkingHours,
} from '../../api/facility.types';
import styles from './wizard.module.css';

export interface Step4DetailsProps {
  draft: Partial<CreateFacilityInput>;
  kind: FacilityKind;
  onBack: (patch: Partial<CreateFacilityInput>) => void;
  onNext: (patch: Partial<CreateFacilityInput>) => void;
}

/** Wizard step 4 — pitch specs & pricing, or the club's 7-day working-hours editor. */
export function Step4Details(props: Step4DetailsProps) {
  return props.kind === 'club' ? <ClubDetails {...props} /> : <PitchDetails {...props} />;
}

// ---------------------------------------------------------------------------
// Club — working hours (ISO weekdays 1..7, seeded 09:00–23:00 on toggle-open)
// ---------------------------------------------------------------------------

const WEEKDAYS = [1, 2, 3, 4, 5, 6, 7] as const;

function seedWorkingHours(draft: Partial<CreateFacilityInput>): Record<string, DayHours> {
  const source = draft.workingHours ?? {};
  const record: Record<string, DayHours> = {};
  for (const day of WEEKDAYS) {
    const existing = source[day];
    record[String(day)] = existing
      ? { isOpen: existing.isOpen, openTime: existing.openTime, closeTime: existing.closeTime }
      : { isOpen: false };
  }
  return record;
}

function toWorkingHours(record: Record<string, DayHours>): WorkingHours {
  const hours: WorkingHours = {};
  for (const [key, value] of Object.entries(record)) {
    const day = Number(key);
    if (Number.isInteger(day)) hours[day] = value;
  }
  return hours;
}

function ClubDetails({ draft, onBack, onNext }: Step4DetailsProps) {
  const { t } = useTranslation();

  const {
    handleSubmit,
    watch,
    setValue,
    getValues,
    formState: { errors, isSubmitted },
  } = useForm<Step4ClubValues>({
    resolver: zodResolver(step4ClubSchema),
    defaultValues: { workingHours: seedWorkingHours(draft) },
  });

  const hours = watch('workingHours');

  const updateDay = (day: number, patch: Partial<DayHours>) => {
    const key = String(day);
    const current = hours[key] ?? { isOpen: false };
    const next: DayHours = { ...current, ...patch };
    if (patch.isOpen === true && !current.openTime && !current.closeTime) {
      next.openTime = '09:00';
      next.closeTime = '23:00';
    }
    setValue(
      'workingHours',
      { ...hours, [key]: next },
      { shouldValidate: isSubmitted, shouldDirty: true },
    );
  };

  const toPatch = (values: Step4ClubValues): Partial<CreateFacilityInput> => ({
    workingHours: toWorkingHours(values.workingHours),
  });

  const submit = handleSubmit((values) => onNext(toPatch(values)));
  const hoursError =
    typeof errors.workingHours?.message === 'string' ? errors.workingHours.message : undefined;

  return (
    <form className={styles.form} onSubmit={submit} noValidate>
      <h2 className={styles.stepTitle}>{t('facility.wizard.details.clubTitle')}</h2>

      <div className={styles.days}>
        {WEEKDAYS.map((day) => {
          const dayName = t(`facility.days.${day}`);
          const dayHours = hours[String(day)] ?? { isOpen: false };
          return (
            <div key={day} className={styles.day}>
              <span className={styles.dayName}>{dayName}</span>
              <button
                type="button"
                role="switch"
                aria-checked={dayHours.isOpen}
                aria-label={`${dayName} — ${t('facility.wizard.details.open')}`}
                className={clsx(styles.switch, dayHours.isOpen && styles.switchOn)}
                onClick={() => updateDay(day, { isOpen: !dayHours.isOpen })}
                data-testid={`wizard-day-${day}`}
              >
                <span className={styles.knob} aria-hidden />
              </button>
              <div className={styles.dayTimes}>
                <Input
                  type="time"
                  className={styles.timeInput}
                  value={dayHours.openTime ?? ''}
                  disabled={!dayHours.isOpen}
                  aria-label={`${dayName} — ${t('facility.wizard.details.from')}`}
                  onChange={(event) => updateDay(day, { openTime: event.target.value })}
                />
                <Input
                  type="time"
                  className={styles.timeInput}
                  value={dayHours.closeTime ?? ''}
                  disabled={!dayHours.isOpen}
                  aria-label={`${dayName} — ${t('facility.wizard.details.to')}`}
                  onChange={(event) => updateDay(day, { closeTime: event.target.value })}
                />
              </div>
            </div>
          );
        })}
      </div>

      {hoursError && (
        <p className={styles.error} role="alert">
          {t(hoursError)}
        </p>
      )}

      <footer className={styles.footer}>
        <Button
          variant="ghost"
          className={styles.footerBack}
          onClick={() => onBack(toPatch(getValues()))}
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

// ---------------------------------------------------------------------------
// Pitch — price, capacity, surface, amenity chips and cancellation policy
// ---------------------------------------------------------------------------

/** Raw (pre-coercion) values — the numeric fields arrive as strings. */
type Step4PitchInput = z.input<typeof step4PitchSchema>;

const AMENITIES = [
  { key: 'isIndoor', labelKey: 'facility.profile.indoor' },
  { key: 'hasLighting', labelKey: 'facility.profile.lighting' },
  { key: 'hasParking', labelKey: 'facility.profile.parking' },
  { key: 'hasLockerRoom', labelKey: 'facility.profile.lockerRoom' },
  { key: 'hasCafe', labelKey: 'facility.profile.cafe' },
] as const;

function asOptionalNumber(value: unknown): number | undefined {
  if (value === '' || value === null || value === undefined) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function PitchDetails({ draft, onBack, onNext }: Step4DetailsProps) {
  const { t } = useTranslation();

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    getValues,
    formState: { errors },
  } = useForm<Step4PitchInput, unknown, Step4PitchValues>({
    resolver: zodResolver(step4PitchSchema),
    defaultValues: {
      pricePerHour: draft.pricePerHour ?? '',
      capacity: draft.capacity ?? '',
      specs: draft.specs ?? {
        surface: 'artificial',
        isIndoor: false,
        hasLighting: false,
        hasParking: false,
        hasLockerRoom: false,
        hasCafe: false,
      },
      cancelPolicy: draft.cancelPolicy ?? { freeHoursBefore: 24, penaltyPercent: 0 },
    },
  });

  const specs = watch('specs');

  const toggleAmenity = (key: (typeof AMENITIES)[number]['key']) => {
    const next = { ...specs };
    next[key] = !next[key];
    setValue('specs', next, { shouldDirty: true });
  };

  const rawPatch = (values: Step4PitchInput): Partial<CreateFacilityInput> => ({
    pricePerHour: asOptionalNumber(values.pricePerHour),
    capacity: asOptionalNumber(values.capacity),
    specs: values.specs,
    cancelPolicy: {
      freeHoursBefore: asOptionalNumber(values.cancelPolicy.freeHoursBefore) ?? 24,
      penaltyPercent: asOptionalNumber(values.cancelPolicy.penaltyPercent) ?? 0,
    },
  });

  const submit = handleSubmit((values) =>
    onNext({
      pricePerHour: values.pricePerHour,
      capacity: values.capacity,
      specs: values.specs,
      cancelPolicy: values.cancelPolicy,
    }),
  );

  return (
    <form className={styles.form} onSubmit={submit} noValidate>
      <h2 className={styles.stepTitle}>{t('facility.wizard.details.pitchTitle')}</h2>

      <div className={styles.row}>
        <Field
          label={t('facility.wizard.details.pricePerHour')}
          htmlFor="w-price"
          required
          error={errors.pricePerHour ? t(errors.pricePerHour.message ?? '') : undefined}
        >
          <Input
            id="w-price"
            type="number"
            min={0}
            step="any"
            inputMode="decimal"
            data-testid="wizard-price"
            {...register('pricePerHour')}
          />
        </Field>
        <Field
          label={t('facility.wizard.details.capacity')}
          htmlFor="w-capacity"
          error={errors.capacity ? t(errors.capacity.message ?? '') : undefined}
        >
          <Input
            id="w-capacity"
            type="number"
            min={1}
            step={1}
            inputMode="numeric"
            data-testid="wizard-capacity"
            {...register('capacity')}
          />
        </Field>
      </div>

      <Field
        label={t('facility.wizard.details.surface')}
        htmlFor="w-surface"
        required
        error={errors.specs?.surface ? t(errors.specs.surface.message ?? '') : undefined}
      >
        <Controller
          control={control}
          name="specs.surface"
          render={({ field }) => (
            <Select
              id="w-surface"
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              aria-label={t('facility.wizard.details.surface')}
              options={PITCH_SURFACES.map((surface) => ({
                value: surface,
                label: t(`facility.surface.${surface}`),
              }))}
            />
          )}
        />
      </Field>

      <div className={styles.group} role="group" aria-label={t('facility.wizard.details.amenities')}>
        <span className={styles.groupLabel}>{t('facility.wizard.details.amenities')}</span>
        <div className={styles.chips}>
          {AMENITIES.map((amenity) => {
            const selected = specs[amenity.key];
            return (
              <button
                key={amenity.key}
                type="button"
                aria-pressed={selected}
                className={clsx(styles.chip, selected && styles.chipSelected)}
                onClick={() => toggleAmenity(amenity.key)}
                data-testid={`wizard-amenity-${amenity.key}`}
              >
                {t(amenity.labelKey)}
              </button>
            );
          })}
        </div>
      </div>

      <div className={styles.row}>
        <Field
          label={t('facility.wizard.details.freeHoursBefore')}
          htmlFor="w-free-hours"
          error={
            errors.cancelPolicy?.freeHoursBefore
              ? t(errors.cancelPolicy.freeHoursBefore.message ?? '')
              : undefined
          }
        >
          <Input
            id="w-free-hours"
            type="number"
            min={0}
            step={1}
            inputMode="numeric"
            data-testid="wizard-free-hours"
            {...register('cancelPolicy.freeHoursBefore')}
          />
        </Field>
        <Field
          label={t('facility.wizard.details.penaltyPercent')}
          htmlFor="w-penalty"
          error={
            errors.cancelPolicy?.penaltyPercent
              ? t(errors.cancelPolicy.penaltyPercent.message ?? '')
              : undefined
          }
        >
          <Input
            id="w-penalty"
            type="number"
            min={0}
            max={100}
            step={1}
            inputMode="numeric"
            data-testid="wizard-penalty"
            {...register('cancelPolicy.penaltyPercent')}
          />
        </Field>
      </div>

      <footer className={styles.footer}>
        <Button
          variant="ghost"
          className={styles.footerBack}
          onClick={() => onBack(rawPatch(getValues()))}
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
