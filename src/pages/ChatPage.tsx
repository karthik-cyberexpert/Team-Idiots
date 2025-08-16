"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthProvider";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send, Menu } from "lucide-react";
import { showSuccess, showError } from "@/utils/toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AddChannelDialog } from "@/components/chat/AddChannelDialog";
import { Channel, Message } from "@/types/chat";
import { ChannelList } from "@/components/chat/ChannelList";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

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
      profiles!inner(full_name)
    `)
    .eq("channel_id", channelId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  
  return data?.map((m: any) => ({ ...m, profiles: Array.isArray(m.profiles) ? m.profiles[0] || null : m.profiles })) || [];
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
  const [isMobileSheetOpen, setIsMobileSheetOpen] = React.useState(false);
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

  const selectedChannel = channels?.find(channel => channel.id === selectedChannelId);

  const sendMutation = useMutation({
    mutationFn: sendMessage,
    onMutate: async ({ channelId, content, userId }) => {
      await queryClient.cancelQueries({ queryKey: ["messages", channelId] });
      const previousMessages = queryClient.getQueryData<Message[]>(["messages", channelId]);
      const optimisticMessage: Message = {
        id: `optimistic-${Date.now()}`,
        channel_id: channelId,
        user_id: userId,
        content: content,
        created_at: new Date().toISOString(),
        profiles: { full_name: profile?.full_name || "You" },
      };
      queryClient.setQueryData<Message[]>(["messages", channelId], (old) =>
        old ? [...old, optimisticMessage] : [optimisticMessage]
      );
      setNewMessage("");
      return { previousMessages };
    },
    onError: (err, variables, context) => {
      showError(err.message);
      queryClient.setQueryData(["messages", variables.channelId], context?.previousMessages);
    },
    onSettled: (data, error, variables) => {
      queryClient.invalidateQueries({ queryKey: ["messages", variables.channelId] });
    },
  });

  React.useEffect(() => {
    if (channels && channels.length > 0 && !selectedChannelId) {
      setSelectedChannelId(channels[0].id);
    }
  }, [channels, selectedChannelId]);

  React.useEffect(() => {
    if (!selectedChannelId) return;
    const channel = supabase
      .channel(`public:messages:channel_id=eq.${selectedChannelId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `channel_id=eq.${selectedChannelId}` },
        () => queryClient.invalidateQueries({ queryKey: ["messages", selectedChannelId] })
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

  const handleSelectChannel = (id: string) => {
    setSelectedChannelId(id);
    setIsMobileSheetOpen(false);
  };

  if (authLoading || channelsLoading) {
    return (
      <div className="flex h-full">
        <div className="w-1/4 border-r p-4 space-y-2 hidden md:block"><Skeleton className="h-8 w-3/4" /><Skeleton className="h-8 w-full" /><Skeleton className="h-8 w-full" /></div>
        <div className="flex-1 p-4 flex flex-col"><Skeleton className="h-10 w-1/2 mb-4" /><div className="flex-1 space-y-2 overflow-y-auto"><Skeleton className="h-12 w-full" /><Skeleton className="h-12 w-full" /><Skeleton className="h-12 w-full" /></div><Skeleton className="h-12 w-full mt-4" /></div>
      </div>
    );
  }

  if (channelsError) {
    return <div className="text-vibrant-red">Error loading channels: {channelsError.message}</div>;
  }

  return (
    <>
      <AddChannelDialog open={isAddChannelDialogOpen} onOpenChange={setIsAddChannelDialogOpen} />
      <div className="flex h-full border rounded-lg overflow-hidden shadow-md">
        <div className="hidden md:block md:w-1/4 border-r bg-muted/40 p-4">
          <ChannelList
            channels={channels || []}
            selectedChannelId={selectedChannelId}
            onSelectChannel={handleSelectChannel}
            onAddChannel={() => setIsAddChannelDialogOpen(true)}
          />
        </div>
        <div className="flex-1 flex flex-col">
          <Card className="flex-1 flex flex-col rounded-none border-none shadow-none">
            <CardHeader className="border-b p-4 flex flex-row items-center gap-4">
              <Sheet open={isMobileSheetOpen} onOpenChange={setIsMobileSheetOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" size="icon" className="md:hidden">
                    <Menu className="h-5 w-5" />
                    <span className="sr-only">Open channels</span>
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="p-4">
                  <ChannelList
                    channels={channels || []}
                    selectedChannelId={selectedChannelId}
                    onSelectChannel={handleSelectChannel}
                    onAddChannel={() => {
                      setIsMobileSheetOpen(false);
                      setIsAddChannelDialogOpen(true);
                    }}
                  />
                </SheetContent>
              </Sheet>
              <CardTitle className="text-xl text-vibrant-green dark:text-vibrant-purple">
                {selectedChannel ? `# ${selectedChannel.name}` : "Select a Channel"}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 p-4 overflow-y-auto space-y-4">
              {messagesLoading ? (
                <div className="space-y-2"><Skeleton className="h-12 w-full" /><Skeleton className="h-12 w-full" /><Skeleton className="h-12 w-full" /></div>
              ) : messagesError ? (
                <div className="text-vibrant-red">Error loading messages: {messagesError.message}</div>
              ) : messages && messages.length > 0 ? (
                messages.map((message) => (
                  <div key={message.id} className="flex items-start space-x-3">
                    <div className="flex-shrink-0"><div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-white text-sm font-semibold">{message.profiles?.full_name ? message.profiles.full_name[0].toUpperCase() : 'U'}</div></div>
                    <div>
                      <div className="flex items-baseline space-x-2"><p className="font-semibold text-vibrant-blue dark:text-vibrant-pink">{message.profiles?.full_name || "Unknown User"}</p><span className="text-xs text-muted-foreground">{new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span></div>
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
                <Input placeholder="Type your message..." value={newMessage} onChange={(e) => setNewMessage(e.target.value)} disabled={!selectedChannelId || sendMutation.isPending} />
                <Button type="submit" disabled={!selectedChannelId || sendMutation.isPending || !newMessage.trim()} className="transform transition-transform-shadow duration-200 ease-in-out hover:scale-[1.02] hover:shadow-md active:scale-95"><Send className="h-4 w-4" /></Button>
              </form>
            </div>
          </Card>
        </div>
      </div>
    </>
  );
};

export default ChatPage;