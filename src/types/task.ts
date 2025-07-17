export interface Task {
  id: string;
  title: string;
  description: string | null;
  assigned_to: string;
  assigned_by: string;
  status: 'pending' | 'completed';
  due_date: string | null;
  created_at: string;
  updated_at: string;
  profiles: {
    full_name: string;
  } | null; // For assigned_to user's name
  assigner_profile: {
    full_name: string;
  } | null; // For assigned_by user's name
}