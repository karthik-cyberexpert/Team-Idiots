export interface Task {
  id: string;
  title: string;
  description: string | null;
  assigned_to: string;
  assigned_by: string;
  status: 'pending' | 'completed' | 'waiting_for_approval' | 'rejected';
  due_date: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  is_common_task: boolean;
  custom_xp_award: number | null; // New field for custom XP
  custom_due_days: number | null; // New field for custom due days
  profiles: {
    full_name: string;
  } | null; // For assigned_to user's name
  assigner_profile: {
    full_name: string;
  } | null; // For assigned_by user's name
}