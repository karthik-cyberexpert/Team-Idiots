"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { showSuccess, showError } from "@/utils/toast";
import { UserPlus } from "lucide-react";

const formSchema = z.object({
  receiverId: z.string().uuid({ message: "Please select a user to invite." }),
});

type FormValues = z.infer<typeof formSchema>;

interface AvailableUser {
  id: string;
  full_name: string;
}

interface FindBuddyProps {
  availableUsers: AvailableUser[];
}

const sendInvite = async (receiverId: string) => {
  const { error } = await supabase.functions.invoke("send-buddy-invite", {
    body: { receiverId },
  });
  if (error) throw new Error(error.message);
};

export const FindBuddy = ({ availableUsers }: FindBuddyProps) => {
  const queryClient = useQueryClient();
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
  });

  const mutation = useMutation({
    mutationFn: (values: FormValues) => sendInvite(values.receiverId),
    onSuccess: () => {
      showSuccess("Buddy invitation sent!");
      queryClient.invalidateQueries({ queryKey: ["buddyData"] });
    },
    onError: (err: Error) => showError(err.message),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Find a Buddy</CardTitle>
        <CardDescription>Send an invitation to another user to become your buddy.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((v) => mutation.mutate(v))} className="flex items-end gap-2">
            <FormField
              control={form.control}
              name="receiverId"
              render={({ field }) => (
                <FormItem className="flex-grow">
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a user to invite..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {availableUsers.length > 0 ? (
                        availableUsers.map(user => (
                          <SelectItem key={user.id} value={user.id}>{user.full_name}</SelectItem>
                        ))
                      ) : (
                        <SelectItem value="none" disabled>No available users found</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" disabled={mutation.isPending}>
              <UserPlus className="mr-2 h-4 w-4" />
              {mutation.isPending ? "Sending..." : "Send Invite"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};