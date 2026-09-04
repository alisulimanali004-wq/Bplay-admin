import { useRef } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { Button, Field, Input, Select, MapPicker, type MapLatLng } from '@ui';
import { reverseGeocodeAddress } from '@shared/lib/nominatim';
import { step3Schema, type Step3Values } from '../../api/facility.schema';
import {
  SYRIAN_GOVERNORATES,
  matchGovernorate,
  type CreateFacilityInput,
  type FacilityRegionSeed,
} from '../../api/facility.types';
import styles from './wizard.module.css';

export interface Step3LocationProps {
  draft: Partial<CreateFacilityInput>;
  /** When opened from a region, the map centres on it and draws the radius circle. */
  regionSeed?: FacilityRegionSeed | null;
  onBack: (patch: Partial<CreateFacilityInput>) => void;
  onNext: (patch: Partial<CreateFacilityInput>) => void;
}

/** A seeded 0,0 (never a real Syrian point) means "not chosen yet". */
function seedCoord(location: CreateFacilityInput['location'] | undefined, axis: 'lat' | 'lng'): number {
  if (!location) return Number.NaN;
  if (location.lat === 0 && location.lng === 0) return Number.NaN;
  const value = location[axis];
  return Number.isFinite(value) ? value : Number.NaN;
}

/** Wizard step 3 — drop the exact point on the map; address fields auto-fill and stay editable. */
export function Step3Location({ draft, regionSeed, onBack, onNext }: Step3LocationProps) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language.startsWith('ar') ? 'ar' : 'en';
  const geocodeAbort = useRef<AbortController | null>(null);

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    getValues,
    formState: { errors, isSubmitted, dirtyFields },
  } = useForm<Step3Values>({
    resolver: zodResolver(step3Schema),
    defaultValues: {
      governorate: draft.location?.governorate ?? 'damascus',
      city: draft.location?.city ?? '',
      district: draft.location?.district ?? '',
      address: draft.location?.address ?? '',
      lat: seedCoord(draft.location, 'lat'),
      lng: seedCoord(draft.location, 'lng'),
    },
  });

  // Latest dirty state, readable inside the async geocode callback so a result
  // that resolves after the user starts typing never clobbers their input.
  const dirtyRef = useRef(dirtyFields);
  dirtyRef.current = dirtyFields;

  const lat = watch('lat');
  const lng = watch('lng');
  const hasPoint = Number.isFinite(lat) && Number.isFinite(lng);

  const autofill = async (point: MapLatLng) => {
    geocodeAbort.current?.abort();
    const controller = new AbortController();
    geocodeAbort.current = controller;
    try {
      const address = await reverseGeocodeAddress(point.lat, point.lng, lang, controller.signal);
      if (!address) return;
      // Only fill fields the user has not manually edited (autofill setValue does
      // not mark fields dirty, so re-picking still refreshes prior auto-filled ones).
      const dirty = dirtyRef.current;
      if (address.city && !dirty.city) {
        setValue('city', address.city, { shouldValidate: isSubmitted });
      }
      if (address.district && !dirty.district) {
        setValue('district', address.district, { shouldValidate: isSubmitted });
      }
      const line = address.road ?? address.label.split(',').slice(0, 2).join(', ').trim();
      if (line && !dirty.address) {
        setValue('address', line, { shouldValidate: isSubmitted });
      }
      const governorate = matchGovernorate(address.state);
      if (governorate && !dirty.governorate) {
        setValue('governorate', governorate, { shouldValidate: isSubmitted });
      }
    } catch {
      /* aborted or offline — keep whatever the user typed */
    }
  };

  const onPick = (point: MapLatLng) => {
    setValue('lat', point.lat, { shouldValidate: isSubmitted });
    setValue('lng', point.lng, { shouldValidate: isSubmitted });
    void autofill(point);
  };

  const toPatch = (values: Step3Values): Partial<CreateFacilityInput> => ({
    location: {
      lat: values.lat,
      lng: values.lng,
      address: values.address,
      city: values.city,
      district: values.district,
      governorate: values.governorate,
    },
  });

  const submit = handleSubmit((values) => onNext(toPatch(values)));
  const pointError = errors.lat ?? errors.lng;

  return (
    <form className={styles.form} onSubmit={submit} noValidate>
      <div className={styles.group} role="group" aria-label={t('facility.wizard.location.pick')}>
        <span className={styles.groupLabel}>{t('facility.wizard.location.pick')}</span>
        <p className={styles.hint}>{t('facility.wizard.location.pickHint')}</p>
        <div className={styles.mapWrap} data-testid="wizard-map">
          <MapPicker
            value={hasPoint ? { lat, lng } : null}
            radiusKm={regionSeed?.radiusKm ?? 0}
            onChange={onPick}
            lang={lang}
            searchPlaceholder={t('facility.map.search')}
            myLocationLabel={t('facility.map.myLocation')}
            streetLabel={t('facility.map.street')}
            satelliteLabel={t('facility.map.satellite')}
            searchingLabel={t('facility.map.searching')}
            noResultsLabel={t('facility.map.noResults')}
            geolocationError={t('facility.map.geoError')}
            hint={t('facility.map.hint')}
          />
        </div>
        {pointError && (
          <p className={styles.error} role="alert">
            {t(pointError.message ?? '')}
          </p>
        )}
      </div>

      <Field
        label={t('facility.wizard.location.governorate')}
        htmlFor="w-governorate"
        required
        error={errors.governorate ? t(errors.governorate.message ?? '') : undefined}
      >
        <Controller
          control={control}
          name="governorate"
          render={({ field }) => (
            <Select
              id="w-governorate"
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              aria-label={t('facility.wizard.location.governorate')}
              options={SYRIAN_GOVERNORATES.map((governorate) => ({
                value: governorate,
                label: t(`facility.governorate.${governorate}`),
              }))}
            />
          )}
        />
      </Field>

      <div className={styles.row}>
        <Field
          label={t('facility.wizard.location.city')}
          htmlFor="w-city"
          required
          error={errors.city ? t(errors.city.message ?? '') : undefined}
        >
          <Input id="w-city" data-testid="wizard-city" {...register('city')} />
        </Field>
        <Field
          label={t('facility.wizard.location.district')}
          htmlFor="w-district"
          required
          error={errors.district ? t(errors.district.message ?? '') : undefined}
        >
          <Input id="w-district" data-testid="wizard-district" {...register('district')} />
        </Field>
      </div>

      <Field
        label={t('facility.wizard.location.address')}
        htmlFor="w-address"
        required
        error={errors.address ? t(errors.address.message ?? '') : undefined}
      >
        <Input id="w-address" data-testid="wizard-address" {...register('address')} />
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
