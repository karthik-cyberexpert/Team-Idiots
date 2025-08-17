"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthProvider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { showSuccess, showError } from "@/utils/toast";
import { Handshake, Send, PartyPopper } from "lucide-react";
import { User } from "@/types/user";

const formSchema = z.object({
  recipientId: z.string().uuid({ message: "Please select a user." }),
  requestType: z.enum(["gp", "xp"]),
  amount: z.coerce.number().positive("Amount must be a positive number."),
  message: z.string().min(1, "A message is required.").max(200, "Message cannot exceed 200 characters."),
});

type FormValues = z.infer<typeof formSchema>;

const fetchOtherUsers = async (): Promise<User[]> => {
  const { data, error } = await supabase.functions.invoke("get-all-other-users");
  if (error) throw new Error(error.message);
  return data || [];
};

const createRequest = async (values: FormValues) => {
  const { error } = await supabase.functions.invoke("create-request", { body: values });
  if (error) throw new Error(error.message);
};

const RequestCenterPage = () => {
  const queryClient = useQueryClient();
  const [isSuccess, setIsSuccess] = React.useState(false);
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { requestType: "gp" },
  });

  const { data: users, isLoading } = useQuery({
    queryKey: ["otherUsers"],
    queryFn: fetchOtherUsers,
  });

  const mutation = useMutation({
    mutationFn: createRequest,
    onSuccess: () => {
      showSuccess("Request sent successfully!");
      form.reset({ requestType: "gp", message: "" });
      setIsSuccess(true);
    },
    onError: (err: Error) => showError(err.message),
  });

  if (isSuccess) {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardContent className="text-center py-10 flex flex-col items-center space-y-4">
          <PartyPopper className="h-16 w-16 text-vibrant-green" />
          <p className="text-xl font-semibold">Request Sent!</p>
          <p className="text-muted-foreground">Your request is on its way. You'll be notified of the outcome.</p>
          <Button onClick={() => setIsSuccess(false)}>
            Make Another Request
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Handshake className="h-6 w-6 text-vibrant-blue" /> Request Center</CardTitle>
        <CardDescription>Ask other users for GP or XP.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((v) => mutation.mutate(v))} className="space-y-4">
            <FormField control={form.control} name="recipientId" render={({ field }) => (
              <FormItem><FormLabel>Recipient</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Select a user..." /></SelectTrigger></FormControl>
                  <SelectContent>{isLoading ? <SelectItem value="loading" disabled>Loading...</SelectItem> : users?.map(user => <SelectItem key={user.id} value={user.id}>{user.full_name}</SelectItem>)}</SelectContent>
                </Select><FormMessage />
              </FormItem>
            )} />
            <div className="grid grid-cols-2 gap-4">
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
              <FormField control={form.control} name="amount" render={({ field }) => (
                <FormItem><FormLabel>Amount</FormLabel>
                  <FormControl><Input type="number" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
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

export default RequestCenterPage;