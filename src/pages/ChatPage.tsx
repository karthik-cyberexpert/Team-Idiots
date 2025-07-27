"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthProvider";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send, PlusCircle } from "lucide-react";
import { showSuccess, showError } from "@/utils/toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AddChannelDialog } from "@/components/chat/AddChannelDialog";

interface Channel {
  id: string;
  name: string;
  created_at: string;
}

interface Message {
  id: string;
  channel_id: string;
  user_id: string;
  content: string;
  created_at: string;
  profiles: {
    full_name: string;
  } | null;
}

const fetchChannels = async (): Promise<Channel[]> => {
  const { data, error } = await supabase.from("channels").select("*").order("name");
  if (error) throw new Error(error.message);
  return data;
};

const fetchMessages = async (channelId: string): Promise<Message[]> => {
  const { data, error } = await supabase
    .from("messages")
    .select(`
      id,
      channel_id,
      user_id,
      content,
      created_at,
      profiles (full_name)
    `)
    .eq("channel_id", channelId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return data;
};

const sendMessage = async ({ channelId, content, userId }: { channelId: string; content: string; userId: string }) => {
  const { error } = await supabase.from("messages").insert({ channel_id: channelId, content, user_id: userId });
  if (error) throw new Error(error.message);
};

const ChatPage = () => {
  const queryClient = useQueryClient();
  const { user, profile, loading: authLoading } = useAuth();
  const [selectedChannelId, setSelectedChannelId] = React.useState<string | null>(null);
  const [newMessage, setNewMessage] = React.useState("");
  const [isAddChannelDialogOpen, setIsAddChannelDialogOpen] = React.useState(false);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  const { data: channels, isLoading: channelsLoading, error: channelsError } = useQuery<Channel[]>({
    queryKey: ["channels"],
    queryFn: fetchChannels,
  });

  const { data: messages, isLoading: messagesLoading, error: messagesError } = useQuery<Message[]>({
    queryKey: ["messages", selectedChannelId],
    queryFn: () => fetchMessages(selectedChannelId!),
    enabled: !!selectedChannelId,
  });

  // Define selectedChannel here
  const selectedChannel = channels?.find(channel => channel.id === selectedChannelId);

  const sendMutation = useMutation({
    mutationFn: sendMessage,
    onMutate: async ({ channelId, content, userId }) => {
      // Cancel any outgoing refetches for the messages query
      await queryClient.cancelQueries({ queryKey: ["messages", channelId] });

      // Snapshot the previous value
      const previousMessages = queryClient.getQueryData<Message[]>(["messages", channelId]);

      // Optimistically update to the new value
      const optimisticMessage: Message = {
        id: `optimistic-${Date.now()}`, // Temporary ID
        channel_id: channelId,
        user_id: userId,
        content: content,
        created_at: new Date().toISOString(),
        profiles: { full_name: profile?.full_name || "You" }, // Use current user's name
      };

      queryClient.setQueryData<Message[]>(["messages", channelId], (old) =>
        old ? [...old, optimisticMessage] : [optimisticMessage]
      );

      setNewMessage(""); // Clear input immediately

      return { previousMessages };
    },
    onError: (err, variables, context) => {
      showError(err.message);
      // Rollback to the previous value on error
      queryClient.setQueryData(["messages", variables.channelId], context?.previousMessages);
    },
    onSettled: (data, error, variables) => {
      // Always refetch after error or success to ensure data is in sync
      queryClient.invalidateQueries({ queryKey: ["messages", variables.channelId] });
    },
  });

  React.useEffect(() => {
    if (channels && channels.length > 0 && !selectedChannelId) {
      setSelectedChannelId(channels[0].id); // Select the first channel by default
    }
  }, [channels, selectedChannelId]);

  React.useEffect(() => {
    if (!selectedChannelId) return;

    const channel = supabase
      .channel(`public:messages:channel_id=eq.${selectedChannelId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `channel_id=eq.${selectedChannelId}` },
        (payload) => {
          queryClient.invalidateQueries({ queryKey: ["messages", selectedChannelId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedChannelId, queryClient]);

  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim() && selectedChannelId && user) {
      sendMutation.mutate({ channelId: selectedChannelId, content: newMessage.trim(), userId: user.id });
    }
  };

  if (authLoading || channelsLoading) {
    return (
      <div className="flex h-full">
        <div className="w-1/4 border-r p-4 space-y-2">
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
        </div>
        <div className="flex-1 p-4 flex flex-col">
          <Skeleton className="h-10 w-1/2 mb-4" />
          <div className="flex-1 space-y-2 overflow-y-auto">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
          <Skeleton className="h-12 w-full mt-4" />
        </div>
      </div>
    );
  }

  if (channelsError) {
    return <div className="text-red-500">Error loading channels: {channelsError.message}</div>;
  }

  return (
    <>
      <AddChannelDialog open={isAddChannelDialogOpen} onOpenChange={setIsAddChannelDialogOpen} />
      <div className="flex h-full border rounded-lg overflow-hidden">
        <div className="w-1/4 border-r bg-muted/40 p-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">Channels</h2>
            {profile?.role === 'admin' && (
              <Button variant="ghost" size="icon" onClick={() => setIsAddChannelDialogOpen(true)} className="transform transition-transform-shadow duration-200 ease-in-out hover:scale-[1.02] hover:shadow-md active:scale-95">
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
                  onClick={() => setSelectedChannelId(channel.id)}
                >
                  # {channel.name}
                </Button>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No channels available.</p>
            )}
          </nav>
        </div>
        <div className="flex-1 flex flex-col">
          <Card className="flex-1 flex flex-col rounded-none border-none shadow-none">
            <CardHeader className="border-b p-4">
              <CardTitle className="text-xl">
                {selectedChannel ? `# ${selectedChannel.name}` : "Select a Channel"}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 p-4 overflow-y-auto space-y-4">
              {messagesLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : messagesError ? (
                <div className="text-red-500">Error loading messages: {messagesError.message}</div>
              ) : messages && messages.length > 0 ? (
                messages.map((message) => (
                  <div key={message.id} className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-white text-sm font-semibold">
                        {message.profiles?.full_name ? message.profiles.full_name[0].toUpperCase() : 'U'}
                      </div>
                    </div>
                    <div>
                      <div className="flex items-baseline space-x-2">
                        <p className="font-semibold">{message.profiles?.full_name || "Unknown User"}</p>
                        <span className="text-xs text-muted-foreground">
                          {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-sm text-foreground">{message.content}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center text-muted-foreground py-10">No messages yet. Be the first to say hello!</div>
              )}
              <div ref={messagesEndRef} />
            </CardContent>
            <div className="border-t p-4">
              <form onSubmit={handleSendMessage} className="flex gap-2">
                <Input
                  placeholder="Type your message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  disabled={!selectedChannelId || sendMutation.isPending}
                />
                <Button type="submit" disabled={!selectedChannelId || sendMutation.isPending || !newMessage.trim()} className="transform transition-transform-shadow duration-200 ease-in-out hover:scale-[1.02] hover:shadow-md active:scale-95">
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </div>
          </Card>
        </div>
      </div>
    </>
  );
};

export default ChatPage;