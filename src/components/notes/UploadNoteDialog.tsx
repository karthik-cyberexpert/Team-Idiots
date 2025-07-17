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
import { showSuccess, showError } from "@/utils/toast";
import { FileUp } from "lucide-react";
import { useAuth } from "@/contexts/AuthProvider"; // Import useAuth

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_FILE_TYPES = ["application/pdf", "text/plain", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"]; // PDF, TXT, DOC, DOCX

const formSchema = z.object({
  title: z.string().min(1, { message: "Title is required." }),
  document: z.any()
    .refine((file) => file?.length > 0, "Document is required.")
    .refine((file) => file?.[0]?.size <= MAX_FILE_SIZE, `File size should be less than ${MAX_FILE_SIZE / (1024 * 1024)}MB.`)
    .refine((file) => ACCEPTED_FILE_TYPES.includes(file?.[0]?.type), "Only PDF, TXT, DOC, DOCX files are allowed."),
});

type UploadNoteFormValues = z.infer<typeof typeof formSchema>;

const uploadDocumentNote = async (values: UploadNoteFormValues, userId: string) => { // Add userId parameter
  const file = values.document[0];
  const fileName = `${Date.now()}-${file.name}`;
  const filePath = `public/${fileName}`;

  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('note-documents')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (uploadError) {
    throw new Error(`Failed to upload document: ${uploadError.message}`);
  }

  const { data: publicUrlData } = supabase.storage
    .from('note-documents')
    .getPublicUrl(uploadData.path);

  if (!publicUrlData.publicUrl) {
    throw new Error("Failed to get public URL for the uploaded document.");
  }

  const { error: insertError } = await supabase.from("notes").insert({
    title: values.title,
    content: `Document: ${file.name}`, // Placeholder content
    document_url: publicUrlData.publicUrl,
    user_id: userId, // Include user_id
  });

  if (insertError) {
    // If database insert fails, try to delete the uploaded file to prevent orphans
    await supabase.storage.from('note-documents').remove([uploadData.path]);
    throw new Error(`Failed to create note entry: ${insertError.message}`);
  }
};

interface UploadNoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const UploadNoteDialog = ({ open, onOpenChange }: UploadNoteDialogProps) => {
  const queryClient = useQueryClient();
  const { user } = useAuth(); // Get the current user

  const form = useForm<UploadNoteFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      document: undefined,
    },
  });

  const mutation = useMutation({
    mutationFn: (values: UploadNoteFormValues) => {
      if (!user) throw new Error("User not authenticated."); // Ensure user exists
      return uploadDocumentNote(values, user.id); // Pass user.id
    },
    onSuccess: () => {
      showSuccess("Document note uploaded successfully.");
      queryClient.invalidateQueries({ queryKey: ["notes"] });
      onOpenChange(false);
      form.reset();
    },
    onError: (err) => {
      showError(err.message);
    },
  });

  const onSubmit = (values: UploadNoteFormValues) => {
    mutation.mutate(values);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Upload Document Note</DialogTitle>
          <DialogDescription>
            Upload a document file as a new note.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Note Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Meeting Minutes" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="document"
              render={({ field: { value, onChange, ...fieldProps } }) => (
                <FormItem>
                  <FormLabel>Document File</FormLabel>
                  <FormControl>
                    <Input
                      {...fieldProps}
                      type="file"
                      accept={ACCEPTED_FILE_TYPES.join(",")}
                      onChange={(event) => onChange(event.target.files)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? "Uploading..." : "Upload Note"}
                <FileUp className="ml-2 h-4 w-4" />
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};