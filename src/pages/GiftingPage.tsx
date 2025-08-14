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
import { Gift, Send, PartyPopper } from "lucide-react";
import { UserPowerUp } from "@/types/powerup";
import { User } from "@/types/user";

const formSchema = z.object({
  receiverId: z.string().uuid({ message: "Please select a user." }),
  giftType: z.enum(["gp", "xp", "power_up"]),
  amount: z.coerce.number().optional(),
  powerUpId: z.string().uuid().optional(),
  message: z.string().min(1, "A message is required.").max(200, "Message cannot exceed 200 characters."),
}).superRefine((data, ctx) => {
  if (data.giftType === "gp" || data.giftType === "xp") {
    if (!data.amount || data.amount <= 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Amount must be a positive number.", path: ["amount"] });
    }
  }
  if (data.giftType === "power_up") {
    if (!data.powerUpId) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Please select a power-up to gift.", path: ["powerUpId"] });
    }
  }
});

type FormValues = z.infer<typeof formSchema>;

const fetchGiftableData = async (): Promise<{ users: User[]; powerUps: UserPowerUp[] }> => {
  const { data: users, error: usersError } = await supabase.functions.invoke("get-all-other-users");
  if (usersError) throw new Error(usersError.message);

  const { data: powerUps, error: powerUpsError } = await supabase.from("user_power_ups").select("*").eq("is_used", false);
  if (powerUpsError) throw new Error(powerUpsError.message);

  return { users: users || [], powerUps: powerUps || [] };
};

const sendGift = async (values: FormValues) => {
  const { error } = await supabase.functions.invoke("send-gift", { body: values });
  if (error) throw new Error(error.message);
};

const GiftingPage = () => {
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const [viewState, setViewState] = React.useState<'idle' | 'form' | 'success'>('idle');
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { giftType: "gp" },
  });

  const { data, isLoading } = useQuery({
    queryKey: ["giftableData"],
    queryFn: fetchGiftableData,
  });

  const mutation = useMutation({
    mutationFn: sendGift,
    onSuccess: () => {
      showSuccess("Gift sent successfully!");
      queryClient.invalidateQueries({ queryKey: ["myPowerUps"] });
      queryClient.invalidateQueries({ queryKey: ["users"] });
      form.reset({ giftType: "gp", message: "" });
      setViewState('success');
    },
    onError: (err: Error) => showError(err.message),
  });

  const giftType = form.watch("giftType");

  const renderContent = () => {
    switch (viewState) {
      case 'success':
        return (
          <div className="text-center py-10 flex flex-col items-center space-y-4">
            <PartyPopper className="h-16 w-16 text-vibrant-green" />
            <p className="text-xl font-semibold">Gift Sent!</p>
            <p className="text-muted-foreground">Your gift is on its way to the recipient.</p>
            <Button onClick={() => setViewState('idle')}>
              Send Another Gift
            </Button>
          </div>
        );
      case 'form':
        return (
          <Form {...form}>
            <form onSubmit={form.handleSubmit((v) => mutation.mutate(v))} className="space-y-4">
              <FormField control={form.control} name="receiverId" render={({ field }) => (
                <FormItem><FormLabel>Recipient</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select a user..." /></SelectTrigger></FormControl>
                    <SelectContent>{isLoading ? <SelectItem value="loading" disabled>Loading...</SelectItem> : data?.users.map(user => <SelectItem key={user.id} value={user.id}>{user.full_name}</SelectItem>)}</SelectContent>
                  </Select><FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="giftType" render={({ field }) => (
                <FormItem><FormLabel>Gift Type</FormLabel>
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
              
              {giftType === 'gp' && (
                <FormField control={form.control} name="amount" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount of GP</FormLabel>
                    <FormControl><Input type="number" {...field} /></FormControl>
                    <FormDescription>Your GP: {profile?.game_points || 0}</FormDescription>
                    <FormMessage />
                  </FormItem>
                )} />
              )}
              {giftType === 'xp' && (
                <FormField control={form.control} name="amount" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount of XP</FormLabel>
                    <FormControl><Input type="number" {...field} /></FormControl>
                    <FormDescription>Your XP: {profile?.xp || 0}</FormDescription>
                    <FormMessage />
                  </FormItem>
                )} />
              )}
              {giftType === 'power_up' && (
                <FormField control={form.control} name="powerUpId" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Power-up</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Select a power-up..." /></SelectTrigger></FormControl>
                      <SelectContent>{isLoading ? <SelectItem value="loading" disabled>Loading...</SelectItem> : data?.powerUps.map(p => <SelectItem key={p.id} value={p.id}>{p.power_type.replace(/_/g, ' ')}</SelectItem>)}</SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
              )}

              <FormField control={form.control} name="message" render={({ field }) => <FormItem><FormLabel>Message</FormLabel><FormControl><Textarea placeholder="Write a nice message..." {...field} /></FormControl><FormMessage /></FormItem>} />
              
              <Button type="submit" className="w-full" disabled={mutation.isPending}>
                <Send className="mr-2 h-4 w-4" />
                {mutation.isPending ? "Sending..." : "Send Gift"}
              </Button>
            </form>
          </Form>
        );
      case 'idle':
      default:
        return (
          <div className="text-center py-10 flex flex-col items-center space-y-4">
            <Gift className="h-16 w-16 text-vibrant-pink" />
            <p className="text-muted-foreground">Want to send a gift to another user? Click the button below to get started.</p>
            <Button onClick={() => setViewState('form')}>
              <Send className="mr-2 h-4 w-4" />
              Send a Gift
            </Button>
          </div>
        );
    }
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Gift className="h-6 w-6 text-vibrant-pink" /> Send a Gift</CardTitle>
        <CardDescription>Share your resources with other users.</CardDescription>
      </CardHeader>
      <CardContent>
        {renderContent()}
      </CardContent>
    </Card>
  );
};

export default GiftingPage;