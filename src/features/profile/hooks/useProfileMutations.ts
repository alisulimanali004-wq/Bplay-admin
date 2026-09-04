import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useToast } from '@ui';
import { useAuthStore } from '@shared/stores/authStore';
import { queryClient } from '@shared/lib/queryClient';
import { PATHS } from '@app/router/paths';
import { changePassword, updateProfile } from '../api';
import type { ChangePasswordInput, UpdateProfileInput } from '../api/profile.types';

/** Update name + avatar, then patch the persisted auth session so the UI reflects it. */
export function useUpdateProfile() {
  const toast = useToast();
  const { t } = useTranslation();
  const applyProfile = useAuthStore((state) => state.updateProfile);

  return useMutation({
    mutationFn: (input: UpdateProfileInput) => updateProfile(input),
    onSuccess: (user) => {
      applyProfile({ name: user.name, avatarUrl: user.avatarUrl });
      toast.success(t('profile.toast.updated'));
    },
  });
}

/**
 * Change the password. The backend revokes every session on success — including
 * this one — so the only correct next step is to send the admin back to the
 * login screen rather than leave them holding a token the server has forgotten.
 */
export function useChangePassword() {
  const toast = useToast();
  const { t } = useTranslation();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: (input: ChangePasswordInput) => changePassword(input),
    // ChangePasswordModal surfaces the failure on the "current password" field.
    meta: { silentError: true },
    onSuccess: () => {
      toast.success(t('profile.toast.passwordChangedSignOut'));
      useAuthStore.getState().logout();
      queryClient.clear();
      navigate(PATHS.login, { replace: true });
    },
  });
}
