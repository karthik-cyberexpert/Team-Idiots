import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { Home, Users, FileText, MessageSquare, ListTodo, Database, Trophy, Type, Settings } from "lucide-react"; // Import Type and Settings icons
import { useAuth } from "@/contexts/AuthProvider";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface NavLink {
  href: string;
  label: string;
  icon: React.ReactNode;
  adminOnly?: boolean;
}

interface SidebarNavProps {
  isCollapsed: boolean;
  onLinkClick?: () => void;
}

export function SidebarNav({ isCollapsed, onLinkClick }: SidebarNavProps) {
  const { pathname } = useLocation();
  const { profile } = useAuth();

  const navLinks: NavLink[] = [
    {
      href: "/dashboard",
      label: "Dashboard",
      icon: <Home className="h-4 w-4" />,
    },
    {
      href: "/dashboard/notes",
      label: "Notes",
      icon: <FileText className="h-4 w-4" />,
    },
    {
      href: "/dashboard/chat",
      label: "Chat",
      icon: <MessageSquare className="h-4 w-4" />,
    },
    {
      href: "/dashboard/tasks",
      label: "Tasks",
      icon: <ListTodo className="h-4 w-4" />,
    },
    {
      href: "/dashboard/leaderboard",
      label: "Leaderboard",
      icon: <Trophy className="h-4 w-4" />,
    },
    {
      href: "/dashboard/typer",
      label: "Typer",
      icon: <Type className="h-4 w-4" />,
    },
    {
      href: "/admin/users",
      label: "Users",
      icon: <Users className="h-4 w-4" />,
      adminOnly: true,
    },
    {
      href: "/admin/tasks",
      label: "Task Management",
      icon: <ListTodo className="h-4 w-4" />,
      adminOnly: true,
    },
    {
      href: "/admin/data-management",
      label: "Data Management",
      icon: <Database className="h-4 w-4" />,
      adminOnly: true,
    },
    {
      href: "/admin/typer-management", // New Typer Management link
      label: "Typer Management",
      icon: <Type className="h-4 w-4" />, // Using Type icon for now, can be changed
      adminOnly: true,
    },
  ];

  return (
    <nav className="grid gap-1 px-2 group-[[data-collapsed=true]]:justify-center group-[[data-collapsed=true]]:px-2">
      {navLinks.map((link) => {
        if (link.adminOnly && profile?.role !== 'admin') {
          return null;
        }
        
        const isActive = pathname === link.href;

        if (isCollapsed) {
          return (
            <Tooltip key={link.href} delayDuration={0}>
              <TooltipTrigger asChild>
                <Link
                  to={link.href}
                  className={cn(
                    buttonVariants({ variant: isActive ? "default" : "ghost", size: "icon" }),
                    "h-9 w-9",
                    isActive && "dark:bg-muted dark:text-white dark:hover:bg-muted dark:hover:text-white"
                  )}
                  onClick={onLinkClick}
                >
                  {link.icon}
                  <span className="sr-only">{link.label}</span>
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right" className="flex items-center gap-4">
                {link.label}
              </TooltipContent>
            </Tooltip>
          );
        }

        return (
          <Link
            key={link.href}
            to={link.href}
            className={cn(
              buttonVariants({ variant: isActive ? "default" : "ghost", size: "sm" }),
              isActive && "dark:bg-muted dark:text-white dark:hover:bg-muted dark:hover:text-white",
              "justify-start"
            )}
            onClick={onLinkClick}
          >
            {link.icon}
            <span className="ml-2">{link.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}