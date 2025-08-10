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
import { QuizSet } from "@/types/quiz";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { TimePicker } from "@/components/ui/time-picker";

const formSchema = z.object({
  reward_type: z.enum(["gp", "xp"]),
  points_per_question: z.coerce.number().int().min(0),
  time_limit_minutes: z.coerce.number().int().min(1).nullable(),
  enrollment_deadline_date: z.date().nullable(),
  enrollment_deadline_time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, { message: "Invalid time format." }).optional().or(z.literal('')),
}).refine(data => {
    if (data.enrollment_deadline_date && !data.enrollment_deadline_time) return false;
    if (!data.enrollment_deadline_date && data.enrollment_deadline_time) return false;
    return true;
}, {
    message: "Both date and time must be set for the deadline.",
    path: ["enrollment_deadline_time"],
});

type FormValues = z.infer<typeof formSchema>;

const updateQuizSet = async (id: string, values: Omit<FormValues, 'enrollment_deadline_date' | 'enrollment_deadline_time'> & { enrollment_deadline: string | null }) => {
    const { error } = await supabase.functions.invoke("update-quiz-set", { body: { id, ...values } });
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
      const deadline = quizSet.enrollment_deadline ? new Date(quizSet.enrollment_deadline) : null;
      form.reset({
        reward_type: quizSet.reward_type || 'gp',
        points_per_question: quizSet.points_per_question || 10,
        time_limit_minutes: quizSet.time_limit_minutes || null,
        enrollment_deadline_date: deadline,
        enrollment_deadline_time: deadline ? format(deadline, "HH:mm") : "",
      });
    }
  }, [quizSet, form]);

  const mutation = useMutation({
    mutationFn: (values: FormValues) => {
        let deadline: string | null = null;
        if (values.enrollment_deadline_date && values.enrollment_deadline_time) {
            const date = values.enrollment_deadline_date;
            const [hours, minutes] = values.enrollment_deadline_time.split(':').map(Number);
            const combined = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), hours, minutes));
            deadline = combined.toISOString();
        }
        const submissionValues = {
            reward_type: values.reward_type,
            points_per_question: values.points_per_question,
            time_limit_minutes: values.time_limit_minutes,
            enrollment_deadline: deadline,
        };
        return updateQuizSet(quizSet!.id, submissionValues);
    },
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
            <FormField control={form.control} name="time_limit_minutes" render={({ field }) => (
                <FormItem><FormLabel>Time Limit (minutes)</FormLabel>
                    <FormControl><Input type="number" placeholder="e.g., 30" {...field} value={field.value ?? ""} /></FormControl>
                    <FormMessage />
                </FormItem>
            )} />
            <div className="flex gap-2">
                <FormField control={form.control} name="enrollment_deadline_date" render={({ field }) => (
                    <FormItem className="flex flex-col flex-1">
                        <FormLabel>Enrollment Deadline</FormLabel>
                        <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
                            <PopoverTrigger asChild>
                                <FormControl>
                                    <Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                        {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                    </Button>
                                </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                                <Calendar mode="single" selected={field.value || undefined} onSelect={(date) => { field.onChange(date); setIsDatePickerOpen(false); }} initialFocus />
                            </PopoverContent>
                        </Popover>
                        <FormMessage />
                    </FormItem>
                )} />
                <FormField control={form.control} name="enrollment_deadline_time" render={({ field }) => (
                    <FormItem className="flex flex-col w-1/3">
                        <FormLabel>Time</FormLabel>
                        <FormControl><TimePicker value={field.value} onChange={field.onChange} /></FormControl>
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