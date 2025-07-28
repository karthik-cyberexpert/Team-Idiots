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

const formSchema = z.object({
  title: z.string().min(1, { message: "Title is required." }).max(100, { message: "Title must be 100 characters or less." }),
  content: z.string().min(10, { message: "Content must be at least 10 characters." }),
});

type AddTypingTextFormValues = z.infer<typeof formSchema>;

const createTypingText = async (values: AddTypingTextFormValues) => {
  const { error } = await supabase.functions.invoke("create-typing-text", {
    body: values,
  });
  if (error) {
    throw new Error(`Failed to create typing text: ${error.message}`);
  }
};

interface AddTypingTextDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const AddTypingTextDialog = ({ open, onOpenChange }: AddTypingTextDialogProps) => {
  const queryClient = useQueryClient();
  const form = useForm<AddTypingTextFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      content: "",
    },
  });

  React.useEffect(() => {
    if (!open) {
      form.reset();
    }
  }, [open, form]);

  const mutation = useMutation({
    mutationFn: createTypingText,
    onSuccess: () => {
      showSuccess("Typing text added successfully.");
      queryClient.invalidateQueries({ queryKey: ["typingTexts"] });
      onOpenChange(false);
    },
    onError: (err) => {
      showError(err.message);
    },
  });

  const onSubmit = (values: AddTypingTextFormValues) => {
    mutation.mutate(values);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-vibrant-blue dark:text-vibrant-pink">Add New Typing Text</DialogTitle>
          <DialogDescription>
            Enter the title and the code snippet for the new typing practice.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., React Component Example" {...field} />
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
                      placeholder={`function MyComponent() {\n  return (\n    <div>Hello World</div>\n  );\n}`}
                      rows={10}
                      className="font-mono"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Enter the code snippet here. Users will type this exact content.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? "Adding..." : "Add Text"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};