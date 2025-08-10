"use client";

import * as React from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { showSuccess, showError } from "@/utils/toast";
import { StoreItem, StoreSection } from "@/types/store";
import { PowerUpType } from "@/types/auction";
import { PlusCircle, Trash2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

const powerUpTypes: { value: PowerUpType; label: string }[] = [
  { value: '2x_boost', label: '2X Boost' },
  { value: '4x_boost', label: '4X Boost' },
  { value: 'gp_transfer', label: 'GP Siphon' },
  { value: 'attack', label: 'Attack' },
  { value: 'shield', label: 'Shield' },
];

const boxContentSchema = z.object({
  type: z.enum(["gp", "xp", "power_up", "nothing"]),
  amount: z.coerce.number().optional(),
  power: z.string().optional(),
  weight: z.coerce.number().min(1, "Weight must be at least 1."),
});

const formSchema = z.object({
  name: z.string().min(1, "Name is required."),
  description: z.string().optional(),
  price: z.coerce.number().int().min(0, "Price must be non-negative."),
  quantity: z.coerce.number().int().min(1, "Quantity must be at least 1.").default(1),
  item_type: z.enum(["power_up", "xp_pack", "mystery_box", "power_box"]),
  is_active: z.boolean().default(true),
  power_up_type: z.string().optional(),
  xp_amount: z.coerce.number().optional(),
  box_contents: z.array(boxContentSchema).optional(),
  section_id: z.string().uuid().nullable(),
  duration_hours: z.coerce.number().int().min(1).optional().nullable(),
  effect_value: z.coerce.number().int().min(1).optional().nullable(),
  uses: z.coerce.number().int().min(1).optional().nullable(),
});

type FormValues = z.infer<typeof formSchema>;

interface CreateEditItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item?: StoreItem | null;
  sections: StoreSection[];
}

export const CreateEditItemDialog = ({ open, onOpenChange, item, sections }: CreateEditItemDialogProps) => {
  const queryClient = useQueryClient();
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "box_contents",
  });

  const itemType = form.watch("item_type");
  const powerUpType = form.watch("power_up_type");

  React.useEffect(() => {
    if (item) {
      form.reset({
        ...item,
        power_up_type: item.power_up_type || undefined,
        box_contents: item.box_contents || [],
      });
    } else {
      form.reset({
        name: "",
        description: "",
        price: 0,
        quantity: 1,
        item_type: "power_up",
        is_active: true,
        power_up_type: "2x_boost",
        xp_amount: 100,
        box_contents: [],
        section_id: null,
        duration_hours: 24,
        effect_value: 10,
        uses: 1,
      });
    }
  }, [item, open, form]);

  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const functionName = item ? "update-store-item" : "create-store-item";
      const payload = item ? { id: item.id, ...values } : values;
      const { error } = await supabase.functions.invoke(functionName, { body: payload });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      showSuccess(`Item ${item ? 'updated' : 'created'} successfully.`);
      queryClient.invalidateQueries({ queryKey: ["storeManagementData"] });
      onOpenChange(false);
    },
    onError: (err: Error) => showError(err.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{item ? "Edit" : "Create"} Store Item</DialogTitle>
          <DialogDescription>Fill in the details for the store item.</DialogDescription>
        </DialogHeader>
        <div className="flex-grow overflow-y-auto -mr-6 pr-6">
          <Form {...form}>
            <form id="item-form" onSubmit={form.handleSubmit((v) => mutation.mutate(v))} className="space-y-4">
              <FormField control={form.control} name="name" render={({ field }) => <FormItem><FormLabel>Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>} />
              <FormField control={form.control} name="description" render={({ field }) => <FormItem><FormLabel>Description</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>} />
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="price" render={({ field }) => <FormItem><FormLabel>Price (GP)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>} />
                <FormField control={form.control} name="quantity" render={({ field }) => <FormItem><FormLabel>Quantity</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>} />
              </div>
              <FormField control={form.control} name="section_id" render={({ field }) => (
                <FormItem><FormLabel>Section</FormLabel>
                  <Select onValueChange={(value) => field.onChange(value === 'null' ? null : value)} value={field.value || 'null'}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select a section..." /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="null">Uncategorized</SelectItem>
                      {sections.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select><FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="item_type" render={({ field }) => (
                <FormItem><FormLabel>Item Type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="power_up">Power-up</SelectItem>
                      <SelectItem value="xp_pack">XP Pack</SelectItem>
                      <SelectItem value="mystery_box">Mystery Box</SelectItem>
                      <SelectItem value="power_box">Power Box</SelectItem>
                    </SelectContent>
                  </Select><FormMessage />
                </FormItem>
              )} />

              {itemType === 'power_up' && (
                <div className="p-4 border rounded-md space-y-4">
                  <FormField control={form.control} name="power_up_type" render={({ field }) => (
                    <FormItem><FormLabel>Power-up Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>{powerUpTypes.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
                      </Select><FormMessage />
                    </FormItem>
                  )} />
                  {(powerUpType === '2x_boost' || powerUpType === '4x_boost') && (
                    <FormField control={form.control} name="duration_hours" render={({ field }) => <FormItem><FormLabel>Duration (hours)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>} />
                  )}
                  {(powerUpType === 'attack' || powerUpType === 'gp_transfer') && (
                    <FormField control={form.control} name="effect_value" render={({ field }) => <FormItem><FormLabel>Effect Value (%)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>} />
                  )}
                  {powerUpType === 'shield' && (
                    <FormField control={form.control} name="uses" render={({ field }) => <FormItem><FormLabel>Uses</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>} />
                  )}
                </div>
              )}

              {itemType === 'xp_pack' && <FormField control={form.control} name="xp_amount" render={({ field }) => <FormItem><FormLabel>XP Amount</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>} />}

              {(itemType === 'mystery_box' || itemType === 'power_box') && (
                <div className="space-y-4 rounded-lg border p-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-sm font-medium">Box Prize Pool</h3>
                    <Button type="button" size="sm" variant="ghost" onClick={() => append({ type: 'gp', weight: 1 })}><PlusCircle className="mr-2 h-4 w-4" /> Add Prize</Button>
                  </div>
                  <ScrollArea className="h-48">
                    <div className="space-y-4 pr-4">
                      {fields.map((field, index) => (
                        <div key={field.id} className="p-2 border rounded-md space-y-2">
                          <div className="flex justify-end"><Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => remove(index)}><Trash2 className="h-4 w-4 text-destructive" /></Button></div>
                          <div className="grid grid-cols-2 gap-2">
                            <FormField control={form.control} name={`box_contents.${index}.type`} render={({ field }) => (
                              <FormItem><FormLabel>Type</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                  <SelectContent>
                                    <SelectItem value="gp">GP</SelectItem>
                                    <SelectItem value="xp">XP</SelectItem>
                                    <SelectItem value="power_up">Power-up</SelectItem>
                                    <SelectItem value="nothing">Nothing</SelectItem>
                                  </SelectContent>
                                </Select>
                              </FormItem>
                            )} />
                            <FormField control={form.control} name={`box_contents.${index}.weight`} render={({ field }) => <FormItem><FormLabel>Weight</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>} />
                          </div>
                          {form.watch(`box_contents.${index}.type`) === 'power_up' && <FormField control={form.control} name={`box_contents.${index}.power`} render={({ field }) => (
                            <FormItem><FormLabel>Power-up</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                <SelectContent>{powerUpTypes.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
                              </Select>
                            </FormItem>
                          )} />}
                          {(form.watch(`box_contents.${index}.type`) === 'gp' || form.watch(`box_contents.${index}.type`) === 'xp') && <FormField control={form.control} name={`box_contents.${index}.amount`} render={({ field }) => <FormItem><FormLabel>Amount</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>} />}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}
            </form>
          </Form>
        </div>
        <DialogFooter className="flex-shrink-0 pt-4 border-t -mx-6 px-6">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button type="submit" form="item-form" disabled={mutation.isPending}>
            {mutation.isPending ? "Saving..." : "Save Item"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};