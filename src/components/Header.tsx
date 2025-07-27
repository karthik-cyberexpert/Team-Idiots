import { Rocket } from "lucide-react";
import { useAuth } from "@/contexts/AuthProvider";
import { Button } from "./ui/button";
import { useNavigate, Link } from "react-router-dom";

const Header = () => {
  const { session, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <header className="p-4 px-4 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <Rocket className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-bold">Team-Idiots</h1>
        </Link>
        <div className="flex items-center gap-2 sm:gap-4">
          {session ? (
            <>
              <Button variant="ghost" onClick={() => navigate('/dashboard')} className="transform transition-transform-shadow duration-200 ease-in-out hover:scale-[1.02] hover:shadow-md active:scale-95">Dashboard</Button>
              <Button onClick={handleSignOut} className="transform transition-transform-shadow duration-200 ease-in-out hover:scale-[1.02] hover:shadow-md active:scale-95">Logout</Button>
            </>
          ) : (
            <Button onClick={() => navigate('/login')} className="transform transition-transform-shadow duration-200 ease-in-out hover:scale-[1.02] hover:shadow-md active:scale-95">Login</Button>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;