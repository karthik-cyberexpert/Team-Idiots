import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, Trash2, Edit, Save } from "lucide-react";
import { GameMode, DifficultyLevel } from "@/types/space-boss";

export default function SpaceBossBattleManagementPage() {
  const [activeTab, setActiveTab] = useState("battles");

  return (
    <div className="container mx-auto p-6 space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Space Boss Battle Management</h1>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="battles">Battles</TabsTrigger>
          <TabsTrigger value="questions">Questions</TabsTrigger>
          <TabsTrigger value="requests">Requests</TabsTrigger>
        </TabsList>

        <TabsContent value="battles" className="space-y-4">
          <BattleManagement />
        </TabsContent>

        <TabsContent value="questions" className="space-y-4">
          <QuestionManagement />
        </TabsContent>

        <TabsContent value="requests" className="space-y-4">
          <RequestManagement />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function BattleManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreating, setIsCreating] = useState(false);
  const [newBattle, setNewBattle] = useState({
    title: "",
    mode: "programming" as GameMode,
    difficulty: "medium" as DifficultyLevel,
    start_time: "",
    base_hp: 1000,
  });

  const { data: battles, isLoading } = useQuery({
    queryKey: ["admin-space-battles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("space_battles")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const createBattle = useMutation({
    mutationFn: async (battleData: any) => {
      const { error } = await supabase.from("space_battles").insert([battleData]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-space-battles"] });
      setIsCreating(false);
      toast({ title: "Success", description: "Battle created successfully" });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createBattle.mutate({
      ...newBattle,
      current_hp: newBattle.base_hp,
      start_time: new Date(newBattle.start_time).toISOString(),
    });
  };

  if (isLoading) return <Loader2 className="h-8 w-8 animate-spin" />;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Active & Scheduled Battles</h2>
        <Button onClick={() => setIsCreating(!isCreating)}>
          {isCreating ? "Cancel" : <><Plus className="mr-2 h-4 w-4" /> Create Battle</>}
        </Button>
      </div>

      {isCreating && (
        <Card>
          <CardHeader>
            <CardTitle>Create New Battle</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input
                    value={newBattle.title}
                    onChange={(e) => setNewBattle({ ...newBattle, title: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Start Time</Label>
                  <Input
                    type="datetime-local"
                    value={newBattle.start_time}
                    onChange={(e) => setNewBattle({ ...newBattle, start_time: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Mode</Label>
                  <Select
                    value={newBattle.mode}
                    onValueChange={(v: GameMode) => setNewBattle({ ...newBattle, mode: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="programming">Programming</SelectItem>
                      <SelectItem value="software">Software</SelectItem>
                      <SelectItem value="learning">Learning</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Difficulty</Label>
                  <Select
                    value={newBattle.difficulty}
                    onValueChange={(v: DifficultyLevel) => setNewBattle({ ...newBattle, difficulty: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="easy">Easy</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="hard">Hard</SelectItem>
                      <SelectItem value="insane">Insane</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Base HP</Label>
                  <Input
                    type="number"
                    value={newBattle.base_hp}
                    onChange={(e) => setNewBattle({ ...newBattle, base_hp: parseInt(e.target.value) })}
                    required
                  />
                </div>
              </div>
              <Button type="submit" disabled={createBattle.isPending}>
                {createBattle.isPending ? "Creating..." : "Create Battle"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4">
        {battles?.map((battle) => (
          <Card key={battle.id}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {battle.title}
              </CardTitle>
              <div className="flex items-center gap-2">
                <span className={`px-2 py-1 rounded-full text-xs ${
                  battle.status === 'active' ? 'bg-green-500/20 text-green-500' : 
                  battle.status === 'scheduled' ? 'bg-blue-500/20 text-blue-500' : 
                  'bg-gray-500/20 text-gray-500'
                }`}>
                  {battle.status.toUpperCase()}
                </span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-xs text-muted-foreground">
                Mode: {battle.mode} | Difficulty: {battle.difficulty} | HP: {battle.current_hp}/{battle.base_hp}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                Start: {new Date(battle.start_time).toLocaleString()}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function QuestionManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreating, setIsCreating] = useState(false);
  const [jsonContent, setJsonContent] = useState("");
  const [newQuestion, setNewQuestion] = useState({
    title: "",
    mode: "programming" as GameMode,
    difficulty: "medium" as DifficultyLevel,
  });

  const { data: questions, isLoading } = useQuery({
    queryKey: ["admin-space-questions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("space_questions")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const createQuestion = useMutation({
    mutationFn: async (questionData: any) => {
      const { error } = await supabase.from("space_questions").insert([questionData]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-space-questions"] });
      setIsCreating(false);
      setJsonContent("");
      toast({ title: "Success", description: "Question created successfully" });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const content = JSON.parse(jsonContent);
      createQuestion.mutate({
        ...newQuestion,
        content,
      });
    } catch (err) {
      toast({ title: "Invalid JSON", description: "Please check your JSON format", variant: "destructive" });
    }
  };

  if (isLoading) return <Loader2 className="h-8 w-8 animate-spin" />;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Question Bank</h2>
        <Button onClick={() => setIsCreating(!isCreating)}>
          {isCreating ? "Cancel" : <><Plus className="mr-2 h-4 w-4" /> Add Question</>}
        </Button>
      </div>

      {isCreating && (
        <Card>
          <CardHeader>
            <CardTitle>Add New Question</CardTitle>
            <CardDescription>Paste the JSON content for the question below.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input
                    value={newQuestion.title}
                    onChange={(e) => setNewQuestion({ ...newQuestion, title: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Mode</Label>
                  <Select
                    value={newQuestion.mode}
                    onValueChange={(v: GameMode) => setNewQuestion({ ...newQuestion, mode: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="programming">Programming</SelectItem>
                      <SelectItem value="software">Software</SelectItem>
                      <SelectItem value="learning">Learning</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Difficulty</Label>
                  <Select
                    value={newQuestion.difficulty}
                    onValueChange={(v: DifficultyLevel) => setNewQuestion({ ...newQuestion, difficulty: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="easy">Easy</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="hard">Hard</SelectItem>
                      <SelectItem value="insane">Insane</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>JSON Content</Label>
                <Textarea
                  value={jsonContent}
                  onChange={(e) => setJsonContent(e.target.value)}
                  className="font-mono h-64"
                  placeholder='{ "description": "...", "testCases": [] }'
                  required
                />
              </div>
              <Button type="submit" disabled={createQuestion.isPending}>
                {createQuestion.isPending ? "Saving..." : "Save Question"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4">
        {questions?.map((q) => (
          <Card key={q.id}>
            <CardHeader className="p-4">
              <div className="flex justify-between items-center">
                <CardTitle className="text-sm font-medium">{q.title}</CardTitle>
                <div className="flex gap-2 text-xs text-muted-foreground">
                  <span className="capitalize">{q.mode}</span>
                  <span>•</span>
                  <span className="capitalize">{q.difficulty}</span>
                </div>
              </div>
            </CardHeader>
          </Card>
        ))}
      </div>
    </div>
  );
}

function RequestManagement() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Battle Requests</CardTitle>
        <CardDescription>Manage user requests for new battles.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-sm text-muted-foreground">No pending requests.</div>
      </CardContent>
    </Card>
  );
}