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
import { PowerUpType } from "@/types/auction";

const powerUpTypes: { value: PowerUpType; label: string }[] = [
  { value: '2x_boost', label: '2X Boost' },
  { value: '4x_boost', label: '4X Boost' },
  { value: 'gp_transfer', label: 'GP Siphon' },
  { value: 'attack', label: 'Attack' },
  { value: 'shield', label: 'Shield' },
];

const formSchema = z.object({
  recipientId: z.string().min(1, "Please select a recipient."),
  requestType: z.enum(["gp", "xp", "power_up"]),
  amount: z.coerce.number().optional(),
  powerUpType: z.string().optional(),
  message: z.string().min(1, "A message is required.").max(200, "Message cannot exceed 200 characters."),
}).superRefine((data, ctx) => {
  if (data.requestType === "gp" || data.requestType === "xp") {
    if (!data.amount || data.amount <= 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Amount must be a positive number.", path: ["amount"] });
    }
  }
  if (data.requestType === "power_up") {
    if (!data.powerUpType) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Please select a power-up.", path: ["powerUpType"] });
    }
  }
});

type FormValues = z.infer<typeof formSchema>;

const fetchRequestableData = async (): Promise<{ users: User[] }> => {
  const { data: users, error: usersError } = await supabase.functions.invoke("get-all-other-users");
  if (usersError) throw new Error(usersError.message);
  return { users: users || [] };
};

const createRequest = async (values: FormValues) => {
  const { error } = await supabase.functions.invoke("create-request", { body: values });
  if (error) throw new Error(error.message);
};

export const CreateRequestForm = () => {
  const queryClient = useQueryClient();
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { requestType: "gp" },
  });

  const { data, isLoading } = useQuery({
    queryKey: ["requestableData"],
    queryFn: fetchRequestableData,
  });

  const mutation = useMutation({
    mutationFn: createRequest,
    onSuccess: () => {
      showSuccess("Request sent successfully!");
      queryClient.invalidateQueries({ queryKey: ["userRequests"] });
      form.reset({ requestType: "gp", message: "", recipientId: "" });
    },
    onError: (err: Error) => showError(err.message),
  });

  const requestType = form.watch("requestType");

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create a New Request</CardTitle>
        <CardDescription>Ask another user or everyone for resources.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((v) => mutation.mutate(v))} className="space-y-4">
            <FormField control={form.control} name="recipientId" render={({ field }) => (
              <FormItem><FormLabel>Recipient</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Select a user or send to all..." /></SelectTrigger></FormControl>
                  <SelectContent>{isLoading ? <SelectItem value="loading" disabled>Loading...</SelectItem> : 
                    <>
                      <SelectItem value="global">Global (All Users)</SelectItem>
                      {data?.users.map(user => <SelectItem key={user.id} value={user.id}>{user.full_name}</SelectItem>)}
                    </>
                  }</SelectContent>
                </Select><FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="requestType" render={({ field }) => (
              <FormItem><FormLabel>Request Type</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value="gp">Game Points (GP)</SelectItem>
                    <SelectItem value="xp">Experience (XP)</SelectItem>
                    <SelectItem value="power_up">Power-up</SelectItem>
                  </SelectContent>
                </Select><FormMessage />
              </FormItem>
            )} />
            
            {(requestType === 'gp' || requestType === 'xp') && (
              <FormField control={form.control} name="amount" render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount of {requestType.toUpperCase()}</FormLabel>
                  <FormControl><Input type="number" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            )}
            {requestType === 'power_up' && (
              <FormField control={form.control} name="powerUpType" render={({ field }) => (
                <FormItem>
                  <FormLabel>Power-up Type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select a power-up..." /></SelectTrigger></FormControl>
                    <SelectContent>{powerUpTypes.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            )}

            <FormField control={form.control} name="message" render={({ field }) => <FormItem><FormLabel>Message</FormLabel><FormControl><Textarea placeholder="Why are you requesting this?" {...field} /></FormControl><FormMessage /></FormItem>} />
            
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