"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
import { Textarea } from "@/components/ui/textarea";
import { showSuccess, showError } from "@/utils/toast";
import { Game } from "@/types/game";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_FILE_TYPES = ["text/html"];

const formSchema = z.object({
  title: z.string().min(1, { message: "Title is required." }),
  description: z.string().optional(),
  gameFile: z
    .instanceof(File)
    .optional() // File is optional for editing
    .refine((file) => !file || file.size <= MAX_FILE_SIZE, `File size must be less than 5MB.`)
    .refine((file) => !file || ACCEPTED_FILE_TYPES.includes(file.type), "Only HTML files are allowed."),
});

type EditGameFormValues = z.infer<typeof formSchema>;

const updateGame = async (values: EditGameFormValues & { gameId: string }) => {
  const formData = new FormData();
  formData.append('gameId', values.gameId);
  formData.append('title', values.title);
  formData.append('description', values.description || '');
  if (values.gameFile) {
    formData.append('gameFile', values.gameFile);
  }

  const { error } = await supabase.functions.invoke("update-game", {
    body: formData,
    headers: {
      'Content-Type': 'multipart/form-data', // Important for file uploads
    },
  });
  if (error) {
    throw new Error(`Failed to update game: ${error.message}`);
  }
};

interface EditGameDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  game: Game | null;
}

export const EditGameDialog = ({ open, onOpenChange, game }: EditGameDialogProps) => {
  const queryClient = useQueryClient();
  const form = useForm<EditGameFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
    },
  });

  React.useEffect(() => {
    if (game) {
      form.reset({
        title: game.title,
        description: game.description || "",
        gameFile: undefined, // Clear file input on reset
      });
    }
  }, [game, form]);

  const mutation = useMutation({
    mutationFn: updateGame,
    onSuccess: () => {
      showSuccess("Game updated successfully.");
      queryClient.invalidateQueries({ queryKey: ["games"] });
      onOpenChange(false);
    },
    onError: (err) => {
      showError(err.message);
    },
  });

  const onSubmit = (values: EditGameFormValues) => {
    if (!game) return;
    mutation.mutate({ ...values, gameId: game.id });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Game</DialogTitle>
          <DialogDescription>
            Make changes to the game details or upload a new HTML file.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Game Title</FormLabel>
                  <FormControl>
                    <Input placeholder="My Awesome Game" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="A brief description of the game..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="gameFile"
              render={({ field: { value, onChange, ...fieldProps } }) => (
                <FormItem>
                  <FormLabel>Replace HTML File (Optional)</FormLabel>
                  <FormControl>
                    <Input
                      {...fieldProps}
                      type="file"
                      accept=".html"
                      onChange={(event) => onChange(event.target.files && event.target.files[0])}
                    />
                  </FormControl>
                  <FormDescription>Upload a new HTML file to replace the current one.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};