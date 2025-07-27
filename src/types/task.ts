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
  marks_awarded?: number | null; // New: Marks awarded by admin
  xp_awarded_manual?: number | null; // New: Manual XP awarded by admin
  profiles: {
    full_name: string;
  } | null; // For assigned_to user's name
  assigner_profile: {
    full_name: string;
  } | null; // For assigned_by user's name
}