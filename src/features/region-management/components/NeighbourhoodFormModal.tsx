import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { Modal, Field, Input, Button, MapPicker } from '@ui';
import { haversineKm } from '@shared/lib/geo';
import {
  neighbourhoodFormSchema,
  type NeighbourhoodFormValues,
} from '../api/region.schema';
import { useCreateNeighbourhood, useUpdateNeighbourhood } from '../hooks/useNeighbourhoods';
import type { Region } from '../api/region.types';
import type { Neighbourhood } from '../api/neighbourhood.types';
import styles from './regionForm.module.css';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  /** The parent city. Its circle seeds the map and bounds the new one. */
  city: Region;
  /** Null when adding. */
  neighbourhood: Neighbourhood | null;
}

const RADIUS_MIN = 0.5;
const RADIUS_MAX = 50;
/** A sensible default that comfortably fits inside a typical city circle. */
const DEFAULT_RADIUS_KM = 2.5;

export function NeighbourhoodFormModal({ isOpen, onClose, city, neighbourhood }: Props) {
  const { t, i18n } = useTranslation();
  const createMutation = useCreateNeighbourhood();
  const updateMutation = useUpdateNeighbourhood();
  const isEditing = neighbourhood !== null;
  const mutation = isEditing ? updateMutation : createMutation;
  const lang = i18n.language.startsWith('ar') ? 'ar' : 'en';

  // A new neighbourhood starts at its city's centre, so the map opens on the
  // city rather than on a blank world view and the first pin is already valid.
  const values = useMemo<NeighbourhoodFormValues>(
    () =>
      neighbourhood
        ? {
            name: neighbourhood.name,
            centerLat: neighbourhood.centerLat,
            centerLng: neighbourhood.centerLng,
            radiusKm: neighbourhood.radiusKm,
          }
        : {
            name: '',
            centerLat: city.centerLat,
            centerLng: city.centerLng,
            radiusKm: DEFAULT_RADIUS_KM,
          },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [neighbourhood, city, isOpen],
  );

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<NeighbourhoodFormValues>({
    resolver: zodResolver(neighbourhoodFormSchema),
    defaultValues: values,
    values,
  });

  const centerLat = watch('centerLat');
  const centerLng = watch('centerLng');
  const radiusKm = watch('radiusKm');
  const hasCenter = centerLat !== 0 || centerLng !== 0;

  /**
   * Warn BEFORE submitting when the circle escapes its city.
   *
   * The server checks containment against the city's real polygon and answers
   * with ERR_NEIGHBOURHOOD_OUTSIDE_BOUNDS. Approximating it here against the
   * city's circle turns that round-trip rejection into immediate feedback,
   * while the server stays the authority — this only ever warns.
   */
  const escapesCity =
    hasCenter &&
    Number.isFinite(city.centerLat) &&
    Number.isFinite(city.radiusKm) &&
    haversineKm(
      { lat: centerLat, lng: centerLng },
      { lat: city.centerLat, lng: city.centerLng },
    ) +
      (Number.isFinite(radiusKm) ? radiusKm : 0) >
      city.radiusKm;

  const setRadius = (value: number) => {
    setValue('radiusKm', Number.isFinite(value) ? value : 0, { shouldValidate: true });
  };

  const submit = handleSubmit(async (formValues) => {
    const input = {
      name: formValues.name,
      centerLat: formValues.centerLat,
      centerLng: formValues.centerLng,
      radiusKm: formValues.radiusKm,
    };
    if (neighbourhood) {
      await updateMutation.mutateAsync({ id: neighbourhood.id, input });
    } else {
      await createMutation.mutateAsync(input);
    }
    onClose();
  });

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t(isEditing ? 'region.hood.form.editTitle' : 'region.hood.form.createTitle', {
        city: city.name,
      })}
      size="lg"
      closeLabel={t('common.cancel')}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button
            type="submit"
            form="neighbourhood-form"
            isLoading={mutation.isPending}
            data-testid="hood-submit"
          >
            {t(isEditing ? 'region.form.saveSubmit' : 'region.form.createSubmit')}
          </Button>
        </>
      }
    >
      <form id="neighbourhood-form" className={styles.form} onSubmit={submit} noValidate>
        <Field
          label={t('region.hood.form.name')}
          htmlFor="hood-name"
          error={errors.name ? t(errors.name.message ?? '') : undefined}
        >
          <Input
            id="hood-name"
            placeholder={t('region.hood.form.namePlaceholder')}
            data-testid="hood-name"
            {...register('name')}
          />
        </Field>

        <Field
          label={t('region.form.center')}
          error={errors.centerLat ? t(errors.centerLat.message ?? '') : undefined}
          hint={t('region.hood.form.centerHint', { city: city.name })}
        >
          <div data-testid="hood-map">
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

        {escapesCity && (
          <p className={styles.warn} role="alert" data-testid="hood-bounds-warning">
            {t('region.hood.form.outsideWarning', { city: city.name })}
          </p>
        )}

        <Field
          label={t('region.form.radius')}
          htmlFor="hood-radius"
          error={errors.radiusKm ? t(errors.radiusKm.message ?? '') : undefined}
        >
          <div className={styles.radiusRow}>
            <Input
              id="hood-radius"
              type="number"
              inputMode="decimal"
              min={RADIUS_MIN}
              max={RADIUS_MAX}
              step={0.5}
              value={Number.isFinite(radiusKm) ? radiusKm : ''}
              onChange={(event) => setRadius(event.target.valueAsNumber)}
              data-testid="hood-radius"
            />
            <input
              type="range"
              className={styles.slider}
              min={RADIUS_MIN}
              max={RADIUS_MAX}
              step={0.5}
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
