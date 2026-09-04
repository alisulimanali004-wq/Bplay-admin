import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { Modal, Field, Input, PhoneInput, Button, useToast } from '@ui';
import { createOwnerSchema, type CreateOwnerValues } from '../api/owner.schema';
import { useCreateOwner } from '../hooks/useCreateOwner';
import type { CreatedOwner } from '../api/owner.types';
import styles from './ownerForm.module.css';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const BLANK: CreateOwnerValues = {
  name: '',
  email: '',
  phone: '',
  nationalId: '',
  address: '',
};

/**
 * Create an owner (data taken from the app signup) and reveal the one-time
 * temporary password once, with a copy button (FR-ADM-OWNER-005). The owner is
 * forced to change it on first sign-in; there is no admin password reset.
 */
export function OwnerFormModal({ isOpen, onClose }: Props) {
  const { t } = useTranslation();
  const toast = useToast();
  const mutation = useCreateOwner();
  const [created, setCreated] = useState<CreatedOwner | null>(null);
  const [copied, setCopied] = useState(false);

  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateOwnerValues>({
    resolver: zodResolver(createOwnerSchema),
    mode: 'onTouched',
    defaultValues: BLANK,
  });

  useEffect(() => {
    if (isOpen) {
      reset(BLANK);
      setCreated(null);
      setCopied(false);
    }
  }, [isOpen, reset]);

  const submit = handleSubmit(async (data) => {
    const result = await mutation.mutateAsync({
      name: data.name,
      email: data.email,
      phone: data.phone,
      nationalId: data.nationalId,
      address: data.address,
    });
    setCreated(result);
  });

  const copy = async () => {
    if (!created) return;
    try {
      await navigator.clipboard.writeText(created.tempPassword);
      setCopied(true);
      toast.success(t('owner.create.copiedToast'));
    } catch {
      /* clipboard unavailable — the value is still visible to copy manually */
    }
  };

  const err = (key: keyof CreateOwnerValues) => {
    const message = errors[key]?.message;
    return message ? t(message) : undefined;
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('owner.create.title')}
      size="md"
      closeLabel={t('common.close')}
      footer={
        created ? (
          <Button onClick={onClose}>{t('common.close')}</Button>
        ) : (
          <>
            <Button variant="secondary" onClick={onClose}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" form="owner-form" isLoading={mutation.isPending} data-testid="owner-create-submit">
              {t('owner.create.submit')}
            </Button>
          </>
        )
      }
    >
      {created ? (
        <div className={styles.reveal} data-testid="owner-create-reveal">
          <p className={styles.revealHead}>{t('owner.create.done', { name: created.owner.name })}</p>
          <div className={styles.revealRow}>
            <div className={styles.revealField}>
              <Input
                readOnly
                value={created.tempPassword}
                dir="ltr"
                aria-label={t('owner.create.tempPassword')}
                data-testid="owner-temp-password"
              />
            </div>
            <Button variant="secondary" onClick={copy} data-testid="owner-temp-copy">
              {copied ? t('owner.create.copied') : t('owner.create.copy')}
            </Button>
          </div>
          <p className={styles.revealWarn}>{t('owner.create.warn')}</p>
        </div>
      ) : (
        <form id="owner-form" className={styles.form} onSubmit={submit} noValidate>
          <div className={styles.grid2}>
            <Field label={t('owner.create.name')} htmlFor="o-name" error={err('name')}>
              <Input id="o-name" data-testid="owner-name" {...register('name')} />
            </Field>
            <Field label={t('owner.create.email')} htmlFor="o-email" error={err('email')}>
              <Input id="o-email" type="email" dir="ltr" data-testid="owner-email" {...register('email')} />
            </Field>
          </div>

          <div className={styles.grid2}>
            <Field label={t('owner.create.phone')} htmlFor="o-phone" error={err('phone')}>
              <Controller
                control={control}
                name="phone"
                render={({ field }) => (
                  <PhoneInput
                    id="o-phone"
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    invalid={Boolean(errors.phone)}
                  />
                )}
              />
            </Field>
            <Field label={t('owner.create.nationalId')} htmlFor="o-nid" error={err('nationalId')}>
              <Controller
                control={control}
                name="nationalId"
                render={({ field }) => (
                  <Input
                    id="o-nid"
                    inputMode="numeric"
                    maxLength={11}
                    dir="ltr"
                    placeholder="XXXXXXXXXXX"
                    value={field.value ?? ''}
                    onBlur={field.onBlur}
                    onChange={(event) => field.onChange(event.target.value.replace(/\D/g, '').slice(0, 11))}
                  />
                )}
              />
            </Field>
          </div>

          <Field
            label={t('owner.create.address')}
            htmlFor="o-address"
            hint={t('common.optional')}
            error={err('address')}
          >
            <Input id="o-address" data-testid="owner-address" {...register('address')} />
          </Field>

          <p className={styles.hint}>{t('owner.create.hint')}</p>
        </form>
      )}
    </Modal>
  );
}
