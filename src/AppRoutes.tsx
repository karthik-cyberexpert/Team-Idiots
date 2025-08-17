import { Routes, Route } from "react-router-dom";
import { useSettings } from "./contexts/SettingsProvider";
import { useAuth } from "./contexts/AuthProvider";
import MaintenancePage from "./pages/MaintenancePage";
import { Loader2 } from "lucide-react";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import ProtectedRoute from "./components/ProtectedRoute";
import { DashboardLayout } from "./components/dashboard/DashboardLayout";
import UserManagement from "./pages/admin/UserManagement";
import AdminRoute from "./components/AdminRoute";
import NotesPage from "./pages/NotesPage";
import ChatPage from "./pages/ChatPage";
import TasksPage from "./pages/TasksPage";
import SubmissionsPage from "./pages/SubmissionsPage";
import TaskManagement from "./pages/admin/TaskManagement";
import DataManagementPage from "./pages/admin/DataManagementPage";
import EditProfilePage from "./pages/EditProfilePage";
import SettingsPage from "./pages/SettingsPage";
import LeaderboardPage from "./pages/LeaderboardPage";
import XpHistoryPage from "./pages/XpHistoryPage";
import TyperPage from "./pages/TyperPage";
import TyperSetManagementPage from "./pages/admin/typer/TyperSetManagementPage";
import GameLeaderboardPage from "./pages/GameLeaderboardPage";
import ErrorBoundary from "./components/ErrorBoundary";
import AuctionManagementPage from "./pages/admin/AuctionManagementPage";
import AuctionPage from "./pages/AuctionPage";
import PowerUpsPage from "./pages/PowerUpsPage";
import GoldMinePage from "./pages/GoldMinePage";
import BuddiesPage from "./pages/BuddiesPage";
import BuddiesManagementPage from "./pages/admin/BuddiesManagementPage";
import QuizManagementPage from "./pages/admin/quiz/QuizManagementPage";
import QuizPage from "./pages/QuizPage";
import StorePage from "./pages/StorePage";
import StoreManagementPage from "./pages/admin/StoreManagementPage";
import GiftingPage from "./pages/GiftingPage";
import RequestCenterPage from "./pages/RequestCenterPage"; // Import new page
import FunSpacePage from "./pages/FunSpacePage";
import { FunSpaceLayout } from "./layouts/FunSpaceLayout";
import TwoDBuilderPage from "./pages/fun-space/TwoDBuilderPage.tsx";
import GamesPage from "./pages/fun-space/GamesPage";
import TicTacToePage from "./pages/fun-space/TicTacToePage";
import LudoPage from "./pages/fun-space/LudoPage"; // Import LudoPage

export const AppRoutes = () => {
  const { maintenanceMode, loading: settingsLoading } = useSettings();
  const { profile, loading: authLoading } = useAuth();

  if (settingsLoading || authLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (maintenanceMode && profile?.role !== 'admin') {
    return (
      <Routes>
        <Route path="*" element={<MaintenancePage />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/login" element={<LoginPage />} />
      
      <Route element={<ProtectedRoute />}>
        <Route element={<DashboardLayout />}>
          <Route path="/dashboard" element={<ErrorBoundary><DashboardPage /></ErrorBoundary>} />
          <Route path="/dashboard/notes" element={<ErrorBoundary><NotesPage /></ErrorBoundary>} />
          <Route path="/dashboard/chat" element={<ErrorBoundary><ChatPage /></ErrorBoundary>} />
          <Route path="/dashboard/tasks" element={<ErrorBoundary><TasksPage /></ErrorBoundary>} />
          <Route path="/dashboard/submissions" element={<ErrorBoundary><SubmissionsPage /></ErrorBoundary>} />
          <Route path="/dashboard/leaderboard" element={<ErrorBoundary><LeaderboardPage /></ErrorBoundary>} />
          <Route path="/dashboard/profile" element={<ErrorBoundary><EditProfilePage /></ErrorBoundary>} />
          <Route path="/dashboard/settings" element={<ErrorBoundary><SettingsPage /></ErrorBoundary>} />
          <Route path="/dashboard/xp-history" element={<ErrorBoundary><XpHistoryPage /></ErrorBoundary>} />
          <Route path="/dashboard/typer" element={<ErrorBoundary><TyperPage /></ErrorBoundary>} />
          <Route path="/dashboard/game-leaderboard" element={<ErrorBoundary><GameLeaderboardPage /></ErrorBoundary>} />
          <Route path="/dashboard/auction" element={<ErrorBoundary><AuctionPage /></ErrorBoundary>} />
          <Route path="/dashboard/power-ups" element={<ErrorBoundary><PowerUpsPage /></ErrorBoundary>} />
          <Route path="/dashboard/buddies" element={<ErrorBoundary><BuddiesPage /></ErrorBoundary>} />
          <Route path="/dashboard/gold-mine" element={<ErrorBoundary><GoldMinePage /></ErrorBoundary>} />
          <Route path="/dashboard/quiz" element={<ErrorBoundary><QuizPage /></ErrorBoundary>} />
          <Route path="/dashboard/store" element={<ErrorBoundary><StorePage /></ErrorBoundary>} />
          <Route path="/dashboard/gifting" element={<ErrorBoundary><GiftingPage /></ErrorBoundary>} />
          <Route path="/dashboard/request-center" element={<ErrorBoundary><RequestCenterPage /></ErrorBoundary>} /> {/* Add new route */}
          {/* Admin Routes */}
          <Route element={<AdminRoute />}>
            <Route path="/admin/users" element={<ErrorBoundary><UserManagement /></ErrorBoundary>} />
            <Route path="/admin/tasks" element={<ErrorBoundary><TaskManagement /></ErrorBoundary>} />
            <Route path="/admin/data-management" element={<ErrorBoundary><DataManagementPage /></ErrorBoundary>} />
            <Route path="/admin/typer-management" element={<ErrorBoundary><TyperSetManagementPage /></ErrorBoundary>} />
            <Route path="/admin/auction-management" element={<ErrorBoundary><AuctionManagementPage /></ErrorBoundary>} />
            <Route path="/admin/buddies-management" element={<ErrorBoundary><BuddiesManagementPage /></ErrorBoundary>} />
            <Route path="/admin/quiz-management" element={<ErrorBoundary><QuizManagementPage /></ErrorBoundary>} />
            <Route path="/admin/store-management" element={<ErrorBoundary><StoreManagementPage /></ErrorBoundary>} />
          </Route>
        </Route>
        {/* Fun Space with its dedicated layout */}
        <Route path="/dashboard/fun-space/*" element={<ProtectedRoute />}>
          <Route element={<FunSpaceLayout />}>
            <Route index element={<ErrorBoundary><FunSpacePage /></ErrorBoundary>} />
            <Route path="games" element={<ErrorBoundary><GamesPage /></ErrorBoundary>} />
            <Route path="tic-tac-toe/:sessionId" element={<ErrorBoundary><TicTacToePage /></ErrorBoundary>} />
            <Route path="ludo/:sessionId" element={<ErrorBoundary><LudoPage /></ErrorBoundary>} /> {/* New Ludo Route */}
            <Route path="2d-builder" element={<ErrorBoundary><TwoDBuilderPage /></ErrorBoundary>} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};