import { Rocket, Sun, Moon } from "lucide-react"; // Import Sun and Moon icons
import { useAuth } from "@/contexts/AuthProvider";
import { Button } from "./ui/button";
import { useNavigate, Link } from "react-router-dom";
import { Switch } from "@/components/ui/switch"; // Import Switch
import { useTheme } from "@/contexts/ThemeProvider"; // Import useTheme

const Header = () => {
  const { session, signOut } = useAuth();
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme(); // Use theme context

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const handleThemeToggle = (checked: boolean) => {
    setTheme(checked ? 'dark' : 'light');
  };

  return (
    <header className="p-4 px-4 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <Rocket className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-bold">Team-Idiots</h1>
        </Link>
        <div className="flex items-center gap-2 sm:gap-4">
          <Switch
            checked={theme === 'dark'}
            onCheckedChange={handleThemeToggle}
            className="data-[state=checked]:bg-primary data-[state=unchecked]:bg-gray-200"
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Moon className="h-4 w-4 text-white" /> : <Sun className="h-4 w-4 text-gray-800" />}
          </Switch>
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