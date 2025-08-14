"use client";

import { Button } from "@/components/ui/button";
import { Channel } from "@/types/chat";
import { useAuth } from "@/contexts/AuthProvider";
import { PlusCircle } from "lucide-react";

interface ChannelListProps {
  channels: Channel[];
  selectedChannelId: string | null;
  onSelectChannel: (id: string) => void;
  onAddChannel: () => void;
}

export const ChannelList = ({ channels, selectedChannelId, onSelectChannel, onAddChannel }: ChannelListProps) => {
  const { profile } = useAuth();

  return (
    <>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-vibrant-orange dark:text-vibrant-yellow">Channels</h2>
        {profile?.role === 'admin' && (
          <Button variant="ghost" size="icon" onClick={onAddChannel} className="transform transition-transform-shadow duration-200 ease-in-out hover:scale-[1.02] hover:shadow-md active:scale-95">
            <PlusCircle className="h-5 w-5" />
            <span className="sr-only">Add Channel</span>
          </Button>
        )}
      </div>
      <nav className="space-y-2">
        {channels && channels.length > 0 ? (
          channels.map((channel) => (
            <Button
              key={channel.id}
              variant={selectedChannelId === channel.id ? "default" : "ghost"}
              className="w-full justify-start transform transition-transform-shadow duration-200 ease-in-out hover:scale-[1.02] hover:shadow-md active:scale-95"
              onClick={() => onSelectChannel(channel.id)}
            >
              # {channel.name}
            </Button>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">No channels available.</p>
        )}
      </nav>
    </>
  );
};