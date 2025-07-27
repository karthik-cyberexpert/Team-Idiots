import * as React from "react";
import { Outlet, Link } from "react-router-dom";
import { SidebarNav } from "./SidebarNav";
import { UserNav } from "./UserNav";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Menu, Rocket, ChevronsLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { RefreshButton } from "@/components/RefreshButton"; // Import RefreshButton

export function DashboardLayout() {
  const [isCollapsed, setIsCollapsed] = React.useState(false);
  const [isMobileSheetOpen, setIsMobileSheetOpen] = React.useState(false); // New state for mobile sheet
  const isMobile = useIsMobile();

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  const handleMobileLinkClick = () => {
    setIsMobileSheetOpen(false); // Close the sheet when a link is clicked
  };

  if (isMobile) {
    return (
      <div className="flex min-h-screen w-full flex-col">
        <header className="sticky top-0 flex h-16 items-center gap-4 border-b bg-background px-4 md:px-6 z-50">
          <Sheet open={isMobileSheetOpen} onOpenChange={setIsMobileSheetOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="shrink-0 md:hidden">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle navigation menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left">
              <nav className="grid gap-6 text-lg font-medium">
                <Link to="/" className="flex items-center gap-2 text-lg font-semibold mb-4">
                  <Rocket className="h-6 w-6" />
                  <span>Team-Idiots</span>
                </Link>
                <SidebarNav isCollapsed={false} onLinkClick={handleMobileLinkClick} />
              </nav>
            </SheetContent>
          </Sheet>
          <div className="flex w-full items-center justify-end gap-4 md:ml-auto md:gap-2 lg:gap-4">
            <RefreshButton /> {/* Add RefreshButton for mobile */}
            <UserNav />
          </div>
        </header>
        <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
          <Outlet />
        </main>
      </div>
    );
  }

  return (
    <div className="grid min-h-screen w-full md:grid-cols-[auto_1fr]">
      <div
        data-collapsed={isCollapsed}
        className={cn(
          "hidden border-r bg-muted/40 md:flex md:flex-col justify-between transition-all duration-300 ease-in-out",
          isCollapsed ? "w-14" : "w-64"
        )}
      >
        <div>
          <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
            <Link to="/" className="flex items-center gap-2 font-semibold">
              <Rocket className="h-6 w-6" />
              {!isCollapsed && <span>Team-Idiots</span>}
            </Link>
          </div>
          <div className="flex-1 mt-4">
            <SidebarNav isCollapsed={isCollapsed} />
          </div>
        </div>
        <div className="border-t p-2 flex justify-center">
          <Button variant="ghost" size="icon" onClick={toggleCollapse}>
            <ChevronsLeft className={cn("h-5 w-5 transition-transform", isCollapsed && "rotate-180")} />
          </Button>
        </div>
      </div>
      <div className="flex flex-col">
        <header className="flex h-14 items-center justify-end gap-4 border-b bg-muted/40 px-4 lg:h-[60px] lg:px-6">
          <RefreshButton /> {/* Add RefreshButton for desktop */}
          <UserNav />
        </header>
        <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}