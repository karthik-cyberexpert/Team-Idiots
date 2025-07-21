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
import { useAuth } from "@/contexts/AuthProvider";
import { v4 as uuidv4 } from 'uuid';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_FILE_TYPES = ["image/jpeg", "image/png", "application/pdf", "text/plain"];

const formSchema = z.object({
  title: z.string().min(1, { message: "Title is required." }),
  file: z
    .instanceof(FileList)
    .refine((files) => files?.length === 1, "File is required.")
    .refine((files) => files?.[0]?.size <= MAX_FILE_SIZE, `Max file size is 5MB.`)
    .refine(
      (files) => ACCEPTED_FILE_TYPES.includes(files?.[0]?.type),
      "Only .jpg, .png, .pdf, and .txt files are accepted."
    ),
});

type UploadDocumentFormValues = z.infer<typeof formSchema>;

const uploadAndCreateNote = async ({ title, file, userId }: { title: string; file: File; userId: string }) => {
  const fileExt = file.name.split('.').pop();
  const fileName = `${uuidv4()}.${fileExt}`;
  const filePath = `${userId}/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from('note_documents')
    .upload(filePath, file);

  if (uploadError) {
    throw new Error(`Storage Error: ${uploadError.message}`);
  }

  const { data: { publicUrl } } = supabase.storage
    .from('note_documents')
    .getPublicUrl(filePath);

  if (!publicUrl) {
    throw new Error("Could not get public URL for the uploaded file.");
  }

  const { error: dbError } = await supabase.from('notes').insert({
    title,
    user_id: userId,
    document_url: publicUrl,
    content: `Document uploaded: ${file.name}`,
  });

  if (dbError) {
    await supabase.storage.from('note_documents').remove([filePath]);
    throw new Error(`Database Error: ${dbError.message}`);
  }
};

interface UploadDocumentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const UploadDocumentDialog = ({ open, onOpenChange }: UploadDocumentDialogProps) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const form = useForm<UploadDocumentFormValues>({
    resolver: zodResolver(formSchema),
  });

  const mutation = useMutation({
    mutationFn: (values: { title: string; file: File }) => {
      if (!user) throw new Error("User not authenticated.");
      return uploadAndCreateNote({ ...values, userId: user.id });
    },
    onSuccess: () => {
      showSuccess("Document uploaded and note created.");
      queryClient.invalidateQueries({ queryKey: ["notes"] });
      onOpenChange(false);
      form.reset();
    },
    onError: (err) => {
      showError(err.message);
    },
  });

  const onSubmit = (values: UploadDocumentFormValues) => {
    mutation.mutate({ title: values.title, file: values.file[0] });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Upload Document</DialogTitle>
          <DialogDescription>
            Upload a file to create a new document note.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Document Title</FormLabel>
                  <FormControl>
                    <Input placeholder="E.g., Project Proposal" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="file"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>File</FormLabel>
                  <FormControl>
                    <Input type="file" {...form.register("file")} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? "Uploading..." : "Upload"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};