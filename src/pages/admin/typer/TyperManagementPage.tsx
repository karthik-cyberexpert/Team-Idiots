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
import { Terminal, FileUp, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { showSuccess, showError } from "@/utils/toast";
import { EditTypingTextDialog } from "./EditTypingTextDialog";
import { PaginationState } from "@tanstack/react-table";
import * as z from "zod";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

const addFormSchema = z.object({
  title: z.string().min(1, { message: "Title is required." }).max(100, { message: "Title must be 100 characters or less." }),
  content: z.string().min(10, { message: "Content must be at least 10 characters." }),
});

type AddTypingTextFormValues = z.infer<typeof addFormSchema>;

const fetchTypingTexts = async (): Promise<TypingText[]> => {
  const { data, error } = await supabase.functions.invoke("get-typing-texts");
  if (error) {
    throw new Error(`Failed to fetch typing texts: ${error.message}`);
  }
  return data.data || [];
};

const deleteTypingText = async (id: string) => {
  const { data, error } = await supabase.functions.invoke("delete-typing-text", {
    body: { id },
  });
  if (error) {
    throw new Error(`Failed to delete typing text: ${error.message}`);
  }
  if (data && data.error) {
    throw new Error(`Failed to delete typing text: ${data.error}`);
  }
};

const createTypingText = async (values: AddTypingTextFormValues) => {
  const { data, error } = await supabase.functions.invoke("create-typing-text", {
    body: values,
  });
  if (error) {
    throw new Error(`Failed to create typing text: ${error.message}`);
  }
  if (data && data.error) {
    throw new Error(`Failed to create typing text: ${data.error}`);
  }
};

const TyperManagementPage = () => {
  const queryClient = useQueryClient();
  const [textToDelete, setTextToDelete] = React.useState<string | null>(null);
  const [textToEdit, setTextToEdit] = React.useState<TypingText | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const [pagination, setPagination] = React.useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });

  const { data: typingTexts, isLoading, error } = useQuery<TypingText[]>({
    queryKey: ["typingTexts"],
    queryFn: fetchTypingTexts,
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

  const bulkCreateMutation = useMutation({
    mutationFn: async (texts: { header: string; code: string }[]) => {
      const { error, data } = await supabase.functions.invoke("bulk-create-typing-texts", {
        body: texts,
      });
      if (error) throw new Error(error.message);
      if (data && data.error) {
        throw new Error(`Failed to bulk create typing texts: ${data.error}`);
      }
      return data;
    },
    onSuccess: (data) => {
      showSuccess(data.message || "Texts uploaded successfully!");
      queryClient.invalidateQueries({ queryKey: ["typingTexts"] });
    },
    onError: (err: Error) => {
      showError(err.message);
    },
  });

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result;
        if (typeof content !== 'string') {
          showError("Could not read file content.");
          return;
        }
        const jsonData = JSON.parse(content);
        if (!Array.isArray(jsonData) || !jsonData.every(item => typeof item.title === 'string' && typeof item.content === 'string')) {
          showError("Invalid JSON format. Expected an array of objects with 'title' and 'content' keys.");
          return;
        }

        bulkCreateMutation.mutate(jsonData.map(item => ({ header: item.title, code: item.content })));

      } catch (error) {
        showError("Failed to parse JSON file. Please ensure it's a valid JSON.");
      } finally {
        if (event.target) {
          event.target.value = "";
        }
      }
    };
    reader.onerror = () => {
      showError("Error reading file.");
    };
    reader.readAsText(file);
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleDownloadTemplate = (format: 'json' | 'csv' | 'xlsx') => {
    const templateData = [
      { header: "Example Title 1", code: "console.log('Hello, World!');" },
      { header: "Example Title 2", code: "function sum(a, b) { return a + b; }" },
    ];

    if (format === 'json') {
      const jsonString = JSON.stringify(templateData, null, 2);
      const blob = new Blob([jsonString], { type: "application/json" });
      saveAs(blob, "typing_texts_template.json");
    } else if (format === 'csv') {
      const csvContent = "header,code\n" + templateData.map(e => `"${e.header.replace(/"/g, '""')}","${e.code.replace(/"/g, '""')}"`).join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      saveAs(blob, "typing_texts_template.csv");
    } else if (format === 'xlsx') {
      const ws = XLSX.utils.json_to_sheet(templateData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Typing Texts");
      const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([wbout], { type: 'application/octet-stream' });
      saveAs(blob, "typing_texts_template.xlsx");
    }
    showSuccess(`Typing texts template downloaded as ${format.toUpperCase()}!`);
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
          <Button disabled>Upload File</Button>
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
          <div className="flex gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="transform transition-transform-shadow duration-200 ease-in-out hover:scale-[1.02] hover:shadow-md active:scale-95">
                  <Download className="mr-2 h-4 w-4" />
                  Download Template
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Download as</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleDownloadTemplate('json')}>JSON</DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleDownloadTemplate('csv')}>CSV</DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleDownloadTemplate('xlsx')}>XLSX</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button onClick={handleUploadClick} disabled={bulkCreateMutation.isPending} className="transform transition-transform-shadow duration-200 ease-in-out hover:scale-[1.02] hover:shadow-md active:scale-95">
              <FileUp className="mr-2 h-4 w-4" />
              {bulkCreateMutation.isPending ? "Uploading..." : "Upload File"}
            </Button>
            <input type="file" accept=".json" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
          </div>
        </div>

        <DataTable 
          columns={columns} 
          data={typingTexts || []}
          pageCount={Math.ceil((typingTexts?.length || 0) / pagination.pageSize)}
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