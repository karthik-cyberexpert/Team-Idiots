"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { showSuccess, showError } from "@/utils/toast";
import { Game } from "@/types/game";

const formSchema = z.object({
  gameId: z.string().uuid({ message: "Please select a game." }),
  maxPlayers: z.coerce.number().min(2).max(10).optional().nullable(),
  timeLimitMinutes: z.coerce.number().min(1).optional().nullable(),
});

type CreateGameSessionFormValues = z.infer<typeof formSchema>;

const fetchGamesForSelection = async (): Promise<Game[]> => {
  const { data, error } = await supabase
    .from("games")
    .select(`id, title`)
    .order("title");
  if (error) throw new Error(error.message);
  return data as Game[];
};

const createGameSession = async (values: CreateGameSessionFormValues) => {
  const { data, error } = await supabase.functions.invoke("create-game-session", {
    body: {
      gameId: values.gameId,
      maxPlayers: values.maxPlayers,
      timeLimitMinutes: values.timeLimitMinutes,
    },
  });
  if (error) throw new Error(error.message);
  if (data.error) throw new Error(data.error);
  return data;
};

interface CreateGameSessionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CreateGameSessionDialog = ({ open, onOpenChange }: CreateGameSessionDialogProps) => {
  const queryClient = useQueryClient();
  const form = useForm<CreateGameSessionFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      gameId: "",
      maxPlayers: 2, // Default to 2 players
      timeLimitMinutes: null,
    },
  });

  const { data: games, isLoading: gamesLoading, error: gamesError } = useQuery<Game[]>({
    queryKey: ["gamesForSessionCreation"],
    queryFn: fetchGamesForSelection,
  });

  const mutation = useMutation({
    mutationFn: createGameSession,
    onSuccess: () => {
      showSuccess("Game session created successfully!");
      queryClient.invalidateQueries({ queryKey: ["activeSessions"] });
      onOpenChange(false);
      form.reset();
    },
    onError: (err) => {
      showError(err.message);
    },
  });

  const onSubmit = (values: CreateGameSessionFormValues) => {
    mutation.mutate(values);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Start New Game Session</DialogTitle>
          <DialogDescription>
            Select a game and configure session settings.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="gameId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Select Game</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a game" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {gamesLoading && <SelectItem value="" disabled>Loading games...</SelectItem>}
                      {gamesError && <SelectItem value="" disabled>Error loading games</SelectItem>}
                      {games && games.length === 0 && <SelectItem value="" disabled>No games uploaded yet.</SelectItem>}
                      {games && games.map((game) => (
                        <SelectItem key={game.id} value={game.id}>
                          {game.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="maxPlayers"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Max Players (2-10)</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="e.g., 4" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="timeLimitMinutes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Time Limit (Minutes, Optional)</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="e.g., 60" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? "Starting..." : "Start Session"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};