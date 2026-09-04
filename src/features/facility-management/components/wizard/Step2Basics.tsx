import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { Button, Field, Input, Textarea, PhoneIcon, clsx } from '@ui';
import { step2Schema, type Step2Values } from '../../api/facility.schema';
import {
  SPORT_TYPES,
  type CreateFacilityInput,
  type FacilityKind,
  type SportType,
} from '../../api/facility.types';
import styles from './wizard.module.css';

export interface Step2BasicsProps {
  draft: Partial<CreateFacilityInput>;
  kind: FacilityKind;
  onBack: (patch: Partial<CreateFacilityInput>) => void;
  onNext: (patch: Partial<CreateFacilityInput>) => void;
}

/** Wizard step 2 — name, description (club), sports chip-select and contact phone. */
export function Step2Basics({ draft, kind, onBack, onNext }: Step2BasicsProps) {
  const { t } = useTranslation();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    getValues,
    formState: { errors, isSubmitted },
  } = useForm<Step2Values>({
    resolver: zodResolver(step2Schema),
    defaultValues: {
      name: draft.name ?? '',
      description: draft.description ?? '',
      sports: draft.sports ?? [],
      contactPhone: draft.contactPhone ?? '',
    },
  });

  const sports = watch('sports');

  const toggleSport = (sport: SportType) => {
    const next =
      kind === 'pitch'
        ? [sport]
        : sports.includes(sport)
          ? sports.filter((item) => item !== sport)
          : [...sports, sport];
    setValue('sports', next, { shouldValidate: isSubmitted, shouldDirty: true });
  };

  const toPatch = (values: Step2Values): Partial<CreateFacilityInput> => ({
    name: values.name,
    description: kind === 'club' && values.description?.trim() ? values.description : undefined,
    sports: values.sports,
    contactPhone: values.contactPhone?.trim() ? values.contactPhone : undefined,
  });

  const submit = handleSubmit((values) => onNext(toPatch(values)));

  return (
    <form className={styles.form} onSubmit={submit} noValidate>
      <Field
        label={t('facility.wizard.basics.name')}
        htmlFor="w-name"
        required
        error={errors.name ? t(errors.name.message ?? '') : undefined}
      >
        <Input
          id="w-name"
          placeholder={t('facility.wizard.basics.namePlaceholder')}
          maxLength={60}
          data-testid="wizard-name"
          {...register('name')}
        />
      </Field>

      {kind === 'club' && (
        <Field
          label={t('facility.wizard.basics.description')}
          htmlFor="w-description"
          error={errors.description ? t(errors.description.message ?? '') : undefined}
        >
          <Textarea id="w-description" rows={3} maxLength={500} {...register('description')} />
        </Field>
      )}

      <div
        className={styles.group}
        role="group"
        aria-label={t(kind === 'club' ? 'facility.wizard.basics.sports' : 'facility.wizard.basics.sport')}
      >
        <span className={styles.groupLabel}>
          {t(kind === 'club' ? 'facility.wizard.basics.sports' : 'facility.wizard.basics.sport')}
        </span>
        <div className={styles.chips}>
          {SPORT_TYPES.map((sport) => {
            const selected = sports.includes(sport);
            return (
              <button
                key={sport}
                type="button"
                aria-pressed={selected}
                className={clsx(styles.chip, selected && styles.chipSelected)}
                onClick={() => toggleSport(sport)}
                data-testid={`wizard-sport-${sport}`}
              >
                {t(`facility.sport.${sport}`)}
              </button>
            );
          })}
        </div>
        {errors.sports && (
          <p className={styles.error} role="alert">
            {t(errors.sports.message ?? '')}
          </p>
        )}
      </div>

      <Field
        label={t('facility.wizard.basics.contactPhone')}
        htmlFor="w-phone"
        error={errors.contactPhone ? t(errors.contactPhone.message ?? '') : undefined}
      >
        <Input
          id="w-phone"
          type="tel"
          inputMode="tel"
          leftIcon={<PhoneIcon />}
          data-testid="wizard-phone"
          {...register('contactPhone')}
        />
      </Field>

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
