import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { Modal, Field, Input, Button, MapPicker } from '@ui';
import { regionFormSchema, type RegionFormValues } from '../api/region.schema';
import { useCreateRegion, useUpdateRegion } from '../hooks/useRegionMutations';
import type { Region } from '../api/region.types';
import styles from './regionForm.module.css';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  region: Region | null;
}

const BLANK: RegionFormValues = { name: '', centerLat: 0, centerLng: 0, radiusKm: 10 };
const RADIUS_MIN = 1;
const RADIUS_MAX = 100;

export function RegionFormModal({ isOpen, onClose, region }: Props) {
  const { t, i18n } = useTranslation();
  const createMutation = useCreateRegion();
  const updateMutation = useUpdateRegion();
  const isEditing = region !== null;
  const mutation = isEditing ? updateMutation : createMutation;
  const lang = i18n.language.startsWith('ar') ? 'ar' : 'en';

  // `values` (re-keyed on each open) syncs the form to the region DURING render,
  // so `watch()` returns the right coordinates on the very first render — the
  // MapPicker never mounts with stale/blank values, so editing doesn't flash the
  // whole-of-Syria view before snapping to the region.
  const values = useMemo<RegionFormValues>(
    () =>
      region
        ? {
            name: region.name,
            centerLat: region.centerLat,
            centerLng: region.centerLng,
            radiusKm: region.radiusKm,
          }
        : BLANK,
    // isOpen forces a fresh sync each time the modal opens (even for the same region).
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [region, isOpen],
  );

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<RegionFormValues>({
    resolver: zodResolver(regionFormSchema),
    defaultValues: BLANK,
    values,
  });

  const centerLat = watch('centerLat');
  const centerLng = watch('centerLng');
  const radiusKm = watch('radiusKm');
  const hasCenter = centerLat !== 0 || centerLng !== 0;

  const setRadius = (value: number) => {
    const clamped = Number.isFinite(value) ? value : 0;
    setValue('radiusKm', clamped, { shouldValidate: true });
  };

  const submit = handleSubmit(async (values) => {
    const input = {
      name: values.name,
      centerLat: values.centerLat,
      centerLng: values.centerLng,
      radiusKm: values.radiusKm,
    };
    if (region) {
      await updateMutation.mutateAsync({ id: region.id, input });
    } else {
      await createMutation.mutateAsync(input);
    }
    onClose();
  });

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t(isEditing ? 'region.form.editTitle' : 'region.form.createTitle')}
      size="lg"
      closeLabel={t('common.cancel')}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button
            type="submit"
            form="region-form"
            isLoading={mutation.isPending}
            data-testid="region-submit"
          >
            {t(isEditing ? 'region.form.saveSubmit' : 'region.form.createSubmit')}
          </Button>
        </>
      }
    >
      <form id="region-form" className={styles.form} onSubmit={submit} noValidate>
        <Field
          label={t('region.form.name')}
          htmlFor="region-name"
          error={errors.name ? t(errors.name.message ?? '') : undefined}
        >
          <Input
            id="region-name"
            placeholder={t('region.form.namePlaceholder')}
            data-testid="region-name"
            {...register('name')}
          />
        </Field>

        <Field
          label={t('region.form.center')}
          error={errors.centerLat ? t(errors.centerLat.message ?? '') : undefined}
        >
          <div data-testid="region-map">
            <MapPicker
              value={hasCenter ? { lat: centerLat, lng: centerLng } : null}
              radiusKm={radiusKm}
              onChange={(point) => {
                setValue('centerLat', point.lat, { shouldValidate: true });
                setValue('centerLng', point.lng, { shouldValidate: true });
              }}
              lang={lang}
              searchPlaceholder={t('region.map.search')}
              myLocationLabel={t('region.map.myLocation')}
              streetLabel={t('region.map.street')}
              satelliteLabel={t('region.map.satellite')}
              searchingLabel={t('region.map.searching')}
              noResultsLabel={t('region.map.noResults')}
              geolocationError={t('region.map.geoError')}
              hint={t('region.map.hint')}
            />
          </div>
        </Field>

        <Field
          label={t('region.form.radius')}
          htmlFor="region-radius"
          error={errors.radiusKm ? t(errors.radiusKm.message ?? '') : undefined}
        >
          <div className={styles.radiusRow}>
            <Input
              id="region-radius"
              type="number"
              inputMode="decimal"
              min={RADIUS_MIN}
              max={RADIUS_MAX}
              step={1}
              value={Number.isFinite(radiusKm) ? radiusKm : ''}
              onChange={(event) => setRadius(event.target.valueAsNumber)}
              data-testid="region-radius"
            />
            <input
              type="range"
              className={styles.slider}
              min={RADIUS_MIN}
              max={RADIUS_MAX}
              step={1}
              value={Math.min(RADIUS_MAX, Math.max(RADIUS_MIN, radiusKm || RADIUS_MIN))}
              onChange={(event) => setRadius(event.target.valueAsNumber)}
              aria-label={t('region.form.radius')}
            />
          </div>
        </Field>
      </form>
    </Modal>
  );
}
