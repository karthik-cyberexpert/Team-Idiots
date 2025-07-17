import { Rocket } from "lucide-react";

const Header = () => {
  return (
    <header className="p-4 px-4 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Rocket className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-bold">Team-Idiots</h1>
        </div>
      </div>
    </header>
  );
};

export default Header;