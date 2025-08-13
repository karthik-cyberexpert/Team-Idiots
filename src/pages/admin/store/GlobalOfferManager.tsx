"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { showSuccess, showError } from "@/utils/toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { CalendarIcon, Tag, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

interface GlobalOffer {
  enabled: boolean;
  discount_percentage: number;
  start_time: string;
  end_time: string;
}

const formSchema = z.object({
  discount: z.coerce.number().int().min(1, "Discount must be at least 1%").max(100, "Discount cannot exceed 100%"),
  date: z.date({ required_error: "A date is required for the offer." }),
});

type FormValues = z.infer<typeof formSchema>;

const fetchGlobalOffer = async (): Promise<GlobalOffer | null> => {
  const { data, error } = await supabase.from("app_settings").select("value").eq("key", "global_offer").single();
  if (error && error.code !== 'PGRST116') throw new Error(error.message);
  return data?.value as GlobalOffer | null;
};

const setGlobalOffer = async (values: FormValues) => {
  const { error } = await supabase.functions.invoke("set-global-offer", { body: values });
  if (error) throw new Error(error.message);
};

const clearGlobalOffer = async () => {
  const { error } = await supabase.functions.invoke("clear-global-offer");
  if (error) throw new Error(error.message);
};

export const GlobalOfferManager = () => {
  const queryClient = useQueryClient();
  const form = useForm<FormValues>({ resolver: zodResolver(formSchema) });

  const { data: currentOffer, isLoading } = useQuery<GlobalOffer | null>({
    queryKey: ["globalOffer"],
    queryFn: fetchGlobalOffer,
  });

  const setMutation = useMutation({
    mutationFn: setGlobalOffer,
    onSuccess: () => {
      showSuccess("Global offer has been set!");
      queryClient.invalidateQueries({ queryKey: ["globalOffer"] });
    },
    onError: (err: Error) => showError(err.message),
  });

  const clearMutation = useMutation({
    mutationFn: clearGlobalOffer,
    onSuccess: () => {
      showSuccess("Global offer has been cleared.");
      queryClient.invalidateQueries({ queryKey: ["globalOffer"] });
    },
    onError: (err: Error) => showError(err.message),
  });

  if (isLoading) {
    return <Skeleton className="h-64 w-full" />;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Global Offer</CardTitle>
        <CardDescription>Set a store-wide discount for a specific day.</CardDescription>
      </CardHeader>
      <CardContent>
        {currentOffer && currentOffer.enabled ? (
          <div className="space-y-4 text-center">
            <p className="text-lg">
              Current Offer: <span className="font-bold text-vibrant-green">{currentOffer.discount_percentage}% OFF</span>
            </p>
            <p className="text-sm text-muted-foreground">
              Active for: {format(new Date(currentOffer.start_time), "PPP")}
            </p>
            <Button variant="destructive" onClick={() => clearMutation.mutate()} disabled={clearMutation.isPending}>
              <XCircle className="mr-2 h-4 w-4" />
              {clearMutation.isPending ? "Clearing..." : "Clear Offer"}
            </Button>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit((v) => setMutation.mutate(v))} className="space-y-4">
              <FormField control={form.control} name="discount" render={({ field }) => (
                <FormItem><FormLabel>Discount (%)</FormLabel><FormControl><Input type="number" placeholder="e.g., 25" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="date" render={({ field }) => (
                <FormItem><FormLabel>Offer Date</FormLabel>
                  <Popover><PopoverTrigger asChild><FormControl>
                    <Button variant="outline" className={cn("w-full", !field.value && "text-muted-foreground")}>
                      {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </FormControl></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value || undefined} onSelect={field.onChange} /></PopoverContent></Popover>
                  <FormMessage />
                </FormItem>
              )} />
              <Button type="submit" className="w-full" disabled={setMutation.isPending}>
                <Tag className="mr-2 h-4 w-4" />
                {setMutation.isPending ? "Setting Offer..." : "Set Global Offer"}
              </Button>
            </form>
          </Form>
        )}
      </CardContent>
    </Card>
  );
};