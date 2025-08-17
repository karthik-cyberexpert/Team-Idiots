"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { showSuccess, showError } from "@/utils/toast";
import { Send } from "lucide-react";
import { User } from "@/types/user";

const formSchema = z.object({
  recipientId: z.string().min(1, { message: "Please select a recipient." }),
  requestType: z.enum(["gp", "xp"]),
  amount: z.coerce.number().optional(),
  message: z.string().min(1, "A message is required.").max(200, "Message cannot exceed 200 characters."),
}).superRefine((data, ctx) => {
  if (data.requestType === "gp" || data.requestType === "xp") {
    if (!data.amount || data.amount <= 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Amount must be a positive number.", path: ["amount"] });
    }
  }
});

type FormValues = z.infer<typeof formSchema>;

const fetchUsers = async (): Promise<User[]> => {
  const { data, error } = await supabase.functions.invoke("get-all-other-users");
  if (error) throw new Error(error.message);
  return data || [];
};

const createRequest = async (values: FormValues) => {
  const { error } = await supabase.functions.invoke("create-resource-request", { body: values });
  if (error) throw new Error(error.message);
};

export const CreateRequestForm = ({ onSuccessfulRequest }: { onSuccessfulRequest: () => void }) => {
  const queryClient = useQueryClient();
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { requestType: "gp", recipientId: "global" },
  });

  const { data: users, isLoading } = useQuery({
    queryKey: ["allOtherUsers"],
    queryFn: fetchUsers,
  });

  const mutation = useMutation({
    mutationFn: createRequest,
    onSuccess: () => {
      showSuccess("Request sent successfully!");
      form.reset({ requestType: "gp", recipientId: "global", message: "" });
      onSuccessfulRequest();
      queryClient.invalidateQueries({ queryKey: ["outgoingRequests"] });
    },
    onError: (err: Error) => showError(err.message),
  });

  const requestType = form.watch("requestType");

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create a New Request</CardTitle>
        <CardDescription>Ask for resources from another user or from everyone.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((v) => mutation.mutate(v))} className="space-y-4">
            <FormField control={form.control} name="recipientId" render={({ field }) => (
              <FormItem><FormLabel>Recipient</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Select a recipient..." /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value="global">Global (All Users)</SelectItem>
                    {isLoading ? <SelectItem value="loading" disabled>Loading users...</SelectItem> : users?.map(user => <SelectItem key={user.id} value={user.id}>{user.full_name}</SelectItem>)}
                  </SelectContent>
                </Select>
                {form.watch('recipientId') === 'global' && <p className="text-xs text-muted-foreground pt-1">Note: Global requests are sent to all non-admin users.</p>}
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="requestType" render={({ field }) => (
              <FormItem><FormLabel>Request Type</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value="gp">Game Points (GP)</SelectItem>
                    <SelectItem value="xp">Experience (XP)</SelectItem>
                  </SelectContent>
                </Select><FormMessage />
              </FormItem>
            )} />
            
            {(requestType === 'gp' || requestType === 'xp') && <FormField control={form.control} name="amount" render={({ field }) => <FormItem><FormLabel>Amount</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>} />}

            <FormField control={form.control} name="message" render={({ field }) => <FormItem><FormLabel>Message</FormLabel><FormControl><Textarea placeholder="Please help me out!" {...field} /></FormControl><FormMessage /></FormItem>} />
            
            <Button type="submit" className="w-full" disabled={mutation.isPending}>
              <Send className="mr-2 h-4 w-4" />
              {mutation.isPending ? "Sending..." : "Send Request"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};