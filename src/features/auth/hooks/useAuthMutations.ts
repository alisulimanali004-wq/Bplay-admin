import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@shared/stores/authStore';
import { useToast } from '@ui';
import { PATHS } from '@app/router/paths';
import { queryClient } from '@shared/lib/queryClient';
import { forgotPassword, login, resetPassword } from '../api';

export function useLoginMutation() {
  const navigate = useNavigate();
  const setSession = useAuthStore((s) => s.login);
  return useMutation({
    mutationFn: login,
    // LoginForm renders the failure inline, right under the fields — a toast on
    // top of it would say the same thing twice.
    meta: { silentError: true },
    onSuccess: (session) => {
      // Drop everything the PREVIOUS principal cached before the new session is
      // installed. /login is reachable from an authenticated tab by client-side
      // navigation, so without this a region-scoped list could be served from
      // cache to the admin who just signed in. Mirrors AppSidebar.handleLogout.
      queryClient.clear();
      setSession(session);
      // Super admins land on the platform overview dashboard; regional admins on
      // their facility review desk.
      navigate(session.role === 'super_admin' ? PATHS.dashboard : PATHS.facilityManagement, {
        replace: true,
      });
    },
  });
}

/**
 * Request a reset link. The backend emails a link to its own hosted reset page,
 * so there is nothing to navigate to here — the form switches to a "check your
 * email" state on success.
 */
export function useForgotPasswordMutation() {
  return useMutation({
    mutationFn: forgotPassword,
    meta: { silentError: true },
  });
}

export function useResetPasswordMutation() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const toast = useToast();
  return useMutation({
    mutationFn: resetPassword,
    onSuccess: () => {
      toast.success(t('auth.resetDone'));
      navigate(PATHS.login);
    },
  });
}
