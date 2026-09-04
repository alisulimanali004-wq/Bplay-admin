import { useTranslation } from 'react-i18next';
import { ImageLightbox, Avatar } from '@ui';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  src?: string;
  name: string;
}

/** Lightbox that shows the profile photo full-size (or large initials as fallback). */
export function AvatarViewerModal({ isOpen, onClose, src, name }: Props) {
  const { t } = useTranslation();
  return (
    <ImageLightbox
      isOpen={isOpen}
      onClose={onClose}
      src={src}
      alt={name}
      title={t('profile.viewer.title')}
      closeLabel={t('common.close')}
      zoomInLabel={t('common.zoomIn')}
      zoomOutLabel={t('common.zoomOut')}
      resetLabel={t('common.resetZoom')}
      fallback={<Avatar name={name} size="xl" />}
    />
  );
}
