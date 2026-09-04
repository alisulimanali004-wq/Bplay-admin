import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { Modal, Field, Input, Button } from '@ui';
import { editOwnerSchema, type EditOwnerValues } from '../api/owner.schema';
import { useUpdateOwner } from '../hooks/useUpdateOwner';
import type { Owner } from '../api/owner.types';
import styles from './ownerForm.module.css';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  owner: Owner;
}

/**
 * Edit an owner's profile details.
 *
 * Only name and address are writable. Email, phone and national ID are shown
 * READ-ONLY rather than hidden: an admin looking for them needs to see that the
 * values exist and are simply not editable here, otherwise the form looks like
 * it lost half the record. The endpoint refuses them outright, so offering the
 * inputs would be a lie.
 */
export function OwnerEditModal({ isOpen, onClose, owner }: Props) {
  const { t } = useTranslation();
  const mutation = useUpdateOwner();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<EditOwnerValues>({
    resolver: zodResolver(editOwnerSchema),
    mode: 'onTouched',
    defaultValues: { name: owner.name, address: owner.address ?? '' },
  });

  // Re-seed whenever the modal reopens or the underlying owner changes, so a
  // cancelled edit does not persist into the next open.
  useEffect(() => {
    if (isOpen) reset({ name: owner.name, address: owner.address ?? '' });
  }, [isOpen, owner.name, owner.address, reset]);

  const err = (field: keyof EditOwnerValues) => {
    const message = errors[field]?.message;
    return message ? t(message) : undefined;
  };

  const submit = handleSubmit((values) => {
    mutation.mutate(
      { id: owner.id, input: { name: values.name, address: values.address } },
      { onSuccess: onClose },
    );
  });

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('owner.edit.title')}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={mutation.isPending}>
            {t('common.cancel')}
          </Button>
          <Button
            type="submit"
            form="owner-edit-form"
            isLoading={mutation.isPending}
            disabled={!isDirty}
            data-testid="owner-edit-save"
          >
            {t('common.save')}
          </Button>
        </>
      }
    >
      <form id="owner-edit-form" className={styles.form} onSubmit={submit} noValidate>
        <Field label={t('owner.create.name')} htmlFor="oe-name" error={err('name')}>
          <Input id="oe-name" data-testid="owner-edit-name" {...register('name')} />
        </Field>

        <Field
          label={t('owner.create.address')}
          htmlFor="oe-address"
          hint={t('common.optional')}
          error={err('address')}
        >
          <Input id="oe-address" data-testid="owner-edit-address" {...register('address')} />
        </Field>

        <div className={styles.grid2}>
          <Field label={t('owner.create.email')} htmlFor="oe-email">
            <Input id="oe-email" value={owner.email} readOnly disabled dir="ltr" />
          </Field>
          <Field label={t('owner.create.phone')} htmlFor="oe-phone">
            <Input id="oe-phone" value={owner.phone} readOnly disabled dir="ltr" />
          </Field>
        </div>

        <Field label={t('owner.create.nationalId')} htmlFor="oe-nid">
          <Input id="oe-nid" value={owner.nationalId ?? '—'} readOnly disabled dir="ltr" />
        </Field>

        <p className={styles.hint}>{t('owner.edit.lockedHint')}</p>
      </form>
    </Modal>
  );
}
