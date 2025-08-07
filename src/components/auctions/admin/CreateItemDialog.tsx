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

const mysteryBoxContentSchema = z.object({
  type: z.enum(["gp", "xp"]),
  amount: z.coerce.number().int("Amount must be a whole number."),
});

const formSchema = z.object({
  name: z.string().min(1, "Name is required."),
  description: z.string().optional(),
  starting_price: z.coerce.number().int().min(0, "Starting price must be non-negative."),
  is_mystery_box: z.boolean().default(false),
  mystery_box_contents: z.array(mysteryBoxContentSchema).optional(),
}).superRefine((data, ctx) => {
  if (data.is_mystery_box) {
    if (!data.mystery_box_contents || data.mystery_box_contents.length !== 3) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "A mystery box must have exactly 3 prize options.",
        path: ["mystery_box_contents"],
      });
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
}

export const CreateItemDialog = ({ open, onOpenChange }: CreateItemDialogProps) => {
  const queryClient = useQueryClient();
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
      starting_price: 0,
      is_mystery_box: false,
      mystery_box_contents: [
        { type: "gp", amount: 0 },
        { type: "gp", amount: 0 },
        { type: "gp", amount: 0 },
      ],
    },
  });

  const { fields } = useFieldArray({
    control: form.control,
    name: "mystery_box_contents",
  });

  const isMysteryBox = form.watch("is_mystery_box");

  const mutation = useMutation({
    mutationFn: createAuctionItem,
    onSuccess: () => {
      showSuccess("Auction item created successfully.");
      queryClient.invalidateQueries({ queryKey: ["auctionData"] });
      onOpenChange(false);
      form.reset();
    },
    onError: (err: Error) => showError(err.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Auction Item</DialogTitle>
          <DialogDescription>Enter the details for the new item.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((v) => mutation.mutate(v))} className="space-y-4">
            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem><FormLabel>Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="description" render={({ field }) => (
              <FormItem><FormLabel>Description</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="starting_price" render={({ field }) => (
              <FormItem><FormLabel>Starting Price (GP)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            
            <FormField
              control={form.control}
              name="is_mystery_box"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                  <div className="space-y-0.5">
                    <FormLabel>Mystery Box</FormLabel>
                    <FormDescription>Is this item a mystery box?</FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            {isMysteryBox && (
              <div className="space-y-4 rounded-lg border p-4">
                <h3 className="text-sm font-medium">Mystery Box Prizes</h3>
                {fields.map((field, index) => (
                  <div key={field.id}>
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name={`mystery_box_contents.${index}.type`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Prize {index + 1} Type</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="gp">Game Points (GP)</SelectItem>
                                <SelectItem value="xp">Experience (XP)</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`mystery_box_contents.${index}.amount`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Amount</FormLabel>
                            <FormControl><Input type="number" placeholder="e.g., 500 or -100" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    {index < fields.length - 1 && <Separator className="mt-4" />}
                  </div>
                ))}
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? "Creating..." : "Create Item"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};