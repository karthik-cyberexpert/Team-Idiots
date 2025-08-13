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
import { PlusCircle, Trash2, CalendarIcon } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { TimePicker } from "@/components/ui/time-picker";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

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
  discount_percentage: z.coerce.number().int().min(0).max(100).optional().nullable(),
  offer_start_date: z.date().optional().nullable(),
  offer_start_time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, { message: "Invalid time format." }).optional().or(z.literal('')),
  offer_end_date: z.date().optional().nullable(),
  offer_end_time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, { message: "Invalid time format." }).optional().or(z.literal('')),
}).superRefine((data, ctx) => {
  // If a discount is set, start and end dates are required. Time is optional.
  if ((data.discount_percentage || 0) > 0) {
    if (!data.offer_start_date) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Start date is required for an offer.", path: ["offer_start_date"] });
    }
    if (!data.offer_end_date) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "End date is required for an offer.", path: ["offer_end_date"] });
    }
  }

  // If dates are set, ensure end is after start.
  if (data.offer_start_date && data.offer_end_date) {
    const startH = data.offer_start_time ? parseInt(data.offer_start_time.split(':')[0]) : 0;
    const startM = data.offer_start_time ? parseInt(data.offer_start_time.split(':')[1]) : 0;
    const start = new Date(data.offer_start_date);
    start.setHours(startH, startM, 0, 0);

    const endH = data.offer_end_time ? parseInt(data.offer_end_time.split(':')[0]) : 23;
    const endM = data.offer_end_time ? parseInt(data.offer_end_time.split(':')[1]) : 59;
    const end = new Date(data.offer_end_date);
    end.setHours(endH, endM, 59, 999);

    if (start >= end) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "End date/time must be after start date/time.", path: ["offer_end_date"] });
    }
  }
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
    if (open) {
      if (item) {
        form.reset({
          ...item,
          power_up_type: item.power_up_type || undefined,
          box_contents: item.box_contents || [],
          offer_start_date: item.offer_start_time ? new Date(item.offer_start_time) : null,
          offer_start_time: item.offer_start_time ? format(new Date(item.offer_start_time), "HH:mm") : "",
          offer_end_date: item.offer_end_time ? new Date(item.offer_end_time) : null,
          offer_end_time: item.offer_end_time ? format(new Date(item.offer_end_time), "HH:mm") : "",
        });
      } else {
        form.reset({
          name: "", description: "", price: 0, quantity: 1, item_type: "power_up", is_active: true,
          power_up_type: "2x_boost", xp_amount: 100, box_contents: [], section_id: null,
          duration_hours: 24, effect_value: 10, uses: 1, discount_percentage: 0,
          offer_start_date: null, offer_start_time: "", offer_end_date: null, offer_end_time: "",
        });
      }
    }
  }, [item, open, form]);

  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const { offer_start_date, offer_start_time, offer_end_date, offer_end_time, ...rest } = values;
      
      const getIsoString = (date?: Date | null, time?: string, defaultTime?: 'start' | 'end') => {
        if (!date) return null;
        const d = new Date(date);
        if (time) {
          const [h, m] = time.split(':').map(Number);
          d.setHours(h, m, 0, 0);
        } else if (defaultTime === 'start') {
          d.setHours(0, 0, 0, 0);
        } else if (defaultTime === 'end') {
          d.setHours(23, 59, 59, 999);
        }
        return d.toISOString();
      };

      const payload = {
        ...rest,
        offer_start_time: getIsoString(offer_start_date, offer_start_time, 'start'),
        offer_end_time: getIsoString(offer_end_date, offer_end_time, 'end'),
      };

      const functionName = item ? "update-store-item" : "create-store-item";
      const finalPayload = item ? { id: item.id, ...payload } : payload;
      const { error } = await supabase.functions.invoke(functionName, { body: finalPayload });
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
        <DialogHeader><DialogTitle>{item ? "Edit" : "Create"} Store Item</DialogTitle><DialogDescription>Fill in the details for the store item.</DialogDescription></DialogHeader>
        <div className="flex-grow overflow-y-auto -mr-6 pr-6">
          <Form {...form}>
            <form id="item-form" onSubmit={form.handleSubmit((v) => mutation.mutate(v))} className="space-y-4">
              {/* ... existing form fields ... */}
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

              <Collapsible>
                <CollapsibleTrigger asChild><Button variant="link" className="p-0">Offer Details</Button></CollapsibleTrigger>
                <CollapsibleContent className="space-y-4 pt-4">
                  <FormField control={form.control} name="discount_percentage" render={({ field }) => <FormItem><FormLabel>Discount (%)</FormLabel><FormControl><Input type="number" min="0" max="100" {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>} />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="offer_start_date" render={({ field }) => <FormItem><FormLabel>Start Date</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant="outline" className={cn("w-full", !field.value && "text-muted-foreground")}>{field.value ? format(field.value, "PPP") : <span>Pick a date</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value || undefined} onSelect={field.onChange} /></PopoverContent></Popover><FormMessage /></FormItem>} />
                    <FormField control={form.control} name="offer_start_time" render={({ field }) => <FormItem><FormLabel>Start Time</FormLabel><FormControl><TimePicker value={field.value} onChange={field.onChange} /></FormControl><FormMessage /></FormItem>} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="offer_end_date" render={({ field }) => <FormItem><FormLabel>End Date</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant="outline" className={cn("w-full", !field.value && "text-muted-foreground")}>{field.value ? format(field.value, "PPP") : <span>Pick a date</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value || undefined} onSelect={field.onChange} /></PopoverContent></Popover><FormMessage /></FormItem>} />
                    <FormField control={form.control} name="offer_end_time" render={({ field }) => <FormItem><FormLabel>End Time</FormLabel><FormControl><TimePicker value={field.value} onChange={field.onChange} /></FormControl><FormMessage /></FormItem>} />
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </form>
          </Form>
        </div>
        <DialogFooter className="flex-shrink-0 pt-4 border-t -mx-6 px-6">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button type="submit" form="item-form" disabled={mutation.isPending}>{mutation.isPending ? "Saving..." : "Save Item"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};