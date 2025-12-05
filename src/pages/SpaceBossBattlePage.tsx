import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Users, Trophy, Sword, Rocket } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { SpaceBattle } from "@/types/space-boss";
import { useToast } from "@/hooks/use-toast";

export default function SpaceBossBattlePage() {
  const [selectedBattle, setSelectedBattle] = useState<SpaceBattle | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  const { data: battles, isLoading } = useQuery({
    queryKey: ["active-space-battles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("space_battles")
        .select("*")
        .in("status", ["scheduled", "active"])
        .order("start_time", { ascending: true });
      if (error) throw error;
      return data as SpaceBattle[];
    },
  });

  const handleJoinBattle = async (battle: SpaceBattle) => {
    try {
      const { error } = await supabase
        .from("space_battle_participants")
        .insert([{ battle_id: battle.id, user_id: (await supabase.auth.getUser()).data.user?.id }]);
      
      if (error && error.code !== '23505') throw error; // Ignore unique constraint violation (already joined)
      
      setSelectedBattle(battle);
      // In a real implementation, this would navigate to the battle view or switch component state
      // For now, we'll just show a toast
      toast({ title: "Joined Battle", description: `You have joined ${battle.title}!` });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  if (selectedBattle) {
    // Return Battle Arena Component here
    return (
      <div className="h-[calc(100vh-4rem)] flex flex-col items-center justify-center bg-black text-white">
        <h1 className="text-4xl font-bold mb-4">Battle Arena: {selectedBattle.title}</h1>
        <p className="text-xl text-gray-400">Loading Battle Systems...</p>
        <Button variant="outline" className="mt-8" onClick={() => setSelectedBattle(null)}>
          Leave Battle
        </Button>
      </div>
    );
  }

  if (isLoading) return (
    <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
      <Loader2 className="h-12 w-12 animate-spin text-primary" />
    </div>
  );

  return (
    <div className="container mx-auto p-6 space-y-8 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-600">
            Space Boss Battle
          </h1>
          <p className="text-muted-foreground mt-2">
            Join forces with other players to defeat cosmic threats!
          </p>
        </div>
        <Button className="bg-purple-600 hover:bg-purple-700">
          <Rocket className="mr-2 h-4 w-4" /> Request Battle
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2 bg-black/40 border-purple-500/30 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sword className="h-5 w-5 text-purple-400" />
              Active & Upcoming Battles
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-4">
                {battles?.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    No active battles found. Check back later!
                  </div>
                ) : (
                  battles?.map((battle) => (
                    <div
                      key={battle.id}
                      className="group flex items-center justify-between p-4 rounded-lg border border-purple-500/20 bg-purple-500/5 hover:bg-purple-500/10 transition-all"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-lg">{battle.title}</h3>
                          <Badge variant={battle.status === 'active' ? 'default' : 'secondary'} className={battle.status === 'active' ? 'bg-green-500 hover:bg-green-600' : ''}>
                            {battle.status}
                          </Badge>
                          {battle.is_global_event && (
                            <Badge variant="outline" className="border-yellow-500 text-yellow-500">
                              Global Event
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" /> 0 Players
                          </span>
                          <span className="capitalize text-purple-400">{battle.mode} Mode</span>
                          <span className="capitalize text-red-400">{battle.difficulty}</span>
                        </div>
                      </div>
                      <Button 
                        onClick={() => handleJoinBattle(battle)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity bg-purple-600 hover:bg-purple-700"
                      >
                        Join
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="bg-black/40 border-purple-500/30 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-yellow-500" />
                Your Stats
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Total Damage</span>
                <span className="font-bold text-xl">0</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Battles Won</span>
                <span className="font-bold text-xl">0</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Global Rank</span>
                <span className="font-bold text-xl text-yellow-500"># -</span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-black/40 border-purple-500/30 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>Ship Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="aspect-video rounded-lg bg-gradient-to-br from-purple-900/50 to-blue-900/50 flex items-center justify-center border border-purple-500/20">
                <Rocket className="h-12 w-12 text-purple-400 animate-pulse" />
              </div>
              <div className="mt-4 text-center text-sm text-muted-foreground">
                Default Cruiser Class
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}