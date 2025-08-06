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
import TyperSetManagementPage from "./pages/admin/typer/TyperSetManagementPage";
import GameLeaderboardPage from "./pages/GameLeaderboardPage";
import ErrorBoundary from "./components/ErrorBoundary";

// Optimized QueryClient configuration for better performance
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      retry: (failureCount, error) => {
        // Don't retry on 4xx errors
        if (error && typeof error === 'object' && 'status' in error) {
          const status = (error as any).status;
          if (status >= 400 && status < 500) return false;
        }
        return failureCount < 2;
      },
      refetchOnWindowFocus: false,
      refetchOnMount: 'always',
    },
    mutations: {
      retry: 1,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <HashRouter>
          <AuthProvider>
            <ErrorBoundary>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/login" element={<LoginPage />} />
                
                <Route element={<ProtectedRoute />}>
                  <Route element={<DashboardLayout />}>
                    <Route path="/dashboard" element={<ErrorBoundary><DashboardPage /></ErrorBoundary>} />
                    <Route path="/dashboard/notes" element={<ErrorBoundary><NotesPage /></ErrorBoundary>} />
                    <Route path="/dashboard/chat" element={<ErrorBoundary><ChatPage /></ErrorBoundary>} />
                    <Route path="/dashboard/tasks" element={<ErrorBoundary><TasksPage /></ErrorBoundary>} />
                    <Route path="/dashboard/leaderboard" element={<ErrorBoundary><LeaderboardPage /></ErrorBoundary>} />
                    <Route path="/dashboard/profile" element={<ErrorBoundary><EditProfilePage /></ErrorBoundary>} />
                    <Route path="/dashboard/settings" element={<ErrorBoundary><SettingsPage /></ErrorBoundary>} />
                    <Route path="/dashboard/xp-history" element={<ErrorBoundary><XpHistoryPage /></ErrorBoundary>} />
                    <Route path="/dashboard/typer" element={<ErrorBoundary><TyperPage /></ErrorBoundary>} />
                    <Route path="/dashboard/game-leaderboard" element={<ErrorBoundary><GameLeaderboardPage /></ErrorBoundary>} />
                    <Route element={<AdminRoute />}>
                      <Route path="/admin/users" element={<ErrorBoundary><UserManagement /></ErrorBoundary>} />
                      <Route path="/admin/tasks" element={<ErrorBoundary><TaskManagement /></ErrorBoundary>} />
                      <Route path="/admin/data-management" element={<ErrorBoundary><DataManagementPage /></ErrorBoundary>} />
                      <Route path="/admin/typer-management" element={<ErrorBoundary><TyperSetManagementPage /></ErrorBoundary>} />
                    </Route>
                  </Route>
                </Route>

                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </ErrorBoundary>
          </AuthProvider>
        </HashRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;