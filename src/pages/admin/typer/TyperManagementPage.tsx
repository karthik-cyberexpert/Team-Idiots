"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getColumns } from "./columns";
import { DataTable } from "@/components/ui/data-table";
import { TypingText } from "@/types/typing-text";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Terminal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { showSuccess, showError } from "@/utils/toast";
import { EditTypingTextDialog } from "./EditTypingTextDialog";
import { PaginationState } from "@tanstack/react-table";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const formSchema = z.object({
  title: z.string().min(1, { message: "Title is required." }).max(100, { message: "Title must be 100 characters or less." }),
  content: z.string().min(10, { message: "Content must be at least 10 characters." }),
});

type AddTypingTextFormValues = z.infer<typeof formSchema>;

const fetchTypingTexts = async (): Promise<TypingText[]> => {
  const { data, error } = await supabase.functions.invoke("get-typing-texts");
  if (error) {
    throw new Error(`Failed to fetch typing texts: ${error.message}`);
  }
  return data.data || [];
};

const deleteTypingText = async (id: string) => {
  const { error } = await supabase.functions.invoke("delete-typing-text", {
    body: { id },
  });
  if (error) {
    throw new Error(`Failed to delete typing text: ${error.message}`);
  }
};

const createTypingText = async (values: AddTypingTextFormValues) => {
  const { error } = await supabase.functions.invoke("create-typing-text", {
    body: values,
  });
  if (error) {
    throw new Error(`Failed to create typing text: ${error.message}`);
  }
};

const TyperManagementPage = () => {
  const queryClient = useQueryClient();
  const [textToDelete, setTextToDelete] = React.useState<string | null>(null);
  const [textToEdit, setTextToEdit] = React.useState<TypingText | null>(null);
  const [showAddForm, setShowAddForm] = React.useState(false);
  const [pagination, setPagination] = React.useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });

  const { data: typingTexts, isLoading, error } = useQuery<TypingText[]>({
    queryKey: ["typingTexts"],
    queryFn: fetchTypingTexts,
  });

  const form = useForm<AddTypingTextFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      content: "",
    },
  });

  React.useEffect(() => {
    const channel = supabase
      .channel('typing-texts-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'typing_texts' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['typingTexts'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const deleteMutation = useMutation({
    mutationFn: deleteTypingText,
    onSuccess: () => {
      showSuccess("Typing text deleted successfully.");
      queryClient.invalidateQueries({ queryKey: ["typingTexts"] });
      setTextToDelete(null);
    },
    onError: (err) => {
      showError(err.message);
      setTextToDelete(null);
    },
  });

  const createMutation = useMutation({
    mutationFn: createTypingText,
    onSuccess: () => {
      showSuccess("Typing text added successfully.");
      queryClient.invalidateQueries({ queryKey: ["typingTexts"] });
      setShowAddForm(false);
      form.reset();
    },
    onError: (err) => {
      showError(err.message);
    },
  });

  const onSubmit = (values: AddTypingTextFormValues) => {
    createMutation.mutate(values);
  };

  const handleDeleteRequest = React.useCallback((id: string) => {
    setTextToDelete(id);
  }, []);

  const handleEditRequest = React.useCallback((text: TypingText) => {
    setTextToEdit(text);
  }, []);

  const columns = React.useMemo(() => getColumns(handleDeleteRequest, handleEditRequest), [handleDeleteRequest, handleEditRequest]);

  if (isLoading) {
    return (
      <div>
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl sm:text-3xl font-bold">Typer Management</h1>
          <Button disabled>Add New Text</Button>
        </div>
        <div className="space-y-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <Terminal className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error.message}</AlertDescription>
      </Alert>
    );
  }

  return (
    <>
      <EditTypingTextDialog open={!!textToEdit} onOpenChange={() => setTextToEdit(null)} typingText={textToEdit} />
      <div>
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl sm:text-3xl font-bold text-vibrant-blue dark:text-vibrant-pink">Typer Management</h1>
          {!showAddForm && (
            <Button onClick={() => setShowAddForm(true)}>Add New Text</Button>
          )}
        </div>

        {showAddForm && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Add New Typing Text</CardTitle>
            </CardHeader>
            <CardContent>
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
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="ghost" onClick={() => setShowAddForm(false)}>Cancel</Button>
                    <Button type="button" onClick={form.handleSubmit(onSubmit)} disabled={createMutation.isPending}>
                      {createMutation.isPending ? "Adding..." : "Add Text"}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        )}

        <DataTable 
          columns={columns} 
          data={typingTexts || []}
          pagination={pagination}
          setPagination={setPagination}
          filterColumn="title"
          filterPlaceholder="Filter by title..."
        />
      </div>

      <AlertDialog open={!!textToDelete} onOpenChange={() => setTextToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the typing text.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => textToDelete && deleteMutation.mutate(textToDelete)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting..." : "Continue"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default TyperManagementPage;