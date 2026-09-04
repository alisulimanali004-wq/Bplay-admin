import { useRef, useState, type ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Avatar, Button, CameraIcon, TrashIcon } from '@ui';
import { fileToAvatarDataUrl, isAcceptedImage, MAX_AVATAR_BYTES } from '@shared/lib/image';
import styles from './AvatarPicker.module.css';

interface Props {
  value: string | undefined;
  name: string;
  onChange: (value: string | undefined) => void;
}

/** Preview + upload/remove control for the profile photo. Downscales client-side. */
export function AvatarPicker({ value, name, onChange }: Props) {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = ''; // let the same file be re-picked after a remove
    if (!file) return;
    setError(null);

    if (!isAcceptedImage(file)) {
      setError(t('profile.errors.imageType'));
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      setError(t('profile.errors.imageSize'));
      return;
    }

    try {
      setBusy(true);
      onChange(await fileToAvatarDataUrl(file));
    } catch {
      setError(t('profile.errors.imageType'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={styles.picker}>
      <Avatar src={value} name={name} size="xl" />
      <div className={styles.actions}>
        <div className={styles.buttons}>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            leftIcon={<CameraIcon />}
            isLoading={busy}
            onClick={() => inputRef.current?.click()}
            data-testid="avatar-upload"
          >
            {value ? t('profile.edit.changePhoto') : t('profile.edit.upload')}
          </Button>
          {value && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              leftIcon={<TrashIcon />}
              onClick={() => {
                onChange(undefined);
                setError(null);
              }}
              data-testid="avatar-remove"
            >
              {t('profile.edit.remove')}
            </Button>
          )}
        </div>
        {error ? (
          <p className={styles.error} role="alert">
            {error}
          </p>
        ) : (
          <p className={styles.hint}>{t('profile.edit.photoHint')}</p>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className={styles.file}
        onChange={onFile}
        tabIndex={-1}
        aria-hidden
      />
    </div>
  );
}
