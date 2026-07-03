import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import AuthGuard from "./components/AuthGuard";
import AdminLayout from "./layouts/AdminLayout";

// Pages
import Login from "./pages/Login";
import AdminDashboard from "./pages/AdminDashboard";
import UsersPage from "./pages/UsersPage";
import EconomyPage from "./pages/EconomyPage";
import BoutiquePage from "./pages/BoutiquePage";
import ArenaPage from "./pages/ArenaPage";
import SocialPage from "./pages/SocialPage";
import PromotionsPage from "./pages/PromotionsPage";
import SecurityPage from "./pages/SecurityPage";
import SupportPage from "./pages/SupportPage";
import NotificationPage from "./pages/NotificationPage";
import LogsPage from "./pages/LogsPage";
import SettingsPage from "./pages/SettingsPage";
import AlliancesPage from "./pages/AlliancesPage";
import WorkspaceSyncPage from "./pages/WorkspaceSyncPage";
import BirthdayPage from "./pages/BirthdayPage";
import UserDetailsPage from "./pages/UserDetailsPage";
import ApiMonitoringPage from "./pages/ApiMonitoringPage";

import DataBrowser from "./pages/DataBrowser";

const App = () => {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public Route */}
          <Route path="/login" element={<Login />} />

          {/* Protected Routes (Nexus Core) */}
          <Route element={<AuthGuard><AdminLayout /></AuthGuard>}>
            <Route path="/" element={<AdminDashboard />} />
            <Route path="/browser" element={<DataBrowser />} />
            <Route path="/users" element={<UsersPage />} />
            <Route path="/users/:id" element={<UserDetailsPage />} />
            <Route path="/birthdays" element={<BirthdayPage />} />
            <Route path="/economy" element={<EconomyPage />} />
            <Route path="/boutique" element={<BoutiquePage />} />
            <Route path="/arena" element={<ArenaPage />} />
            <Route path="/social" element={<SocialPage />} />
            <Route path="/promotions" element={<PromotionsPage />} />
            <Route path="/security" element={<SecurityPage />} />
            <Route path="/support" element={<SupportPage />} />
            <Route path="/notifications" element={<NotificationPage />} />
            <Route path="/analytics" element={<LogsPage />} />
            <Route path="/monitoring/api" element={<ApiMonitoringPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/badges" element={<PromotionsPage />} />
            <Route path="/alliances" element={<AlliancesPage />} />
            <Route path="/sync" element={<WorkspaceSyncPage />} />
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
};

export default App;
