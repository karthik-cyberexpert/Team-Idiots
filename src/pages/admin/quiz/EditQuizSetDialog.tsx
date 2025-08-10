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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { showSuccess, showError } from "@/utils/toast";
import { QuizSet } from "@/types/quiz";
import { TimePicker } from "@/components/ui/time-picker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const formSchema = z.object({
  assign_date: z.date().optional().nullable(),
  start_time: z.string().optional(),
  end_time: z.string().optional(),
  reward_type: z.enum(["gp", "xp"]),
  points_per_question: z.coerce.number().int().min(0),
});

type FormValues = z.infer<typeof formSchema>;

const updateQuizSet = async (id: string, values: FormValues) => {
    const body = {
        id,
        assign_date: values.assign_date ? format(values.assign_date, "yyyy-MM-dd") : null,
        start_time: values.start_time || null,
        end_time: values.end_time || null,
        reward_type: values.reward_type,
        points_per_question: values.points_per_question,
    };
    const { error } = await supabase.functions.invoke("update-quiz-set", { body });
    if (error) throw new Error(error.message);
};

interface EditQuizSetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quizSet: QuizSet | null;
}

export const EditQuizSetDialog = ({ open, onOpenChange, quizSet }: EditQuizSetDialogProps) => {
  const queryClient = useQueryClient();
  const [isDatePickerOpen, setIsDatePickerOpen] = React.useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
  });

  React.useEffect(() => {
    if (quizSet) {
      form.reset({
        assign_date: quizSet.assign_date ? new Date(quizSet.assign_date) : null,
        start_time: quizSet.start_time || "",
        end_time: quizSet.end_time || "",
        reward_type: quizSet.reward_type || 'gp',
        points_per_question: quizSet.points_per_question || 10,
      });
    }
  }, [quizSet, form]);

  const mutation = useMutation({
    mutationFn: (values: FormValues) => updateQuizSet(quizSet!.id, values),
    onSuccess: () => {
      showSuccess("Quiz set updated successfully.");
      queryClient.invalidateQueries({ queryKey: ["quizSets"] });
      onOpenChange(false);
    },
    onError: (err: Error) => showError(err.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Quiz Set: {quizSet?.title}</DialogTitle>
          <DialogDescription>Update the settings for this quiz set.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((v) => mutation.mutate(v))} className="space-y-4">
            <FormField
              control={form.control}
              name="assign_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Assign Date (UTC)</FormLabel>
                  <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button variant="outline" className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                          {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar mode="single" selected={field.value || undefined} onSelect={(d) => { field.onChange(d); setIsDatePickerOpen(false); }} initialFocus />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="start_time" render={({ field }) => (
                <FormItem><FormLabel>Start Time (UTC)</FormLabel><FormControl><TimePicker value={field.value} onChange={field.onChange} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="end_time" render={({ field }) => (
                <FormItem><FormLabel>End Time (UTC)</FormLabel><FormControl><TimePicker value={field.value} onChange={field.onChange} /></FormControl><FormMessage /></FormItem>
              )} />
            </div>
            <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="reward_type" render={({ field }) => (
                    <FormItem><FormLabel>Reward Type</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                            <SelectContent>
                                <SelectItem value="gp">Game Points (GP)</SelectItem>
                                <SelectItem value="xp">Experience (XP)</SelectItem>
                            </SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                )} />
                <FormField control={form.control} name="points_per_question" render={({ field }) => (
                    <FormItem><FormLabel>Points per Question</FormLabel>
                        <FormControl><Input type="number" {...field} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )} />
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};