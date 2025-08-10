"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StoreSection } from "@/types/store";
import { showSuccess, showError } from "@/utils/toast";
import { GripVertical, PlusCircle } from "lucide-react";

const createSection = async (name: string) => {
  const { error } = await supabase.functions.invoke("create-store-section", { body: { name } });
  if (error) throw new Error(error.message);
};

const updateSectionOrder = async (orderedIds: string[]) => {
  const { error } = await supabase.functions.invoke("update-store-sections-order", { body: { orderedIds } });
  if (error) throw new Error(error.message);
};

interface SectionManagerProps {
  sections: StoreSection[];
}

export const SectionManager = ({ sections: initialSections }: SectionManagerProps) => {
  const queryClient = useQueryClient();
  const [newSectionName, setNewSectionName] = React.useState("");
  const [sections, setSections] = React.useState(initialSections);
  const dragItem = React.useRef<number | null>(null);
  const dragOverItem = React.useRef<number | null>(null);

  React.useEffect(() => {
    setSections(initialSections);
  }, [initialSections]);

  const createMutation = useMutation({
    mutationFn: createSection,
    onSuccess: () => {
      showSuccess("Section created!");
      queryClient.invalidateQueries({ queryKey: ["storeManagementData"] });
      setNewSectionName("");
    },
    onError: (err: Error) => showError(err.message),
  });

  const orderMutation = useMutation({
    mutationFn: updateSectionOrder,
    onSuccess: () => {
      showSuccess("Section order saved!");
      queryClient.invalidateQueries({ queryKey: ["storeManagementData"] });
    },
    onError: (err: Error) => {
      showError(err.message);
      setSections(initialSections); // Revert on error
    },
  });

  const handleDragEnd = () => {
    const newOrderedIds = sections.map(s => s.id);
    orderMutation.mutate(newOrderedIds);
    dragItem.current = null;
    dragOverItem.current = null;
  };

  const handleDragSort = () => {
    if (dragItem.current === null || dragOverItem.current === null) return;
    const newSections = [...sections];
    const draggedItemContent = newSections.splice(dragItem.current, 1)[0];
    newSections.splice(dragOverItem.current, 0, draggedItemContent);
    setSections(newSections);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Manage Sections</CardTitle>
        <CardDescription>Create and reorder the sections for the store page.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          {sections.map((section, index) => (
            <div
              key={section.id}
              draggable
              onDragStart={() => (dragItem.current = index)}
              onDragEnter={() => (dragOverItem.current = index)}
              onDragEnd={handleDragEnd}
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDragSort}
              className="flex items-center gap-2 p-2 bg-muted/50 rounded-md cursor-grab"
            >
              <GripVertical className="h-5 w-5 text-muted-foreground" />
              <span>{section.name}</span>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            placeholder="New section name..."
            value={newSectionName}
            onChange={(e) => setNewSectionName(e.target.value)}
          />
          <Button onClick={() => createMutation.mutate(newSectionName)} disabled={!newSectionName || createMutation.isPending}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Create
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};