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
import { ArrowLeft, FileDown } from "lucide-react";
import { useAuth } from "@/contexts/AuthProvider"; // Import useAuth

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
  document_url?: string | null; // Add document_url to the interface
}

const formSchema = z.object({
  title: z.string().min(1, { message: "Title is required." }),
  content: z.string().optional(),
});

type NoteFormValues = z.infer<typeof formSchema>;

const createNote = async (values: NoteFormValues, userId: string) => { // Add userId parameter
  const { data, error } = await supabase.from("notes").insert({ ...values, user_id: userId }).select().single(); // Include user_id
  if (error) throw new Error(error.message);
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
  const { user } = useAuth(); // Get the current user

  const form = useForm<NoteFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: note?.title || "",
      content: note?.content || "",
    },
  });

  React.useEffect(() => {
    form.reset({
      title: note?.title || "",
      content: note?.content || "",
    });
  }, [note, form]);

  const createMutation = useMutation({
    mutationFn: (values: NoteFormValues) => {
      if (!user) throw new Error("User not authenticated."); // Ensure user exists
      return createNote(values, user.id); // Pass user.id
    },
    onSuccess: () => {
      showSuccess("Note created successfully.");
      queryClient.invalidateQueries({ queryKey: ["notes"] });
      onBack();
    },
    onError: (err) => {
      showError(err.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: (values: NoteFormValues) => updateNote(note!.id, values),
    onSuccess: () => {
      showSuccess("Note updated successfully.");
      queryClient.invalidateQueries({ queryKey: ["notes"] });
      onBack();
    },
    onError: (err) => {
      showError(err.message);
    },
  });

  const onSubmit = (values: NoteFormValues) => {
    if (note) {
      updateMutation.mutate(values);
    } else {
      createMutation.mutate(values);
    }
  };

  const isDocumentNote = !!note?.document_url;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h2 className="text-2xl font-bold">{note ? (isDocumentNote ? "View Document Note" : "Edit Note") : "Create New Note"}</h2>
      </div>
      {isDocumentNote && note?.document_url && (
        <div className="mb-4 p-4 border rounded-md bg-muted flex items-center justify-between">
          <p className="text-sm text-muted-foreground">This is a document note. You can view it below.</p>
          <a
            href={note.document_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center text-blue-600 hover:underline text-sm"
          >
            <FileDown className="h-4 w-4 mr-1" /> View Document
          </a>
        </div>
      )}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Title</FormLabel>
                <FormControl>
                  <Input placeholder="My awesome note" {...field} disabled={isDocumentNote} />
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
                  <Textarea placeholder="Write your note here..." rows={10} {...field} disabled={isDocumentNote} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          {!isDocumentNote && ( // Only show save button for non-document notes
            <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
              {note ? (updateMutation.isPending ? "Saving..." : "Save Changes") : (createMutation.isPending ? "Creating..." : "Create Note")}
            </Button>
          )}
        </form>
      </Form>
    </div>
  );
};