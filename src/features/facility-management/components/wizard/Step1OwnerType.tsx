import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { Button, Field, Select, BuildingIcon, StadiumIcon } from '@ui';
import { step1Schema, type Step1Values } from '../../api/facility.schema';
import type { CreateFacilityInput } from '../../api/facility.types';
import { useOwnersForPicker } from '../../hooks/useOwnersForPicker';
import { ToggleCard } from '../ToggleCard';
import styles from './wizard.module.css';

export interface Step1OwnerTypeProps {
  draft: Partial<CreateFacilityInput>;
  onNext: (patch: Partial<CreateFacilityInput>) => void;
}

/** Wizard step 1 — pick the owning account and the facility kind (club/pitch). */
export function Step1OwnerType({ draft, onNext }: Step1OwnerTypeProps) {
  const { t } = useTranslation();
  const owners = useOwnersForPicker();

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<Step1Values>({
    resolver: zodResolver(step1Schema),
    defaultValues: { ownerId: draft.ownerId ?? '', kind: draft.kind ?? 'club' },
  });

  const kind = watch('kind');

  const submit = handleSubmit((values) => onNext({ ownerId: values.ownerId, kind: values.kind }));

  return (
    <form className={styles.form} onSubmit={submit} noValidate>
      <Field
        label={t('facility.wizard.owner.label')}
        htmlFor="w-owner"
        required
        error={errors.ownerId ? t(errors.ownerId.message ?? '') : undefined}
      >
        <Controller
          control={control}
          name="ownerId"
          render={({ field }) => (
            <Select
              id="w-owner"
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              placeholder={t('facility.wizard.owner.placeholder')}
              disabled={owners.isLoading}
              aria-label={t('facility.wizard.owner.label')}
              options={(owners.data ?? []).map((owner) => ({
                value: owner.id,
                label: `${owner.name} — ${owner.email}`,
              }))}
            />
          )}
        />
        {/* Only APPROVED owners are listed, so an empty dropdown is a real state
            with a real cause — not a loading glitch. Say so, or the admin is
            left staring at an empty list wondering what broke. */}
        {!owners.isLoading && (owners.data ?? []).length === 0 && (
          <p className={styles.hint}>{t('facility.wizard.owner.noneApproved')}</p>
        )}
      </Field>

      <div className={styles.group} role="group" aria-label={t('facility.wizard.owner.kindLabel')}>
        <span className={styles.groupLabel}>{t('facility.wizard.owner.kindLabel')}</span>
        <div className={styles.tiles}>
          <ToggleCard
            title={t('facility.wizard.owner.clubTitle')}
            description={t('facility.wizard.owner.clubDesc')}
            icon={<BuildingIcon />}
            selected={kind === 'club'}
            onSelect={() => setValue('kind', 'club', { shouldValidate: true })}
            data-testid="wizard-kind-club"
          />
          <ToggleCard
            title={t('facility.wizard.owner.pitchTitle')}
            description={t('facility.wizard.owner.pitchDesc')}
            icon={<StadiumIcon />}
            selected={kind === 'pitch'}
            onSelect={() => setValue('kind', 'pitch', { shouldValidate: true })}
            data-testid="wizard-kind-pitch"
          />
        </div>
      </div>

      <footer className={styles.footer}>
        <Button type="submit" data-testid="wizard-next">
          {t('facility.wizard.next')}
        </Button>
      </footer>
    </form>
  );
}
