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

const bulkTextSchema = z.object({
  header: z.string().min(1, "Header is required."),
  code: z.string().min(1, "Code is required."),
});

const bulkUploadSchema = z.array(bulkTextSchema).length(7, "You must provide exactly 7 texts.");

interface BulkUploadTyperSetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  suggestedTitle: string;
}

export const BulkUploadTyperSetDialog = ({ open, onOpenChange, suggestedTitle }: BulkUploadTyperSetDialogProps) => {
  const queryClient = useQueryClient();
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [title, setTitle] = React.useState(suggestedTitle);

  React.useEffect(() => {
    setTitle(suggestedTitle);
  }, [suggestedTitle]);

  const bulkCreateMutation = useMutation({
    mutationFn: async (texts: z.infer<typeof bulkUploadSchema>) => {
      const { error, data } = await supabase.functions.invoke("create-typer-set", {
        body: { title, texts },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      showSuccess(data.message || "Set uploaded successfully!");
      queryClient.invalidateQueries({ queryKey: ["typerSets"] });
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
        if (file.name.endsWith('.json')) {
          jsonData = JSON.parse(content as string);
        } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.csv')) {
          const workbook = XLSX.read(content, { type: 'binary' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          jsonData = XLSX.utils.sheet_to_json(worksheet);
        } else {
          throw new Error("Unsupported file type. Please use JSON, CSV, or XLSX.");
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
    reader.readAsBinaryString(file);
  };

  const templateData = Array.from({ length: 7 }, (_, i) => ({
    header: `Example Title ${i + 1}`,
    code: `// Code for text ${i + 1}\nfunction example() {\n  return "Hello, World!";\n}`,
  }));

  const handleDownloadJsonTemplate = () => {
    const jsonString = JSON.stringify(templateData, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    saveAs(blob, "weekly_typer_set_template.json");
    showSuccess("JSON template downloaded!");
  };

  const handleDownloadXlsxTemplate = () => {
    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Weekly Set");
    // Adjust column widths
    worksheet['!cols'] = [{ wch: 30 }, { wch: 80 }];
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8' });
    saveAs(data, "weekly_typer_set_template.xlsx");
    showSuccess("XLSX template downloaded!");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Upload Weekly Typer Set</DialogTitle>
          <DialogDescription>
            Upload a JSON, CSV, or XLSX file containing exactly 7 typing texts.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="set-title">Set Title</Label>
            <Input id="set-title" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Download Template</Label>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleDownloadJsonTemplate} className="flex-1">
                <Download className="mr-2 h-4 w-4" /> JSON
              </Button>
              <Button variant="outline" onClick={handleDownloadXlsxTemplate} className="flex-1">
                <Download className="mr-2 h-4 w-4" /> XLSX
              </Button>
            </div>
          </div>
          <Button onClick={() => fileInputRef.current?.click()} disabled={bulkCreateMutation.isPending}>
            <FileUp className="mr-2 h-4 w-4" />
            {bulkCreateMutation.isPending ? "Uploading..." : "Select File to Upload"}
          </Button>
          <input type="file" accept=".json,.csv,.xlsx" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
        </div>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};