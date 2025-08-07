"use client";

import * as React from "react";
import { useForm, useFieldArray } from "react-hook-form";
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
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { PowerUpType } from "@/types/auction";

const mysteryBoxContentSchema = z.object({
  type: z.enum(["gp", "xp", "nothing"]),
  amount: z.coerce.number().int("Amount must be a whole number."),
});

const powerUpTypes: { value: PowerUpType; label: string }[] = [
  { value: '2x_boost', label: '2X XP & GP Boost (24h)' },
  { value: '4x_boost', label: '4X XP & GP Boost (24h)' },
  { value: 'gp_transfer', label: 'GP Transfer' },
  { value: 'attack', label: 'Attack (10% GP)' },
  { value: 'shield', label: 'Shield (1 use)' },
  { value: 'nothing', label: 'You get nothing 😝' },
];

const formSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  starting_price: z.coerce.number().int().min(0, "Starting price must be non-negative."),
  is_mystery_box: z.boolean().default(false),
  is_power_box: z.boolean().default(false),
  mystery_box_contents: z.array(mysteryBoxContentSchema).optional(),
  power_box_contents: z.array(z.string()).optional(),
}).superRefine((data, ctx) => {
  if (data.is_mystery_box && data.is_power_box) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "An item cannot be both a Mystery Box and a Power Box.", path: ["is_power_box"] });
  }
  if (data.is_mystery_box) {
    if (!data.mystery_box_contents || data.mystery_box_contents.length !== 3) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "A mystery box must have exactly 3 prize options.", path: ["mystery_box_contents"] });
    }
  }
  if (data.is_power_box) {
    if (!data.power_box_contents || data.power_box_contents.length !== 3) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "A power box must have exactly 3 power options.", path: ["power_box_contents"] });
    }
  }
  if (!data.is_mystery_box && !data.is_power_box) {
    if (!data.name || data.name.trim().length < 1) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Name is required for a standard item.", path: ["name"] });
    }
  }
});

type FormValues = z.infer<typeof formSchema>;

const createAuctionItem = async (values: FormValues) => {
  const { error } = await supabase.functions.invoke("create-auction-item", { body: values });
  if (error) throw new Error(error.message);
};

interface CreateItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isMystery?: boolean;
}

export const CreateItemDialog = ({ open, onOpenChange, isMystery = false }: CreateItemDialogProps) => {
  const queryClient = useQueryClient();
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
      starting_price: 0,
      is_mystery_box: isMystery,
      is_power_box: false,
      mystery_box_contents: [
        { type: "gp", amount: 0 },
        { type: "gp", amount: 0 },
        { type: "gp", amount: 0 },
      ],
      power_box_contents: ["2x_boost", "attack", "nothing"],
    },
  });

  React.useEffect(() => {
    if (open) {
      form.reset({
        name: "",
        description: "",
        starting_price: 0,
        is_mystery_box: isMystery,
        is_power_box: false,
        mystery_box_contents: [{ type: "gp", amount: 0 }, { type: "gp", amount: 0 }, { type: "gp", amount: 0 }],
        power_box_contents: ["2x_boost", "attack", "nothing"],
      });
    }
  }, [open, isMystery, form]);

  const { fields: mysteryFields } = useFieldArray({ control: form.control, name: "mystery_box_contents" });
  const { fields: powerFields } = useFieldArray({ control: form.control, name: "power_box_contents" });

  const isMysteryBox = form.watch("is_mystery_box");
  const isPowerBox = form.watch("is_power_box");

  const mutation = useMutation({
    mutationFn: createAuctionItem,
    onSuccess: () => {
      showSuccess("Auction item created successfully.");
      queryClient.invalidateQueries({ queryKey: ["auctionData"] });
      onOpenChange(false);
    },
    onError: (err: Error) => showError(err.message),
  });

  const onSubmit = (values: FormValues) => {
    let submissionValues = { ...values };
    if (submissionValues.is_mystery_box) {
      submissionValues.name = "Mystery Box";
      submissionValues.description = "What could be inside?";
    } else if (submissionValues.is_power_box) {
      submissionValues.name = "Power Box";
      submissionValues.description = "Unleash a special ability!";
    }
    mutation.mutate(submissionValues);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Create New Item</DialogTitle>
          <DialogDescription>Choose the item type and configure its properties.</DialogDescription>
        </DialogHeader>
        <div className="flex-grow overflow-y-auto -mr-6 pr-6">
          <Form {...form}>
            <form id="create-item-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {!isMysteryBox && !isPowerBox && (
                <>
                  <FormField control={form.control} name="name" render={({ field }) => (
                    <FormItem><FormLabel>Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="description" render={({ field }) => (
                    <FormItem><FormLabel>Description</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                </>
              )}
              <FormField control={form.control} name="starting_price" render={({ field }) => (
                <FormItem><FormLabel>Starting Price (GP)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              
              <div className="flex gap-4">
                <FormField control={form.control} name="is_mystery_box" render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm flex-1">
                    <div className="space-y-0.5"><FormLabel>Mystery Box</FormLabel></div>
                    <FormControl><Switch checked={field.value} onCheckedChange={(checked) => { field.onChange(checked); if (checked) form.setValue('is_power_box', false); }} /></FormControl>
                  </FormItem>
                )} />
                <FormField control={form.control} name="is_power_box" render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm flex-1">
                    <div className="space-y-0.5"><FormLabel>Power Box</FormLabel></div>
                    <FormControl><Switch checked={field.value} onCheckedChange={(checked) => { field.onChange(checked); if (checked) form.setValue('is_mystery_box', false); }} /></FormControl>
                  </FormItem>
                )} />
              </div>

              {isMysteryBox && (
                <div className="space-y-4 rounded-lg border p-4">
                  <h3 className="text-sm font-medium">Mystery Box Prizes</h3>
                  {mysteryFields.map((field, index) => (
                    <div key={field.id}>
                      <div className="grid grid-cols-2 gap-4">
                        <FormField control={form.control} name={`mystery_box_contents.${index}.type`} render={({ field }) => (
                          <FormItem><FormLabel>Prize {index + 1} Type</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                              <SelectContent>
                                <SelectItem value="gp">Game Points (GP)</SelectItem>
                                <SelectItem value="xp">Experience (XP)</SelectItem>
                                <SelectItem value="nothing">Nothing 😝</SelectItem>
                              </SelectContent>
                            </Select><FormMessage />
                          </FormItem>
                        )} />
                        <FormField control={form.control} name={`mystery_box_contents.${index}.amount`} render={({ field }) => (
                          <FormItem><FormLabel>Amount</FormLabel>
                            <FormControl><Input type="number" {...field} disabled={form.watch(`mystery_box_contents.${index}.type`) === 'nothing'} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                      </div>
                      {index < mysteryFields.length - 1 && <Separator className="mt-4" />}
                    </div>
                  ))}
                </div>
              )}

              {isPowerBox && (
                <div className="space-y-4 rounded-lg border p-4">
                  <h3 className="text-sm font-medium">Power Box Options</h3>
                  {powerFields.map((field, index) => (
                    <FormField key={field.id} control={form.control} name={`power_box_contents.${index}`} render={({ field }) => (
                      <FormItem><FormLabel>Power {index + 1}</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                          <SelectContent>
                            {powerUpTypes.map(power => (
                              <SelectItem key={power.value} value={power.value}>{power.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select><FormMessage />
                      </FormItem>
                    )} />
                  ))}
                </div>
              )}
            </form>
          </Form>
        </div>
        <DialogFooter className="flex-shrink-0 pt-4 border-t -mx-6 px-6">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button type="submit" form="create-item-form" disabled={mutation.isPending}>
            {mutation.isPending ? "Creating..." : "Create Item"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};