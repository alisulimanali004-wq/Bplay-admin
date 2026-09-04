import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { Modal, Field, Input, PhoneInput, Select, Button, useToast } from '@ui';
import { createPlayerSchema, type CreatePlayerValues } from '../api/player.schema';
import { useCreatePlayer } from '../hooks/useCreatePlayer';
import type { CreatedPlayer } from '../api/player.types';
import styles from './playerForm.module.css';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const BLANK: CreatePlayerValues = {
  fullName: '',
  username: '',
  email: '',
  phone: '',
  gender: 'male',
  dateOfBirth: '',
};

/**
 * Create a player account and reveal the one-time temporary password once, with
 * a copy button. Mirrors the owner create flow: the player must change the
 * password on first sign-in, and it is never shown again.
 */
export function PlayerFormModal({ isOpen, onClose }: Props) {
  const { t } = useTranslation();
  const toast = useToast();
  const mutation = useCreatePlayer();
  const [created, setCreated] = useState<CreatedPlayer | null>(null);
  const [copied, setCopied] = useState(false);

  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreatePlayerValues>({
    resolver: zodResolver(createPlayerSchema),
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
      fullName: data.fullName,
      username: data.username,
      email: data.email,
      phone: data.phone,
      gender: data.gender,
      dateOfBirth: data.dateOfBirth,
    });
    setCreated(result);
  });

  const copy = async () => {
    if (!created) return;
    try {
      await navigator.clipboard.writeText(created.tempPassword);
      setCopied(true);
      toast.success(t('player.create.copiedToast'));
    } catch {
      /* clipboard unavailable — the value is still visible to copy manually */
    }
  };

  const err = (key: keyof CreatePlayerValues) => {
    const message = errors[key]?.message;
    return message ? t(message) : undefined;
  };

  const genderOptions = [
    { value: 'male', label: t('player.gender.male') },
    { value: 'female', label: t('player.gender.female') },
    { value: 'other', label: t('player.gender.other') },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('player.create.title')}
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
            <Button
              type="submit"
              form="player-form"
              isLoading={mutation.isPending}
              data-testid="player-create-submit"
            >
              {t('player.create.submit')}
            </Button>
          </>
        )
      }
    >
      {created ? (
        <div className={styles.reveal} data-testid="player-create-reveal">
          <p className={styles.revealHead}>
            {t('player.create.done', { name: created.username })}
          </p>
          <div className={styles.revealRow}>
            <div className={styles.revealField}>
              <Input
                readOnly
                value={created.tempPassword}
                dir="ltr"
                aria-label={t('player.create.tempPassword')}
                data-testid="player-temp-password"
              />
            </div>
            <Button variant="secondary" onClick={copy} data-testid="player-temp-copy">
              {copied ? t('player.create.copied') : t('player.create.copy')}
            </Button>
          </div>
          <p className={styles.revealWarn}>{t('player.create.warn')}</p>
        </div>
      ) : (
        <form id="player-form" className={styles.form} onSubmit={submit} noValidate>
          <div className={styles.grid2}>
            <Field label={t('player.create.name')} htmlFor="p-name" error={err('fullName')}>
              <Input id="p-name" data-testid="player-name" {...register('fullName')} />
            </Field>
            <Field label={t('player.create.username')} htmlFor="p-username" error={err('username')}>
              <Input
                id="p-username"
                dir="ltr"
                data-testid="player-username"
                {...register('username')}
              />
            </Field>
          </div>

          <div className={styles.grid2}>
            <Field label={t('player.create.email')} htmlFor="p-email" error={err('email')}>
              <Input
                id="p-email"
                type="email"
                dir="ltr"
                data-testid="player-email"
                {...register('email')}
              />
            </Field>
            <Field label={t('player.create.phone')} htmlFor="p-phone" error={err('phone')}>
              <Controller
                control={control}
                name="phone"
                render={({ field }) => (
                  <PhoneInput
                    id="p-phone"
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    invalid={Boolean(errors.phone)}
                  />
                )}
              />
            </Field>
          </div>

          <div className={styles.grid2}>
            <Field label={t('player.create.gender')} htmlFor="p-gender" error={err('gender')}>
              <Controller
                control={control}
                name="gender"
                render={({ field }) => (
                  <Select
                    id="p-gender"
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    options={genderOptions}
                    aria-label={t('player.create.gender')}
                  />
                )}
              />
            </Field>
            <Field
              label={t('player.create.dateOfBirth')}
              htmlFor="p-dob"
              hint={t('common.optional')}
              error={err('dateOfBirth')}
            >
              <Input
                id="p-dob"
                type="date"
                dir="ltr"
                data-testid="player-dob"
                {...register('dateOfBirth')}
              />
            </Field>
          </div>

          <p className={styles.hint}>{t('player.create.hint')}</p>
        </form>
      )}
    </Modal>
  );
}
