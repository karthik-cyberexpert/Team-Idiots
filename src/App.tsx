import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import { AuthProvider } from "./contexts/AuthProvider";
import ProtectedRoute from "./components/ProtectedRoute";
import { DashboardLayout } from "./components/dashboard/DashboardLayout";
import UserManagement from "./pages/admin/UserManagement";
import AdminRoute from "./components/AdminRoute";
import NotesPage from "./pages/NotesPage";
import ChatPage from "./pages/ChatPage";
import TasksPage from "./pages/TasksPage";
import TaskManagement from "./pages/admin/TaskManagement";
import DataManagementPage from "./pages/admin/DataManagementPage";
import EditProfilePage from "./pages/EditProfilePage";
import SettingsPage from "./pages/SettingsPage";
import { ThemeProvider } from "./contexts/ThemeProvider";
import LeaderboardPage from "./pages/LeaderboardPage";
import XpHistoryPage from "./pages/XpHistoryPage";
import TyperPage from "./pages/TyperPage";
import TyperManagementPage from "./pages/admin/typer/TyperManagementPage";
import GameLeaderboardPage from "./pages/GameLeaderboardPage";
import ChallengesPage from "./pages/ChallengesPage";
import ChallengeManagementPage from "./pages/admin/ChallengeManagementPage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <HashRouter>
          <AuthProvider>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/login" element={<LoginPage />} />
              
              <Route element={<ProtectedRoute />}>
                <Route element={<DashboardLayout />}>
                  <Route path="/dashboard" element={<DashboardPage />} />
                  <Route path="/dashboard/notes" element={<NotesPage />} />
                  <Route path="/dashboard/chat" element={<ChatPage />} />
                  <Route path="/dashboard/tasks" element={<TasksPage />} />
                  <Route path="/dashboard/leaderboard" element={<LeaderboardPage />} />
                  <Route path="/dashboard/profile" element={<EditProfilePage />} />
                  <Route path="/dashboard/settings" element={<SettingsPage />} />
                  <Route path="/dashboard/xp-history" element={<XpHistoryPage />} />
                  <Route path="/dashboard/typer" element={<TyperPage />} />
                  <Route path="/dashboard/game-leaderboard" element={<GameLeaderboardPage />} />
                  <Route path="/dashboard/challenges" element={<ChallengesPage />} />
                  <Route element={<AdminRoute />}>
                    <Route path="/admin/users" element={<UserManagement />} />
                    <Route path="/admin/tasks" element={<TaskManagement />} />
                    <Route path="/admin/data-management" element={<DataManagementPage />} />
                    <Route path="/admin/typer-management" element={<TyperManagementPage />} />
                    <Route path="/admin/challenges" element={<ChallengeManagementPage />} />
                  </Route>
                </Route>
              </Route>

              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </HashRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;