import { NavLink, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { ComponentType, SVGProps } from 'react';
import {
  Avatar,
  Button,
  clsx,
  BrandMark,
  LayoutGridIcon,
  UsersIcon,
  GlobeIcon,
  BuildingIcon,
  StadiumIcon,
  TrophyIcon,
  UserIcon,
  LogoutIcon,
  MessageCircleIcon,
  CalendarIcon,
  CreditCardIcon,
  LayersIcon,
  InboxIcon,
  BellIcon,
  SendIcon,
  ShieldAlertIcon,
} from '@ui';
import { useAuthStore, useAuthUser, useAuthRole, type UserRole } from '@shared/stores/authStore';
import { displayName as toDisplayName } from '@shared/utils/displayName';
import { useUiStore } from '@shared/stores/uiStore';
import { queryClient } from '@shared/lib/queryClient';
import { logout as apiLogout } from '@features/auth/api';
import { ChatNavBadge } from '@features/chat/components/ChatNavBadge';
import { PATHS } from '@app/router/paths';
import styles from './AppSidebar.module.css';

interface NavItem {
  to: string;
  key: string;
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
  superAdminOnly: boolean;
  /** Explicit role whitelist; when set it takes precedence over superAdminOnly. */
  roles?: UserRole[];
  /** Optional trailing indicator (an unread count, a pending badge). */
  Badge?: ComponentType;
  /**
   * Built, but not offered yet. The entry stays here so it is obvious what is
   * parked and why, rather than the feature quietly vanishing from the file.
   */
  hidden?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { to: PATHS.dashboard, key: 'nav.dashboard', Icon: LayoutGridIcon, superAdminOnly: true },
  { to: PATHS.adminManagement, key: 'nav.adminManagement', Icon: UsersIcon, superAdminOnly: true },
  { to: PATHS.regionManagement, key: 'nav.regionManagement', Icon: GlobeIcon, superAdminOnly: true },
  // Region-scoped server-side, and the `admin` role holds view/update-owners and
  // view/create/edit-players — so a regional admin gets these, narrowed to their
  // own regions by the API.
  { to: PATHS.ownerManagement, key: 'nav.ownerManagement', Icon: BuildingIcon, superAdminOnly: false },
  { to: PATHS.playerManagement, key: 'nav.playerManagement', Icon: TrophyIcon, superAdminOnly: false },
  { to: PATHS.facilityManagement, key: 'nav.facilityManagement', Icon: StadiumIcon, superAdminOnly: false },
  { to: PATHS.bookingManagement, key: 'nav.bookingManagement', Icon: CalendarIcon, superAdminOnly: false },
  { to: PATHS.plans, key: 'nav.plans', Icon: LayersIcon, superAdminOnly: true },
  { to: PATHS.clubSubscriptions, key: 'nav.clubSubscriptions', Icon: CreditCardIcon, superAdminOnly: false },
  // super_admin only, matching the API — every community route is guarded by
  // requireSuperAdmin, so offering this to a regional admin only led to a screen
  // of failed 403 queries.
  { to: PATHS.communityManagement, key: 'nav.communityManagement', Icon: MessageCircleIcon, superAdminOnly: true },
  { to: PATHS.feedback, key: 'nav.feedback', Icon: InboxIcon, superAdminOnly: false },
  {
    to: PATHS.chat,
    key: 'nav.chat',
    Icon: SendIcon,
    superAdminOnly: false,
    Badge: ChatNavBadge,
    // HIDDEN — there is no chat backend. The whole slice is built and left in
    // place, but its only endpoint (GET /admin/chat/conversations/stats) 404s,
    // and because ChatNavBadge polls it from the sidebar that 404 fired on
    // EVERY page, once per navigation. Hiding the entry unmounts the badge and
    // stops the noise; the route still resolves for anyone with the URL.
    // Flip this to false when the backend lands.
    hidden: true,
  },
  { to: PATHS.notifications, key: 'nav.notifications', Icon: BellIcon, superAdminOnly: false },
  // AUD2 — the audit trail is a supervision tool aimed at admins, so it is
  // super-admin only in the nav as well as on the route.
  { to: PATHS.audit, key: 'nav.audit', Icon: ShieldAlertIcon, superAdminOnly: true },
  { to: PATHS.profile, key: 'nav.profile', Icon: UserIcon, superAdminOnly: false },
];

export function AppSidebar() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = useAuthUser();
  const role = useAuthRole();
  const isSidebarOpen = useUiStore((s) => s.isSidebarOpen);
  const closeSidebar = useUiStore((s) => s.closeSidebar);

  const handleLogout = async () => {
    try {
      await apiLogout();
    } catch {
      // Clear the local session regardless of the backend result.
    }
    useAuthStore.getState().logout();
    // Drop all cached server data so the next session on this machine starts clean
    // (the 401-interceptor path gets this for free via a full page reload).
    queryClient.clear();
    navigate(PATHS.login, { replace: true });
  };

  const items = NAV_ITEMS.filter(
    (item) =>
      !item.hidden &&
      (item.roles
        ? role !== null && item.roles.includes(role)
        : !item.superAdminOnly || role === 'super_admin'),
  );
  const displayName = toDisplayName(user);

  return (
    <aside className={clsx(styles.sidebar, isSidebarOpen && styles.open)}>
      <div className={styles.brand}>
        <BrandMark size={30} />
        <span className={styles.brandName}>Bplay</span>
      </div>

      <NavLink to={PATHS.profile} className={styles.profile} onClick={closeSidebar}>
        <Avatar src={user?.avatarUrl} name={displayName} size="md" />
        <span className={styles.userInfo}>
          <span className={styles.userName}>{displayName}</span>
          <span className={styles.userEmail}>{user?.email}</span>
        </span>
      </NavLink>

      <nav className={styles.nav}>
        {items.map(({ to, key, Icon, Badge }) => (
          <NavLink
            key={to}
            to={to}
            onClick={closeSidebar}
            className={({ isActive }) => clsx(styles.link, isActive && styles.linkActive)}
          >
            <Icon className={styles.linkIcon} />
            <span>{t(key)}</span>
            {Badge && <Badge />}
          </NavLink>
        ))}
      </nav>

      <div className={styles.spacer} />

      <Button variant="secondary" fullWidth leftIcon={<LogoutIcon />} onClick={handleLogout}>
        {t('common.signOut')}
      </Button>
    </aside>
  );
}
