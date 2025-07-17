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

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_FILE_TYPES = ["text/html"];

const formSchema = z.object({
  title: z.string().min(1, { message: "Title is required." }),
  description: z.string().optional(),
  gameFile: z
    .instanceof(File)
    .refine((file) => file.size <= MAX_FILE_SIZE, `File size must be less than 5MB.`)
    .refine((file) => ACCEPTED_FILE_TYPES.includes(file.type), "Only HTML files are allowed."),
});

type AddGameFormValues = z.infer<typeof formSchema>;

const createGame = async (values: AddGameFormValues) => {
  const formData = new FormData();
  formData.append('title', values.title);
  formData.append('description', values.description || '');
  formData.append('gameFile', values.gameFile);

  const { error } = await supabase.functions.invoke("create-game", {
    body: formData,
    headers: {
      'Content-Type': 'multipart/form-data', // Important for file uploads
    },
  });
  if (error) {
    throw new Error(`Failed to create game: ${error.message}`);
  }
};

interface AddGameDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const AddGameDialog = ({ open, onOpenChange }: AddGameDialogProps) => {
  const queryClient = useQueryClient();
  const form = useForm<AddGameFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
    },
  });

  const mutation = useMutation({
    mutationFn: createGame,
    onSuccess: () => {
      showSuccess("Game created successfully.");
      queryClient.invalidateQueries({ queryKey: ["games"] });
      onOpenChange(false);
      form.reset();
    },
    onError: (err) => {
      showError(err.message);
    },
  });

  const onSubmit = (values: AddGameFormValues) => {
    mutation.mutate(values);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New Game</DialogTitle>
          <DialogDescription>
            Upload an HTML file for your game and provide its details.
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
                  <FormLabel>Game HTML File</FormLabel>
                  <FormControl>
                    <Input
                      {...fieldProps}
                      type="file"
                      accept=".html"
                      onChange={(event) => onChange(event.target.files && event.target.files[0])}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? "Uploading..." : "Add Game"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};