import { useAuth } from '@/contexts/AuthProvider';
import { Navigate, Outlet } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import React from 'react';
import { Loader2 } from 'lucide-react'; // Import a spinner icon

const ProtectedRoute = () => {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="p-8 space-y-4 flex flex-col items-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary" /> {/* Spinner */}
          <p className="text-lg text-muted-foreground mt-4">Loading your session...</p>
          <Skeleton className="h-4 w-[250px] mt-4" />
          <Skeleton className="h-4 w-[200px] mt-2" />
        </div>
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;