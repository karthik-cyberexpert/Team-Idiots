"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthProvider";
import { Bell, CheckCircle, ExternalLink, Gift } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { showSuccess, showError } from "@/utils/toast";
import { formatDistanceToNow } from "date-fns";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Notification } from "@/types/notification";
import { useGifting } from "@/contexts/GiftingProvider";

const fetchNotifications = async (userId: string): Promise<Notification[]> => {
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data;
};

const markNotificationAsRead = async (notificationId: string) => {
  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("id", notificationId);
  if (error) throw new Error(error.message);
};

const markAllNotificationsAsRead = async (userId: string) => {
  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("user_id", userId)
    .eq("is_read", false);
  if (error) throw new Error(error.message);
};

export const Notifications = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { openGift } = useGifting();

  const { data: notifications, isLoading, error } = useQuery<Notification[]>({
    queryKey: ["myNotifications", user?.id],
    queryFn: () => fetchNotifications(user!.id),
    enabled: !!user,
  });

  const unreadCount = notifications?.filter((n) => !n.is_read).length || 0;

  React.useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`notifications-for-user-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        () => queryClient.invalidateQueries({ queryKey: ["myNotifications", user.id] })
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

  const markSingleAsReadMutation = useMutation({
    mutationFn: markNotificationAsRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["myNotifications", user?.id] }),
    onError: (err: Error) => showError(err.message),
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: () => markAllNotificationsAsRead(user!.id),
    onSuccess: () => {
      showSuccess("All notifications marked as read.");
      queryClient.invalidateQueries({ queryKey: ["myNotifications", user?.id] });
    },
    onError: (err: Error) => showError(err.message),
  });

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.is_read) {
      markSingleAsReadMutation.mutate(notification.id);
    }
    if (notification.gift_payload && !notification.gift_payload.is_claimed) {
      openGift(notification);
    } else if (notification.link_to) {
      navigate(notification.link_to);
    }
  };

  if (isLoading) return <Button variant="ghost" size="icon" disabled><Bell className="h-5 w-5" /></Button>;
  if (error) return <Button variant="ghost" size="icon" disabled><Bell className="h-5 w-5 text-destructive" /></Button>;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && <Badge className="absolute -top-1 -right-1 h-4 w-4 flex items-center justify-center p-0 text-xs">{unreadCount}</Badge>}
          <span className="sr-only">View notifications</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notifications</span>
          {unreadCount > 0 && <Button variant="ghost" size="sm" onClick={() => markAllAsReadMutation.mutate()} disabled={markAllAsReadMutation.isPending} className="h-auto px-2 py-1 text-xs"><CheckCircle className="mr-1 h-3 w-3" /> Mark All Read</Button>}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <ScrollArea className="h-[300px]">
          {notifications && notifications.length > 0 ? (
            notifications.map((notification) => (
              <DropdownMenuItem
                key={notification.id}
                className={cn("flex flex-col items-start space-y-1 cursor-pointer", !notification.is_read && "bg-accent/10 font-semibold")}
                onClick={() => handleNotificationClick(notification)}
              >
                <p className="text-sm leading-tight">{notification.message}</p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}</span>
                  {notification.link_to && <ExternalLink className="h-3 w-3" />}
                  {notification.gift_payload && !notification.gift_payload.is_claimed && <Gift className="h-3 w-3 text-vibrant-pink" />}
                </div>
              </DropdownMenuItem>
            ))
          ) : (
            <p className="p-4 text-center text-sm text-muted-foreground">No notifications yet.</p>
          )}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};