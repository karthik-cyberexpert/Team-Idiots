"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { QuizSet } from "@/types/quiz";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

interface ShowQuestionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quizSet: QuizSet | null;
}

export const ShowQuestionsDialog = ({ open, onOpenChange, quizSet }: ShowQuestionsDialogProps) => {
  if (!quizSet) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Questions for: {quizSet.title}</DialogTitle>
        </DialogHeader>
        <ScrollArea className="h-[600px] w-full rounded-md border p-4">
          {quizSet.quiz_questions.map((q, index) => (
            <Card key={q.id} className="mb-4">
              <CardHeader>
                <CardTitle className="text-lg">Question {index + 1}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-semibold mb-2">{q.question}</p>
                <ul className="space-y-1">
                  {q.options.map((option, optionIndex) => (
                    <li key={optionIndex} className="flex items-center">
                      <span className="mr-2">{optionIndex + 1}.</span>
                      <span>{option}</span>
                      {optionIndex === q.correct_option_index && (
                        <Badge variant="default" className="ml-2 bg-vibrant-green">Correct</Badge>
                      )}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};