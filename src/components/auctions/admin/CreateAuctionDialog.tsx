"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { showSuccess, showError } from "@/utils/toast";
import { AuctionItem } from "@/types/auction";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, setHours, setMinutes } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const formSchema = z.object({
  startDate: z.date({ required_error: "Start date is required." }),
  startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, { message: "Invalid start time format (HH:mm)." }),
  endDate: z.date({ required_error: "End date is required." }),
  endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, { message: "Invalid end time format (HH:mm)." }),
}).refine(data => {
  const startDateTime = setMinutes(setHours(data.startDate, parseInt(data.startTime.split(':')[0]), parseInt(data.startTime.split(':')[1])), parseInt(data.startTime.split(':')[1]));
  const endDateTime = setMinutes(setHours(data.endDate, parseInt(data.endTime.split(':')[0]), parseInt(data.endTime.split(':')[1])), parseInt(data.endTime.split(':')[1]));
  return endDateTime > startDateTime;
}, {
  message: "End time must be after start time.",
  path: ["endTime"], // Point to the end time field for the error
});

type FormValues = z.infer<typeof formSchema>;

const createAuction = async (values: { item_id: string; start_time: string; end_time: string; starting_price: number }) => {
  const { error } = await supabase.functions.invoke("create-auction", { body: values });
  if (error) throw new Error(error.message);
};

interface CreateAuctionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: AuctionItem | null;
}

export const CreateAuctionDialog = ({ open, onOpenChange, item }: CreateAuctionDialogProps) => {
  const queryClient = useQueryClient();
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      startDate: undefined,
      startTime: '',
      endDate: undefined,
      endTime: '',
    },
  });

  React.useEffect(() => {
    if (item && open) {
      const start = new Date(item.start_time);
      const end = new Date(item.end_time);
      form.reset({
        startDate: start,
        startTime: format(start, 'HH:mm'),
        endDate: end,
        endTime: format(end, 'HH:mm'),
      });
    } else if (!open) {
      form.reset({
        startDate: undefined,
        startTime: '',
        endDate: undefined,
        endTime: '',
      });
    }
  }, [item, open, form]);

  const mutation = useMutation({
    mutationFn: createAuction,
    onSuccess: () => {
      showSuccess("Auction scheduled successfully.");
      queryClient.invalidateQueries({ queryKey: ["auctionData"] });
      onOpenChange(false);
      form.reset();
    },
    onError: (err: Error) => showError(err.message),
  });

  const onSubmit = (values: FormValues) => {
    if (!item) return;

    const startDateTime = setMinutes(setHours(values.startDate, parseInt(values.startTime.split(':')[0]), parseInt(values.startTime.split(':')[1])), parseInt(values.startTime.split(':')[1]));
    const endDateTime = setMinutes(setHours(values.endDate, parseInt(values.endTime.split(':')[0]), parseInt(values.endTime.split(':')[1])), parseInt(values.endTime.split(':')[1]));

    mutation.mutate({
      item_id: item.id,
      starting_price: item.starting_price,
      start_time: startDateTime.toISOString(),
      end_time: endDateTime.toISOString(),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Schedule Auction for: {item?.name}</DialogTitle>
          <DialogDescription>Set the start and end times for the auction.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="flex gap-2">
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col flex-1">
                    <FormLabel>Start Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value || undefined}
                          onSelect={field.onChange}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="startTime"
                render={({ field }) => (
                  <FormItem className="flex flex-col w-1/3">
                    <FormLabel>Time</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="flex gap-2">
              <FormField
                control={form.control}
                name="endDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col flex-1">
                    <FormLabel>End Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value || undefined}
                          onSelect={field.onChange}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="endTime"
                render={({ field }) => (
                  <FormItem className="flex flex-col w-1/3">
                    <FormLabel>Time</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? "Scheduling..." : "Schedule Auction"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};