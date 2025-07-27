"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
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
import { ArrowLeft } from "lucide-react";
import { useAuth } from "@/contexts/AuthProvider";

interface Note {
  id: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
  user_id: string;
  profiles?: {
    full_name: string;
  } | null;
  document_url?: string | null;
}

const formSchema = z.object({
  title: z.string().min(1, { message: "Title is required." }),
  content: z.string().optional(),
  document_url: z.string().url({ message: "Please enter a valid URL." }).optional().or(z.literal('')),
});

type NoteFormValues = z.infer<typeof formSchema>;

const createNote = async (values: NoteFormValues) => {
  const { data, error } = await supabase.functions.invoke("create-note", {
    body: { note: values },
  });
  if (error) throw new Error(error.message);
  if (data.error) throw new Error(data.error);
  return data;
};

const updateNote = async (id: string, values: NoteFormValues) => {
  const { data, error } = await supabase.from("notes").update(values).eq("id", id).select().single();
  if (error) throw new Error(error.message);
  return data;
};

interface NoteEditorProps {
  note: Note | null;
  onBack: () => void;
}

export const NoteEditor = ({ note, onBack }: NoteEditorProps) => {
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();

  const form = useForm<NoteFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: note?.title || "",
      content: note?.content || "",
      document_url: note?.document_url || "",
    },
  });

  React.useEffect(() => {
    form.reset({
      title: note?.title || "",
      content: note?.content || "",
      document_url: note?.document_url || "",
    });
  }, [note, form]);

  const createMutation = useMutation({
    mutationFn: (values: NoteFormValues) => {
      if (!user) throw new Error("User not authenticated.");
      return createNote(values);
    },
    onMutate: async (newNoteData) => {
      await queryClient.cancelQueries({ queryKey: ["notes"] });
      const previousNotes = queryClient.getQueryData<Note[]>(["notes"]);

      const optimisticNote: Note = {
        id: `optimistic-${Date.now()}`, // Temporary ID
        title: newNoteData.title,
        content: newNoteData.content || "",
        document_url: newNoteData.document_url || null,
        user_id: user!.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        profiles: { full_name: profile?.full_name || "You" },
      };

      queryClient.setQueryData<Note[]>(["notes"], (old) =>
        old ? [optimisticNote, ...old] : [optimisticNote]
      );

      onBack(); // Navigate back immediately
      return { previousNotes };
    },
    onSuccess: () => {
      showSuccess("Note created successfully.");
    },
    onError: (err, newNoteData, context) => {
      showError(err.message);
      queryClient.setQueryData(["notes"], context?.previousNotes); // Rollback
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["notes"] }); // Ensure fresh data
    },
  });

  const updateMutation = useMutation({
    mutationFn: (values: NoteFormValues) => updateNote(note!.id, values),
    onMutate: async (updatedNoteData) => {
      await queryClient.cancelQueries({ queryKey: ["notes"] });
      const previousNotes = queryClient.getQueryData<Note[]>(["notes"]);

      queryClient.setQueryData<Note[]>(["notes"], (old) =>
        old?.map((n) =>
          n.id === note!.id
            ? {
                ...n,
                title: updatedNoteData.title,
                content: updatedNoteData.content || "",
                document_url: updatedNoteData.document_url || null,
                updated_at: new Date().toISOString(),
              }
            : n
        )
      );

      onBack(); // Navigate back immediately
      return { previousNotes };
    },
    onSuccess: () => {
      showSuccess("Note updated successfully.");
    },
    onError: (err, updatedNoteData, context) => {
      showError(err.message);
      queryClient.setQueryData(["notes"], context?.previousNotes); // Rollback
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["notes"] }); // Ensure fresh data
    },
  });

  const onSubmit = (values: NoteFormValues) => {
    if (note) {
      updateMutation.mutate(values);
    } else {
      createMutation.mutate(values);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack} className="transform transition-transform-shadow duration-200 ease-in-out hover:scale-[1.02] hover:shadow-md active:scale-95">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h2 className="text-2xl font-bold">{note ? "Edit Note" : "Create New Note"}</h2>
      </div>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Title</FormLabel>
                <FormControl>
                  <Input placeholder="My awesome note" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="content"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Content</FormLabel>
                <FormControl>
                  <Textarea placeholder="Write your note here..." rows={10} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="document_url"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Link (Optional)</FormLabel>
                <FormControl>
                  <Input type="url" placeholder="https://example.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending} className="transform transition-transform-shadow duration-200 ease-in-out hover:scale-[1.02] hover:shadow-md active:scale-95">
            {note ? (updateMutation.isPending ? "Saving..." : "Save Changes") : (createMutation.isPending ? "Creating..." : "Create Note")}
          </Button>
        </form>
      </Form>
    </div>
  );
};