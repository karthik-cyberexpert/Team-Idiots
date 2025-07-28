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
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { showSuccess, showError } from "@/utils/toast";
import { TypingText } from "@/types/typing-text";

const formSchema = z.object({
  title: z.string().min(1, { message: "Title is required." }).max(100, { message: "Title must be 100 characters or less." }),
  content: z.string().min(10, { message: "Content must be at least 10 characters." }),
});

type EditTypingTextFormValues = z.infer<typeof formSchema>;

const updateTypingText = async (values: EditTypingTextFormValues & { id: string }) => {
  const { error } = await supabase.functions.invoke("update-typing-text", {
    body: values,
  });
  if (error) {
    throw new Error(`Failed to update typing text: ${error.message}`);
  }
};

interface EditTypingTextDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  typingText: TypingText | null;
}

export const EditTypingTextDialog = ({ open, onOpenChange, typingText }: EditTypingTextDialogProps) => {
  const queryClient = useQueryClient();
  const form = useForm<EditTypingTextFormValues>({
    resolver: zodResolver(formSchema),
  });

  React.useEffect(() => {
    if (typingText) {
      form.reset({
        title: typingText.title,
        content: typingText.content,
      });
    }
  }, [typingText, form]);

  const mutation = useMutation({
    mutationFn: updateTypingText,
    onSuccess: () => {
      showSuccess("Typing text updated successfully.");
      queryClient.invalidateQueries({ queryKey: ["typingTexts"] });
      onOpenChange(false);
    },
    onError: (err) => {
      showError(err.message);
    },
  });

  const onSubmit = (values: EditTypingTextFormValues) => {
    if (!typingText) return;
    mutation.mutate({ ...values, id: typingText.id });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-vibrant-blue dark:text-vibrant-pink">Edit Typing Text</DialogTitle>
          <DialogDescription>
            Make changes to the typing text below.
          </DialogDescription>
        </DialogHeader>
        {typingText && (
          <Form {...form}>
            <form className="space-y-4">
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
                <Button type="button" onClick={form.handleSubmit(onSubmit)} disabled={mutation.isPending}>
                  {mutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
};