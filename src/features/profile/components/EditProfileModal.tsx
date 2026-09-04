import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { Modal, Field, Input, Button } from '@ui';
import { AvatarPicker } from './AvatarPicker';
import { editProfileSchema, type EditProfileValues } from '../api/profile.schema';
import { useUpdateProfile } from '../hooks/useProfileMutations';
import styles from './profileForm.module.css';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  name: string;
  email: string;
  avatarUrl?: string;
}

export function EditProfileModal({ isOpen, onClose, name, email, avatarUrl }: Props) {
  const { t } = useTranslation();
  const mutation = useUpdateProfile();
  const [avatar, setAvatar] = useState<string | undefined>(avatarUrl);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<EditProfileValues>({
    resolver: zodResolver(editProfileSchema),
    defaultValues: { name },
  });

  // Re-seed the form each time the modal opens so it mirrors the live profile.
  useEffect(() => {
    if (isOpen) {
      reset({ name });
      setAvatar(avatarUrl);
    }
  }, [isOpen, name, avatarUrl, reset]);

  const submit = handleSubmit(async (values) => {
    await mutation.mutateAsync({ name: values.name.trim(), avatarUrl: avatar });
    onClose();
  });

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('profile.edit.title')}
      size="sm"
      closeLabel={t('common.close')}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" form="edit-profile" isLoading={mutation.isPending} data-testid="profile-save">
            {t('profile.edit.save')}
          </Button>
        </>
      }
    >
      <form id="edit-profile" className={styles.form} onSubmit={submit} noValidate>
        <Field label={t('profile.edit.photoLabel')}>
          <AvatarPicker value={avatar} name={name || email} onChange={setAvatar} />
        </Field>
        <Field
          label={t('profile.edit.nameLabel')}
          htmlFor="p-name"
          required
          error={errors.name ? t(errors.name.message ?? '') : undefined}
        >
          <Input id="p-name" autoComplete="name" placeholder={t('profile.edit.namePlaceholder')} {...register('name')} />
        </Field>
        <Field label={t('profile.email')} htmlFor="p-email">
          <Input id="p-email" defaultValue={email} disabled />
        </Field>
      </form>
    </Modal>
  );
}
