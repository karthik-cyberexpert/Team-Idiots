export interface Task {
  id: string;
  title: string;
  description: string | null;
  assigned_to: string;
  assigned_by: string;
  status: 'pending' | 'completed' | 'waiting_for_approval' | 'rejected' | 'late_completed' | 'failed';
  due_date: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  is_common_task: boolean;
  marks_awarded?: number | null;
  xp_awarded_manual?: number | null;
  task_type?: 'standard' | 'typer'; // New field for task type
  related_typing_text_id?: string | null; // New field to link to a typing text
  profiles: {
    full_name: string;
  } | null;
  assigner_profile: {
    full_name: string;
  } | null;
}