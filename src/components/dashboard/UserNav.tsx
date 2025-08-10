import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/AuthProvider";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Share2, Store } from "lucide-react";
import { showSuccess, showError } from "@/utils/toast";

export function UserNav() {
  const { user, profile, signOut, userLevel, userBadge } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const getInitials = (name: string | null | undefined) => {
    if (!name || name.trim() === '') {
      return '??';
    }
    const parts = name.trim().split(' ');
    if (parts.length === 1) {
      return parts[0].substring(0, 2).toUpperCase();
    }
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  };

  const handleShareBadge = async () => {
    const shareMessage = `I just reached Level ${userLevel} and earned the ${userBadge} badge on Team-Idiots with ${profile?.xp || 0} XP! Join me and climb the ranks!`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Team-Idiots XP Badge',
          text: shareMessage,
          url: window.location.origin, // Or a specific badge URL if you create one
        });
        showSuccess("Badge shared successfully!");
      } catch (error) {
        console.error("Error sharing:", error);
        showError("Failed to share badge.");
      }
    } else {
      // Fallback for browsers that don't support Web Share API
      navigator.clipboard.writeText(shareMessage)
        .then(() => showSuccess("Badge message copied to clipboard!"))
        .catch(() => showError("Failed to copy message."));
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
          <Avatar className="h-8 w-8">
            <AvatarImage src={profile?.avatar_url} alt={profile?.full_name || ""} />
            <AvatarFallback>{getInitials(profile?.full_name)}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{profile?.full_name}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {user?.email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem className="flex items-center justify-between">
            <span>Level {userLevel}</span>
            <Badge variant="outline">{userBadge}</Badge>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleShareBadge}>
            <Share2 className="mr-2 h-4 w-4" />
            <span>Share Badge</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => navigate('/dashboard/profile')}>
            Edit Profile
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => navigate('/dashboard/store')}>
            <Store className="mr-2 h-4 w-4" />
            <span>Open Store</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => navigate('/dashboard/settings')}>
            Settings
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSignOut}>
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}