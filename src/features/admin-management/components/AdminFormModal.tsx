import { useMemo, useState } from 'react';
import { useForm, Controller, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import {
  Modal,
  Field,
  Input,
  PasswordInput,
  PhoneInput,
  Select,
  Button,
  SparklesIcon,
  toLocalPhone,
} from '@ui';
import { generateStrongPassword } from '@shared/lib/password';
import {
  createAdminSchema,
  editAdminSchema,
  type AdminFormValues,
} from '../api/admin.schema';
import { useCreateAdmin, useUpdateAdmin } from '../hooks/useAdminMutations';
import { RegionPicker } from './RegionPicker';
import type { Admin } from '../api/admin.types';
import styles from './adminForm.module.css';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  admin: Admin | null;
}

const BLANK: AdminFormValues = {
  name: '',
  email: '',
  password: '',
  phone: '',
  nationalId: '',
  scope: 'regional',
  regionIds: [],
};

export function AdminFormModal({ isOpen, onClose, admin }: Props) {
  const { t } = useTranslation();
  const createMutation = useCreateAdmin();
  const updateMutation = useUpdateAdmin();
  const isEditing = admin !== null;
  const mutation = isEditing ? updateMutation : createMutation;

  // `values` (re-keyed on open) syncs the form to the admin DURING render, so the
  // PhoneInput / region picker show the right values on first render (no flash).
  const values = useMemo<AdminFormValues>(
    () =>
      admin
        ? {
            name: admin.name,
            email: admin.email,
            password: '',
            phone: toLocalPhone(admin.phone),
            nationalId: admin.nationalId,
            scope: admin.scope,
            regionIds: admin.assignedRegionIds,
          }
        : BLANK,
    // isOpen forces a fresh sync each time the modal opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [admin, isOpen],
  );

  const [passwordVisible, setPasswordVisible] = useState(false);

  const {
    control,
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<AdminFormValues>({
    // The edit schema omits the password; cast so one form serves both modes.
    resolver: zodResolver(
      isEditing ? editAdminSchema : createAdminSchema,
    ) as unknown as Resolver<AdminFormValues>,
    // Validate on blur then live — errors surface as the user moves through the
    // form (identical UX for Add and Edit), not only on submit.
    mode: 'onTouched',
    defaultValues: BLANK,
    values,
  });

  const scope = watch('scope');

  /** Fill a strong, rule-compliant initial password and reveal it. */
  const suggestPassword = () => {
    setValue('password', generateStrongPassword(), {
      shouldValidate: true,
      shouldDirty: true,
      shouldTouch: true,
    });
    setPasswordVisible(true);
  };

  const submit = handleSubmit(async (data) => {
    const regionIds = data.scope === 'regional' ? data.regionIds : [];
    if (admin) {
      await updateMutation.mutateAsync({
        id: admin.id,
        input: {
          name: data.name,
          email: data.email,
          phone: data.phone,
          nationalId: data.nationalId,
          scope: data.scope,
          regionIds,
        },
      });
    } else {
      await createMutation.mutateAsync({
        name: data.name,
        email: data.email,
        password: data.password,
        phone: data.phone,
        nationalId: data.nationalId,
        scope: data.scope,
        regionIds,
      });
    }
    onClose();
  });

  const err = (key: keyof AdminFormValues) => {
    const message = errors[key]?.message;
    return message ? t(message) : undefined;
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t(isEditing ? 'admin.form.editTitle' : 'admin.form.createTitle')}
      size="lg"
      closeLabel={t('common.cancel')}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" form="admin-form" isLoading={mutation.isPending} data-testid="admin-submit">
            {t(isEditing ? 'admin.form.saveSubmit' : 'admin.form.createSubmit')}
          </Button>
        </>
      }
    >
      <form id="admin-form" className={styles.form} onSubmit={submit} noValidate>
        <div className={styles.grid2}>
          <Field label={t('admin.form.name')} htmlFor="admin-name" error={err('name')}>
            <Input id="admin-name" data-testid="admin-name" {...register('name')} />
          </Field>
          <Field label={t('admin.form.email')} htmlFor="admin-email" error={err('email')}>
            <Input id="admin-email" type="email" dir="ltr" data-testid="admin-email" {...register('email')} />
          </Field>
        </div>

        <div className={styles.grid2}>
          <Field label={t('admin.form.phone')} htmlFor="admin-phone" error={err('phone')}>
            <Controller
              control={control}
              name="phone"
              render={({ field }) => (
                <PhoneInput
                  id="admin-phone"
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  invalid={Boolean(errors.phone)}
                  data-testid="admin-phone"
                />
              )}
            />
          </Field>
          <Field label={t('admin.form.nationalId')} htmlFor="admin-national" error={err('nationalId')}>
            <Controller
              control={control}
              name="nationalId"
              render={({ field }) => (
                <Input
                  id="admin-national"
                  inputMode="numeric"
                  maxLength={11}
                  dir="ltr"
                  placeholder="XXXXXXXXXXX"
                  data-testid="admin-national"
                  value={field.value}
                  onBlur={field.onBlur}
                  // Digits only — strip anything else (also handles pasted text).
                  onChange={(event) =>
                    field.onChange(event.target.value.replace(/\D/g, '').slice(0, 11))
                  }
                />
              )}
            />
          </Field>
        </div>

        {!isEditing && (
          <Field
            label={t('admin.form.password')}
            htmlFor="admin-password"
            error={err('password')}
            hint={t('admin.form.passwordHint')}
          >
            <div className={styles.passwordRow}>
              <PasswordInput
                id="admin-password"
                autoComplete="new-password"
                showLabel={t('auth.showPassword')}
                hideLabel={t('auth.hidePassword')}
                visible={passwordVisible}
                onVisibleChange={setPasswordVisible}
                data-testid="admin-password"
                {...register('password')}
              />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                leftIcon={<SparklesIcon />}
                onClick={suggestPassword}
                data-testid="admin-suggest-password"
              >
                {t('admin.form.suggestPassword')}
              </Button>
            </div>
          </Field>
        )}

        <Field label={t('admin.form.scope')} htmlFor="admin-scope" error={err('scope')} hint={t('admin.form.scopeHint')}>
          <Controller
            control={control}
            name="scope"
            render={({ field }) => (
              <Select
                id="admin-scope"
                value={field.value}
                onChange={(value) => {
                  field.onChange(value);
                  if (value === 'general') setValue('regionIds', []);
                }}
                aria-label={t('admin.form.scope')}
                options={[
                  { value: 'regional', label: t('admin.scope.regional') },
                  { value: 'general', label: t('admin.scope.general') },
                ]}
              />
            )}
          />
        </Field>

        {scope === 'regional' && (
          <Field label={t('admin.form.regions')} error={err('regionIds')} tintControl={false}>
            <Controller
              control={control}
              name="regionIds"
              render={({ field }) => <RegionPicker value={field.value} onChange={field.onChange} />}
            />
          </Field>
        )}
      </form>
    </Modal>
  );
}
