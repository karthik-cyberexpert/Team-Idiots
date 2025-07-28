import { useAuth } from '@/contexts/AuthProvider';
import AdminDashboard from './admin/Dashboard';
import UserDashboard from './user/Dashboard';
import { Skeleton } from '@/components/ui/skeleton';
import { useEffect } from 'react';

const DashboardPage = () => {
  const { profile, loading, checkLeaderboard } = useAuth();

  useEffect(() => {
    // When the dashboard page loads, run the leaderboard check.
    if (profile) {
      checkLeaderboard();
    }
  }, [profile, checkLeaderboard]);

  if (loading) {
    return (
      <div className="p-8 space-y-4">
        <Skeleton className="h-8 w-1/4" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-4 w-1/3" />
      </div>
    );
  }

  if (profile?.role === 'admin') {
    return <AdminDashboard />;
  }

  return <UserDashboard />;
};

export default DashboardPage;