"use client";

import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { StoreItem, StoreSection } from "@/types/store";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { GripVertical, Edit, Trash2, Save } from "lucide-react";
import { showSuccess, showError } from "@/utils/toast";

interface ItemReorderManagerProps {
  sections: StoreSection[];
  items: StoreItem[];
  onEdit: (item: StoreItem) => void;
  onDelete: (item: StoreItem) => void;
}

export const ItemReorderManager = ({ sections, items, onEdit, onDelete }: ItemReorderManagerProps) => {
  const queryClient = useQueryClient();
  const [localSections, setLocalSections] = React.useState<StoreSection[]>([]);
  const [localItems, setLocalItems] = React.useState<Record<string, StoreItem[]>>({});
  const [hasChanges, setHasChanges] = React.useState(false);
  const dragItem = React.useRef<{ item: StoreItem; fromSectionId: string } | null>(null);

  React.useEffect(() => {
    const sortedSections = [...sections].sort((a, b) => a.position - b.position);
    const itemsBySection: Record<string, StoreItem[]> = { 'uncategorized': [] };
    sortedSections.forEach(s => itemsBySection[s.id] = []);

    items.forEach(item => {
      const sectionId = item.section_id || 'uncategorized';
      if (!itemsBySection[sectionId]) {
        itemsBySection[sectionId] = [];
      }
      itemsBySection[sectionId].push(item);
    });

    Object.keys(itemsBySection).forEach(key => {
      itemsBySection[key].sort((a, b) => a.position - b.position);
    });

    setLocalSections(sortedSections);
    setLocalItems(itemsBySection);
    setHasChanges(false);
  }, [items, sections]);

  const orderMutation = useMutation({
    mutationFn: async (itemsToUpdate: { id: string; position: number; section_id: string | null }[]) => {
      const { error } = await supabase.functions.invoke("update-store-items-order", { body: { items: itemsToUpdate } });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      showSuccess("Item order saved!");
      queryClient.invalidateQueries({ queryKey: ["storeManagementData"] });
      setHasChanges(false);
    },
    onError: (err: Error) => showError(err.message),
  });

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, item: StoreItem, fromSectionId: string) => {
    dragItem.current = { item, fromSectionId };
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, toSectionId: string, toPosition: number) => {
    e.preventDefault();
    if (!dragItem.current) return;

    const { item: draggedItem, fromSectionId } = dragItem.current;

    setLocalItems(prev => {
      const newItems = JSON.parse(JSON.stringify(prev));
      
      const sourceItems = newItems[fromSectionId].filter((i: StoreItem) => i.id !== draggedItem.id);
      newItems[fromSectionId] = sourceItems;

      const targetItems = newItems[toSectionId] || [];
      targetItems.splice(toPosition, 0, draggedItem);
      newItems[toSectionId] = targetItems;
      
      return newItems;
    });

    setHasChanges(true);
    dragItem.current = null;
  };

  const handleSaveOrder = () => {
    const itemsToUpdate: { id: string; position: number; section_id: string | null }[] = [];
    Object.entries(localItems).forEach(([sectionId, itemsInSection]) => {
      itemsInSection.forEach((item, index) => {
        itemsToUpdate.push({
          id: item.id,
          position: index,
          section_id: sectionId === 'uncategorized' ? null : sectionId,
        });
      });
    });
    orderMutation.mutate(itemsToUpdate);
  };

  const renderSection = (sectionId: string, title: string) => {
    const sectionItems = localItems[sectionId] || [];
    return (
      <div key={sectionId}>
        <h2 className="text-xl font-semibold mb-4">{title}</h2>
        <div 
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => handleDrop(e, sectionId, sectionItems.length)}
        >
          {sectionItems.length > 0 ? (
            sectionItems.map((item, index) => (
              <div
                key={item.id}
                draggable
                onDragStart={(e) => handleDragStart(e, item, sectionId)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => handleDrop(e, sectionId, index)}
                className="cursor-grab"
              >
                <Card className="flex flex-col h-full">
                  <CardHeader className="flex-row items-start gap-2 space-y-0">
                    <GripVertical className="h-5 w-5 text-muted-foreground mt-1" />
                    <div className="flex-grow">
                      <CardTitle>{item.name}</CardTitle>
                      <CardDescription>{item.price} GP</CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent className="flex-grow" />
                  <CardFooter className="flex justify-end gap-2">
                    <Button variant="ghost" size="sm" onClick={() => onEdit(item)}><Edit className="h-4 w-4 mr-2" /> Edit</Button>
                    <Button variant="ghost" size="sm" className="text-destructive" onClick={() => onDelete(item)}><Trash2 className="h-4 w-4 mr-2" /> Delete</Button>
                  </CardFooter>
                </Card>
              </div>
            ))
          ) : (
            <div className="col-span-full h-24 border-2 border-dashed rounded-md flex items-center justify-center text-muted-foreground">
              Drop items here
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader className="flex-row justify-between items-center">
        <div>
          <CardTitle>Reorder Items</CardTitle>
          <CardDescription>Drag and drop items to change their order and section.</CardDescription>
        </div>
        {hasChanges && (
          <Button onClick={handleSaveOrder} disabled={orderMutation.isPending}>
            <Save className="mr-2 h-4 w-4" />
            {orderMutation.isPending ? "Saving..." : "Save Order"}
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-8">
        {localSections.map(section => renderSection(section.id, section.name))}
        {renderSection('uncategorized', 'Uncategorized')}
      </CardContent>
    </Card>
  );
};