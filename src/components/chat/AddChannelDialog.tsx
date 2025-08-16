"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
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
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { showSuccess, showError } from "@/utils/toast";

const formSchema = z.object({
  name: z.string().min(1, { message: "Channel name is required." }).max(50, { message: "Channel name must be 50 characters or less." }),
});

type AddChannelFormValues = z.infer<typeof formSchema>;

const createChannel = async (name: string) => {
  const { data, error } = await supabase.from("channels").insert({ name }).select().single();
  if (error) {
    throw new Error(`Failed to create channel: ${error.message}`);
  }
  return data;
};

interface AddChannelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const AddChannelDialog = ({ open, onOpenChange }: AddChannelDialogProps) => {
  const queryClient = useQueryClient();
  const form = useForm<AddChannelFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
    },
  });

  const mutation = useMutation({
    mutationFn: (values: AddChannelFormValues) => createChannel(values.name),
    onSuccess: () => {
      showSuccess("Channel created successfully.");
      queryClient.invalidateQueries({ queryKey: ["channels"] });
      onOpenChange(false);
      form.reset();
    },
    onError: (err) => {
      showError(err.message);
    },
  });

  const onSubmit = (values: AddChannelFormValues) => {
    mutation.mutate(values);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create New Channel</DialogTitle>
          <DialogDescription>
            Enter a name for the new chat channel.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Channel Name</FormLabel>
                  <FormControl>
                    <Input placeholder="General Discussion" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? "Creating..." : "Create Channel"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};