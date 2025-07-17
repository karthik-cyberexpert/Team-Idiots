export interface CodeDocument {
  id: string;
  title: string;
  content: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  profiles: {
    full_name: string;
  } | null; // For displaying the creator's name
}