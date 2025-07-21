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
import { CodeDocument } from "@/types/codeDocument";
import { useAuth } from "@/contexts/AuthProvider"; // Import useAuth

const formSchema = z.object({
  title: z.string().min(1, { message: "Title is required." }),
  content: z.string().optional(),
});

type CodeDocumentFormValues = z.infer<typeof formSchema>;

const createCodeDocument = async (values: CodeDocumentFormValues) => {
  const { data, error } = await supabase.functions.invoke("create-code-document", {
    body: values,
  });
  if (error) throw new Error(error.message);
  if (data.error) throw new Error(data.error);
  return data;
};

const updateCodeDocument = async (id: string, values: CodeDocumentFormValues) => {
  const { data, error } = await supabase.functions.invoke("update-code-document", {
    body: { id, ...values },
  });
  if (error) throw new Error(error.message);
  if (data.error) throw new Error(data.error);
  return data;
};

interface CodeEditorProps {
  document: CodeDocument | null; // null for new document
  onBack: () => void;
}

export const CodeEditor = ({ document, onBack }: CodeEditorProps) => {
  const queryClient = useQueryClient();
  const { user, profile } = useAuth(); // Get user and profile

  const form = useForm<CodeDocumentFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: document?.title || "",
      content: document?.content || "",
    },
  });

  React.useEffect(() => {
    form.reset({
      title: document?.title || "",
      content: document?.content || "",
    });
  }, [document, form]);

  const createMutation = useMutation({
    mutationFn: createCodeDocument,
    onMutate: async (newDocData) => {
      await queryClient.cancelQueries({ queryKey: ["codeDocuments"] });
      const previousDocs = queryClient.getQueryData<CodeDocument[]>(["codeDocuments"]);

      const optimisticDoc: CodeDocument = {
        id: `optimistic-${Date.now()}`, // Temporary ID
        title: newDocData.title,
        content: newDocData.content || "",
        user_id: user!.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        profiles: { full_name: profile?.full_name || "You" },
      };

      queryClient.setQueryData<CodeDocument[]>(["codeDocuments"], (old) =>
        old ? [optimisticDoc, ...old] : [optimisticDoc]
      );

      onBack(); // Navigate back immediately
      return { previousDocs };
    },
    onSuccess: () => {
      showSuccess("Code document created successfully.");
    },
    onError: (err, newDocData, context) => {
      showError(err.message);
      queryClient.setQueryData(["codeDocuments"], context?.previousDocs); // Rollback
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["codeDocuments"] }); // Ensure fresh data
    },
  });

  const updateMutation = useMutation({
    mutationFn: (values: CodeDocumentFormValues) => updateCodeDocument(document!.id, values),
    onMutate: async (updatedDocData) => {
      await queryClient.cancelQueries({ queryKey: ["codeDocuments"] });
      const previousDocs = queryClient.getQueryData<CodeDocument[]>(["codeDocuments"]);

      queryClient.setQueryData<CodeDocument[]>(["codeDocuments"], (old) =>
        old?.map((doc) =>
          doc.id === document!.id
            ? {
                ...doc,
                title: updatedDocData.title,
                content: updatedDocData.content || "",
                updated_at: new Date().toISOString(),
              }
            : doc
        )
      );

      onBack(); // Navigate back immediately
      return { previousDocs };
    },
    onSuccess: () => {
      showSuccess("Code document updated successfully.");
    },
    onError: (err, updatedDocData, context) => {
      showError(err.message);
      queryClient.setQueryData(["codeDocuments"], context?.previousDocs); // Rollback
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["codeDocuments"] }); // Ensure fresh data
    },
  });

  const onSubmit = (values: CodeDocumentFormValues) => {
    if (document) {
      updateMutation.mutate(values);
    } else {
      createMutation.mutate(values);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h2 className="text-2xl font-bold">{document ? "Edit Code Document" : "Create New Code Document"}</h2>
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
                  <Input placeholder="My awesome code snippet" {...field} />
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
                <FormLabel>Code Content</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Write your code here..."
                    rows={15}
                    className="font-mono text-sm"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
            {document ? (updateMutation.isPending ? "Saving..." : "Save Changes") : (createMutation.isPending ? "Creating..." : "Create Document")}
          </Button>
        </form>
      </Form>
    </div>
  );
};