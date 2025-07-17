import { useAuth } from '@/contexts/AuthProvider';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

const UserDashboard = () => {
  const { signOut, profile } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold">User Dashboard</h1>
        <Button onClick={handleSignOut}>Sign Out</Button>
      </div>
      <p className="text-lg">Welcome, {profile?.full_name || 'User'}!</p>
      <p>This is your personal dashboard. You can collaborate with your team here.</p>
      {/* User features like chat, notes, and tasks will be added here */}
    </div>
  );
};

export default UserDashboard;