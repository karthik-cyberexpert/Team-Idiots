"use client";

import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Submission, Task } from "@/types/task";
import { format } from "date-fns";
import { Eye, Edit } from "lucide-react";

interface SubmissionCardProps {
  submission: Submission;
  onView: (taskId: string) => void;
  onEdit: (submission: Submission) => void;
}

const getStatusBadge = (status: Task['status']) => {
  const statusText = status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  let variantClass = '';
  switch (status) {
    case 'completed': variantClass = 'bg-vibrant-green text-white'; break;
    case 'pending': variantClass = 'bg-vibrant-orange text-white'; break;
    case 'waiting_for_approval': variantClass = 'bg-vibrant-blue text-white'; break;
    case 'rejected': variantClass = 'bg-vibrant-red text-white'; break;
    case 'late_completed': variantClass = 'bg-vibrant-brown text-white'; break;
    case 'failed': variantClass = 'bg-gray-500 text-white'; break;
    default: variantClass = 'bg-gray-500 text-white';
  }
  return <Badge className={variantClass}>{statusText}</Badge>;
};

export const SubmissionCard = ({ submission, onView, onEdit }: SubmissionCardProps) => {
  const task = submission.tasks;
  const dueDate = task.due_date ? new Date(task.due_date) : null;
  const isEditable = task.status === 'rejected' || (task.status === 'pending' && (!dueDate || new Date() < dueDate));

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <CardTitle className="text-lg truncate">{task.title}</CardTitle>
        <CardDescription>
          Submitted on: {format(new Date(submission.submitted_at), "PPP p")}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-grow flex flex-col justify-between">
        <div className="mb-4">
          {getStatusBadge(task.status)}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => onView(submission.task_id)}>
            <Eye className="mr-2 h-4 w-4" /> View
          </Button>
          {isEditable && (
            <Button size="sm" onClick={() => onEdit(submission)}>
              <Edit className="mr-2 h-4 w-4" /> Edit
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};