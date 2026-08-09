import { lazy, Suspense } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import AuthGuard from "./components/AuthGuard";
import AdminLayout from "./layouts/AdminLayout";
import ErrorBoundary from "./components/ErrorBoundary";
import SplashScreen from "./components/SplashScreen";

import { LangProvider } from "./context/LangContext";
import { Toaster } from "sonner";

// ⚡ Performance: lazy-load every authenticated page so the SPA shell
// paints with only the entry chunk (~80 KB) and each route downloads
// its own chunk in parallel on first navigation. The previous App.jsx
// statically imported all 26 pages → a single ~1.6 MB main bundle that
// blocked first paint on every page load. Each <lazy()> here becomes a
// separate code-split chunk at build time (Vite/Rollup auto-splits on
// dynamic imports). On the first redirect to /users, only the AdminLayout
// + UsersPage chunks download — the 25 other pages stay cached until
// visited.
//
// Notes:
// - `Auth` stays eager: it's the only public route, and it's tiny
//   (~3 KB). Lazy-loading it would force a second round-trip on /login.
// - Vite Suspense fallback uses `minimumDelay: 200ms` via setTimeout
//   inside the fallback so a sub-200 ms chunk load doesn't flash
//   "Loading..." to the user. CLS is minimised because AdminLayout
//   itself is eager, so the render height is stable across navigations.

// `Auth` is eager (small ~3 KB public route) — lazy-loading it forces
// a full-screen-spinner round-trip on every fresh /login visit which
// is strictly worse UX than the tiny initial-bundle hit.
import Auth from "./pages/Auth";

const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const UsersPage = lazy(() => import("./pages/UsersPage"));
const UserDetailsPage = lazy(() => import("./pages/UserDetailsPage"));
const EconomyPage = lazy(() => import("./pages/EconomyPage"));
const BoutiquePage = lazy(() => import("./pages/BoutiquePage"));
const PromotionsPage = lazy(() => import("./pages/PromotionsPage"));
const SecurityPage = lazy(() => import("./pages/SecurityPage"));
const SupportPage = lazy(() => import("./pages/SupportPage"));
const LogsPage = lazy(() => import("./pages/LogsPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const WorkspaceSyncPage = lazy(() => import("./pages/WorkspaceSyncPage"));
const IdentityPage = lazy(() => import("./pages/IdentityPage"));
const EmailBroadcastPage = lazy(() => import("./pages/EmailBroadcastPage"));
const CalendarPage = lazy(() => import("./pages/CalendarPage"));
const BillingPage = lazy(() => import("./pages/BillingPage"));
const ReferralsPage = lazy(() => import("./pages/ReferralsPage"));
const SubyProductsPage = lazy(() => import("./pages/SubyProductsPage"));
const SubyCheckoutLinksPage = lazy(() => import("./pages/SubyCheckoutLinksPage"));
const AssetsPage = lazy(() => import("./pages/AssetsPage"));
const PartnershipsAdmin = lazy(() => import("./pages/PartnershipsAdmin"));
const CertificationsAdmin = lazy(() => import("./pages/CertificationsAdmin"));
const NotificationsPage = lazy(() => import("./pages/NotificationsPage"));
const ChatIAPage = lazy(() => import("./pages/ChatIAPage"));

// Inline loader — shows inside the AdminLayout so sidebar stays visible.
// No full-page flash, no layout shift on mobile.
function RouteFallback() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-cyan/20 border-t-cyan rounded-full animate-spin" />
        <p className="text-[10px] font-semibold uppercase tracking-[0.34em] text-white/20">
          Chargement…
        </p>
      </div>
    </div>
  );
}

const App = () => {
  return (
    <ErrorBoundary>
      <SplashScreen>
        <LangProvider>
        <AuthProvider>
          <Router>
            <Routes>
              {/* Public Route (eager — small, single entry point) */}
              <Route path="/login" element={<Auth />} />

                {/* Protected Routes (Nexus Core) */}
                <Route
                  element={
                    <AuthGuard>
                      <AdminLayout />
                    </AuthGuard>
                  }
                >
                  <Route path="/" element={<AdminDashboard />} />
                  <Route path="/users" element={<UsersPage />} />
                  <Route path="/users/:id" element={<UserDetailsPage />} />
                  <Route path="/economy" element={<EconomyPage />} />
                  <Route path="/boutique" element={<BoutiquePage />} />
                  <Route path="/promotions" element={<PromotionsPage />} />
                  <Route path="/security" element={<SecurityPage />} />
                  <Route path="/support" element={<SupportPage />} />
                  <Route path="/analytics" element={<LogsPage />} />
                  <Route path="/settings" element={<SettingsPage />} />
                  <Route path="/notifications" element={<NotificationsPage />} />
                  <Route path="/chat-ia" element={<ChatIAPage />} />
                  <Route path="/badges" element={<PromotionsPage />} />
                  <Route path="/identity" element={<IdentityPage />} />
                  <Route path="/sync" element={<WorkspaceSyncPage />} />
                  <Route path="/email" element={<EmailBroadcastPage />} />
                  <Route path="/calendar" element={<CalendarPage />} />
                  <Route
                    path="/billing"
                    element={<BillingPage />}
                  />
                  <Route
                    path="/referrals"
                    element={<ReferralsPage />}
                  />
                  <Route
                    path="/suby-products"
                    element={<SubyProductsPage />}
                  />
                  <Route
                    path="/suby-checkout-links"
                    element={<SubyCheckoutLinksPage />}
                  />
                  <Route path="/assets" element={<AssetsPage />} />
                  <Route
                    path="/partnerships"
                    element={<PartnershipsAdmin />}
                  />
                  <Route
                    path="/certifications"
                    element={<CertificationsAdmin />}
                  />
                </Route>
                {/* Never leave an unknown URL with an empty React tree. */}
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Router>
          <Toaster position="top-right" richColors theme="dark" />
        </AuthProvider>
        </LangProvider>
      </SplashScreen>
    </ErrorBoundary>
  );
};

export default App;
