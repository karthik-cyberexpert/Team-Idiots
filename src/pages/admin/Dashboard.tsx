import { useAuth } from '@/contexts/AuthProvider';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

const AdminDashboard = () => {
  const { signOut, profile } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold">Admin Dashboard</h1>
        <Button onClick={handleSignOut}>Sign Out</Button>
      </div>
      <p className="text-lg">Welcome, {profile?.full_name || 'Admin'}!</p>
      <p>This is the admin dashboard. You can manage users and other settings here.</p>
      {/* Admin features like user management will be added here */}
    </div>
  );
};

export default AdminDashboard;