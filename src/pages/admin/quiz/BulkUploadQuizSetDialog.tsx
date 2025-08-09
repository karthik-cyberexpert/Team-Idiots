"use client";

import * as React from "react";
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
import { showSuccess, showError } from "@/utils/toast";
import { FileUp, Download } from "lucide-react";
import * as z from "zod";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

const bulkQuestionSchema = z.object({
  question: z.string().min(1, "Question text is required."),
  options: z.array(z.string()).min(2, "At least two options are required."),
  correct_option_index: z.number().int().min(0, "Correct option index must be a non-negative integer."),
});

const bulkUploadSchema = z.array(bulkQuestionSchema).min(1, "You must provide at least 1 question.");

interface BulkUploadQuizSetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  suggestedTitle: string;
}

export const BulkUploadQuizSetDialog = ({ open, onOpenChange, suggestedTitle }: BulkUploadQuizSetDialogProps) => {
  const queryClient = useQueryClient();
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [title, setTitle] = React.useState(suggestedTitle);

  React.useEffect(() => {
    setTitle(suggestedTitle);
  }, [suggestedTitle]);

  const bulkCreateMutation = useMutation({
    mutationFn: async (questions: z.infer<typeof bulkUploadSchema>) => {
      const { error, data } = await supabase.functions.invoke("create-quiz-set", {
        body: { title, questions },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      showSuccess(data.message || "Set uploaded successfully!");
      queryClient.invalidateQueries({ queryKey: ["quizSets"] });
      onOpenChange(false);
    },
    onError: (err: Error) => showError(err.message),
  });

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const content = e.target?.result;
        if (!content) throw new Error("Could not read file content.");
        
        let jsonData;
        const fileName = file.name.toLowerCase();

        if (fileName.endsWith('.json')) {
          jsonData = JSON.parse(content as string);
        } else if (fileName.endsWith('.xlsx')) {
          const workbook = XLSX.read(content, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          jsonData = XLSX.utils.sheet_to_json(worksheet).map((row: any) => ({
            ...row,
            options: JSON.parse(row.options) // Assuming options are stored as a JSON string in the sheet
          }));
        } else {
          throw new Error("Unsupported file type. Please use JSON or XLSX.");
        }

        const validatedData = bulkUploadSchema.parse(jsonData);
        bulkCreateMutation.mutate(validatedData);

      } catch (error: any) {
        showError(`File Error: ${error.message}`);
      } finally {
        if (event.target) event.target.value = "";
      }
    };
    reader.onerror = () => showError("Error reading file.");

    if (fileName.endsWith('.json')) {
      reader.readAsText(file, 'UTF-8');
    } else if (fileName.endsWith('.xlsx')) {
      reader.readAsArrayBuffer(file);
    }
  };

  const templateData = [
    {
      question: "What is the capital of France?",
      options: JSON.stringify(["Paris", "London", "Berlin", "Madrid"]),
      correct_option_index: 0
    },
    {
      question: "Which planet is known as the Red Planet?",
      options: JSON.stringify(["Earth", "Mars", "Jupiter", "Saturn"]),
      correct_option_index: 1
    }
  ];

  const handleDownloadXlsxTemplate = () => {
    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Quiz Questions");
    worksheet['!cols'] = [{ wch: 50 }, { wch: 50 }, { wch: 20 }];
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8' });
    saveAs(data, "quiz_set_template.xlsx");
    showSuccess("XLSX template downloaded!");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Upload Quiz Set</DialogTitle>
          <DialogDescription>
            Upload a JSON or XLSX file with questions. In XLSX, the 'options' column must be a JSON string array.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="set-title">Set Title</Label>
            <Input id="set-title" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Download Template</Label>
            <Button variant="outline" onClick={handleDownloadXlsxTemplate} className="w-full">
              <Download className="mr-2 h-4 w-4" /> XLSX Template
            </Button>
          </div>
          <Button onClick={() => fileInputRef.current?.click()} disabled={bulkCreateMutation.isPending}>
            <FileUp className="mr-2 h-4 w-4" />
            {bulkCreateMutation.isPending ? "Uploading..." : "Select File to Upload"}
          </Button>
          <input type="file" accept=".json,.xlsx" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
        </div>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};