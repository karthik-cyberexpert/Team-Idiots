"use client";

import * as React from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { Sparkles, Gamepad2, Square } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface FunSpaceNavLink {
  href: string;
  label: string;
  icon: React.ReactNode;
}

interface FunSpaceSidebarProps {
  isCollapsed: boolean;
  onLinkClick?: () => void;
}

export function FunSpaceSidebar({ isCollapsed, onLinkClick }: FunSpaceSidebarProps) {
  const { pathname } = useLocation();

  const navLinks: FunSpaceNavLink[] = [
    {
      href: "/dashboard/fun-space",
      label: "Overview",
      icon: <Sparkles className="h-4 w-4" />,
    },
    {
      href: "/dashboard/fun-space/games",
      label: "Games",
      icon: <Gamepad2 className="h-4 w-4" />,
    },
    {
      href: "/dashboard/fun-space/2d-builder",
      label: "2D Builder",
      icon: <Square className="h-4 w-4" />,
    },
  ];

  return (
    <nav className="grid gap-1 px-2 group-[[data-collapsed=true]]:justify-center group-[[data-collapsed=true]]:px-2">
      {navLinks.map((link) => {
        const isActive = pathname === link.href;

        if (isCollapsed) {
          return (
            <Tooltip key={link.href} delayDuration={0}>
              <TooltipTrigger asChild>
                <Link
                  to={link.href}
                  className={cn(
                    buttonVariants({ variant: isActive ? "default" : "default", size: "icon" }),
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