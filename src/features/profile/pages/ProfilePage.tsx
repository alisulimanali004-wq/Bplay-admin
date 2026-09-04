import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  PageContainer,
  PageHeader,
  Card,
  Avatar,
  Badge,
  Button,
  IconButton,
  CameraIcon,
  EditIcon,
  LockIcon,
} from '@ui';
import { useAuthUser, useAuthRole } from '@shared/stores/authStore';
import { displayName as toDisplayName } from '@shared/utils/displayName';
import { EditProfileModal } from '../components/EditProfileModal';
import { ChangePasswordModal } from '../components/ChangePasswordModal';
import { AvatarViewerModal } from '../components/AvatarViewerModal';
import styles from './ProfilePage.module.css';

export default function ProfilePage() {
  const { t } = useTranslation();
  const user = useAuthUser();
  const role = useAuthRole();
  const displayName = toDisplayName(user);
  const email = user?.email ?? '';
  const avatarUrl = user?.avatarUrl;
  const roleKey = role ?? 'admin';

  const [editOpen, setEditOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);

  return (
    <PageContainer>
      <PageHeader title={t('profile.title')} subtitle={t('profile.subtitle')} />

      <Card padding="lg">
        <div className={styles.head}>
          <div className={styles.avatarWrap}>
            <button
              type="button"
              className={styles.avatarBtn}
              onClick={() => setViewerOpen(true)}
              aria-label={t('profile.viewPhoto')}
              data-testid="profile-view-photo"
            >
              <Avatar src={avatarUrl} name={displayName} size="xl" />
            </button>
            <IconButton
              className={styles.camera}
              variant="primary"
              size="sm"
              label={t('profile.editPhoto')}
              icon={<CameraIcon />}
              onClick={() => setEditOpen(true)}
              data-testid="profile-edit-photo"
            />
          </div>

          <div className={styles.identity}>
            <h2 className={styles.name}>{displayName}</h2>
            <p className={styles.email}>{email}</p>
            <div className={styles.badges}>
              <Badge variant="info">{t(`profile.roles.${roleKey}`, roleKey)}</Badge>
            </div>
          </div>

          <div className={styles.actions}>
            <Button
              variant="secondary"
              leftIcon={<EditIcon />}
              onClick={() => setEditOpen(true)}
              data-testid="profile-edit"
            >
              {t('profile.editProfile')}
            </Button>
            <Button
              variant="ghost"
              leftIcon={<LockIcon />}
              onClick={() => setPasswordOpen(true)}
              data-testid="profile-change-password"
            >
              {t('profile.changePassword')}
            </Button>
          </div>
        </div>
      </Card>

      <EditProfileModal
        isOpen={editOpen}
        onClose={() => setEditOpen(false)}
        name={displayName}
        email={email}
        avatarUrl={avatarUrl}
      />
      <ChangePasswordModal isOpen={passwordOpen} onClose={() => setPasswordOpen(false)} />
      <AvatarViewerModal
        isOpen={viewerOpen}
        onClose={() => setViewerOpen(false)}
        src={avatarUrl}
        name={displayName}
      />
    </PageContainer>
  );
}
