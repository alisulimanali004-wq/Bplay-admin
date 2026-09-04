import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Spinner } from '@ui';
import { useAuthRole } from '@shared/stores/authStore';
import { RequireAnyRole, RequireAuth, RequireRole } from './guards';
import { PATHS } from './paths';

// Code-split every route.
const LandingPage = lazy(() => import('@features/landing/pages/LandingPage'));
const LoginPage = lazy(() => import('@features/auth/pages/LoginPage'));
const ForgotPasswordPage = lazy(() => import('@features/auth/pages/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('@features/auth/pages/ResetPasswordPage'));
const ProfilePage = lazy(() => import('@features/profile/pages/ProfilePage'));
const AdminManagementPage = lazy(() => import('@features/admin-management/pages/AdminManagementPage'));
const AdminDetailPage = lazy(() => import('@features/admin-management/pages/AdminDetailPage'));
const RegionManagementPage = lazy(() => import('@features/region-management/pages/RegionManagementPage'));
const RegionDetailPage = lazy(() => import('@features/region-management/pages/RegionDetailPage'));
const OwnerManagementPage = lazy(() => import('@features/owner-management/pages/OwnerManagementPage'));
const OwnerProfilePage = lazy(() => import('@features/owner-management/pages/OwnerProfilePage'));
const PlayerManagementPage = lazy(
  () => import('@features/player-management/pages/PlayerManagementPage'),
);
const PlayerProfilePage = lazy(() => import('@features/player-management/pages/PlayerProfilePage'));
const FacilityManagementPage = lazy(
  () => import('@features/facility-management/pages/FacilityManagementPage'),
);
const AddFacilityWizardPage = lazy(
  () => import('@features/facility-management/pages/AddFacilityWizardPage'),
);
const FacilityProfilePage = lazy(
  () => import('@features/facility-management/pages/FacilityProfilePage'),
);
const CommunityManagementPage = lazy(
  () => import('@features/community-management/pages/CommunityManagementPage'),
);
const PostDetailPage = lazy(() => import('@features/community-management/pages/PostDetailPage'));
const BookingManagementPage = lazy(
  () => import('@features/booking-management/pages/BookingManagementPage'),
);
const BookingDetailPage = lazy(
  () => import('@features/booking-management/pages/BookingDetailPage'),
);
const ClubSubscriptionsPage = lazy(
  () => import('@features/club-subscriptions/pages/ClubSubscriptionsPage'),
);
const MembershipDetailPage = lazy(
  () => import('@features/club-subscriptions/pages/MembershipDetailPage'),
);
const PlansPage = lazy(() => import('@features/plans/pages/PlansPage'));
const PlanDetailPage = lazy(() => import('@features/plans/pages/PlanDetailPage'));
const FeedbackPage = lazy(() => import('@features/feedback/pages/FeedbackPage'));
const FeedbackDetailPage = lazy(() => import('@features/feedback/pages/FeedbackDetailPage'));
const NotificationsPage = lazy(() => import('@features/notifications/pages/NotificationsPage'));
const ChatPage = lazy(() => import('@features/chat/pages/ChatPage'));
const AuditPage = lazy(() => import('@features/audit/pages/AuditPage'));
const NotFound = lazy(() => import('@/pages/NotFound'));
const DashboardLayout = lazy(() => import('@app/layouts/DashboardLayout'));
const DashboardPage = lazy(() => import('@features/dashboard/pages/DashboardPage'));

function DashboardIndexRedirect() {
  const role = useAuthRole();
  if (role === 'super_admin') return <Navigate replace to={PATHS.dashboard} />;
  if (role === 'admin') return <Navigate replace to={PATHS.facilityManagement} />;
  return <Navigate replace to={PATHS.profile} />;
}

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Suspense
        fallback={
          <div className="route-fallback">
            <Spinner size="lg" />
          </div>
        }
      >
        <Routes>
          {/* Public */}
          <Route path={PATHS.home} element={<LandingPage />} />

          {/* Auth */}
          <Route path={PATHS.login} element={<LoginPage />} />
          <Route path={PATHS.forgotPassword} element={<ForgotPasswordPage />} />
          <Route path={PATHS.resetPassword} element={<ResetPasswordPage />} />

          {/* Dashboard */}
          <Route
            path={PATHS.app}
            element={
              <RequireAuth>
                <DashboardLayout />
              </RequireAuth>
            }
          >
            <Route index element={<DashboardIndexRedirect />} />
            <Route
              path="dashboard"
              element={
                <RequireRole role="super_admin">
                  <DashboardPage />
                </RequireRole>
              }
            />
            <Route path="profile" element={<ProfilePage />} />
            <Route
              path="admin-management"
              element={
                <RequireRole role="super_admin">
                  <AdminManagementPage />
                </RequireRole>
              }
            />
            <Route
              path="admin-management/:adminId"
              element={
                <RequireRole role="super_admin">
                  <AdminDetailPage />
                </RequireRole>
              }
            />
            <Route
              path="region-management"
              element={
                <RequireRole role="super_admin">
                  <RegionManagementPage />
                </RequireRole>
              }
            />
            <Route
              path="region-management/:regionId"
              element={
                <RequireRole role="super_admin">
                  <RegionDetailPage />
                </RequireRole>
              }
            />
            {/*
              Owners and players are region-scoped server-side (regionScopeFilter
              / canAdminSeeRow), and the `admin` role carries view-owners,
              update-owners, view-players, create-players and edit-players. The
              super_admin-only gate here contradicted all of that: a regional
              admin was bounced to /profile from pages the API would have served
              them, correctly narrowed to their own regions.
            */}
            <Route
              path="owner-management"
              element={
                <RequireAnyRole roles={['super_admin', 'admin']}>
                  <OwnerManagementPage />
                </RequireAnyRole>
              }
            />
            <Route
              path="owner-management/:ownerId"
              element={
                <RequireAnyRole roles={['super_admin', 'admin']}>
                  <OwnerProfilePage />
                </RequireAnyRole>
              }
            />
            <Route
              path="player-management"
              element={
                <RequireAnyRole roles={['super_admin', 'admin']}>
                  <PlayerManagementPage />
                </RequireAnyRole>
              }
            />
            <Route
              path="player-management/:playerId"
              element={
                <RequireAnyRole roles={['super_admin', 'admin']}>
                  <PlayerProfilePage />
                </RequireAnyRole>
              }
            />
            <Route
              path="facility-management"
              element={
                <RequireAnyRole roles={['super_admin', 'admin']}>
                  <FacilityManagementPage />
                </RequireAnyRole>
              }
            />
            <Route
              path="facility-management/new"
              element={
                <RequireAnyRole roles={['super_admin', 'admin']}>
                  <AddFacilityWizardPage />
                </RequireAnyRole>
              }
            />
            <Route
              path="facility-management/:facilityId/edit"
              element={
                <RequireAnyRole roles={['super_admin', 'admin']}>
                  <AddFacilityWizardPage />
                </RequireAnyRole>
              }
            />
            <Route
              path="facility-management/:facilityId"
              element={
                <RequireAnyRole roles={['super_admin', 'admin']}>
                  <FacilityProfilePage />
                </RequireAnyRole>
              }
            />
            {/*
              super_admin only, matching the API: every /admin/community-management
              route is guarded by requireSuperAdmin. Letting `admin` in here
              rendered the page and then failed every query with 403, so the
              whole screen read "Something went wrong" for a regional admin.

              The API is deliberate rather than an oversight — the feed is
              platform-wide, and a player's region is geo-resolved from
              coordinates and usually NULL, so scoping it would hide most posts
              instead of narrowing them. Opening this to regional admins means
              backfilling player regions first.
            */}
            <Route
              path="community-management"
              element={
                <RequireRole role="super_admin">
                  <CommunityManagementPage />
                </RequireRole>
              }
            />
            <Route
              path="community-management/:postId"
              element={
                <RequireRole role="super_admin">
                  <PostDetailPage />
                </RequireRole>
              }
            />
            <Route
              path="booking-management"
              element={
                <RequireAnyRole roles={['super_admin', 'admin']}>
                  <BookingManagementPage />
                </RequireAnyRole>
              }
            />
            <Route
              path="booking-management/:bookingId"
              element={
                <RequireAnyRole roles={['super_admin', 'admin']}>
                  <BookingDetailPage />
                </RequireAnyRole>
              }
            />
            <Route
              path="club-subscriptions"
              element={
                <RequireAnyRole roles={['super_admin', 'admin']}>
                  <ClubSubscriptionsPage />
                </RequireAnyRole>
              }
            />
            <Route
              path="club-subscriptions/:membershipId"
              element={
                <RequireAnyRole roles={['super_admin', 'admin']}>
                  <MembershipDetailPage />
                </RequireAnyRole>
              }
            />
            {/* PN3 — the platform plan catalog is super-admin only, never region-scoped. */}
            <Route
              path="plans"
              element={
                <RequireRole role="super_admin">
                  <PlansPage />
                </RequireRole>
              }
            />
            <Route
              path="plans/:planId"
              element={
                <RequireRole role="super_admin">
                  <PlanDetailPage />
                </RequireRole>
              }
            />
            {/* FEED — a regional admin answers their own region's feedback, a
                super-admin answers everything (FR-ADM-FEED-005). */}
            <Route
              path="feedback"
              element={
                <RequireAnyRole roles={['super_admin', 'admin']}>
                  <FeedbackPage />
                </RequireAnyRole>
              }
            />
            <Route
              path="feedback/:feedbackId"
              element={
                <RequireAnyRole roles={['super_admin', 'admin']}>
                  <FeedbackDetailPage />
                </RequireAnyRole>
              }
            />
            {/* SET ج — the notification centre is available to the regional admin
                AND the super-admin (FR-ADM-SET-006); the regional admin's inbox is
                narrowed by region at emit time (FR-ADM-SET-008). */}
            <Route
              path="notifications"
              element={
                <RequireAnyRole roles={['super_admin', 'admin']}>
                  <NotificationsPage />
                </RequireAnyRole>
              }
            />
            {/* CHAT — administration ↔ facility owner (CH1). A regional admin
                gets their own region's threads, a super-admin gets them all
                (FR-ADM-CHAT-004). Both paths render the SAME page: the id only
                decides which pane is visible on a narrow viewport, so the
                browser Back button still means "back to the list" on a phone. */}
            <Route
              path="chat"
              element={
                <RequireAnyRole roles={['super_admin', 'admin']}>
                  <ChatPage />
                </RequireAnyRole>
              }
            />
            <Route
              path="chat/:conversationId"
              element={
                <RequireAnyRole roles={['super_admin', 'admin']}>
                  <ChatPage />
                </RequireAnyRole>
              }
            />
            {/* AUDIT — SUPER-ADMIN ONLY (AUD2). The log names other admins'
                actions and exists to supervise them, so a regional admin must
                never reach it, by URL or otherwise. */}
            <Route
              path="audit"
              element={
                <RequireRole role="super_admin">
                  <AuditPage />
                </RequireRole>
              }
            />
          </Route>

          <Route path="/app/admins" element={<Navigate to={PATHS.adminManagement} replace />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
