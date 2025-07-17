export interface Game {
  id: string;
  title: string;
  description: string | null;
  file_url: string;
  uploaded_by: string;
  created_at: string;
  updated_at: string;
  uploader_name?: string; // For displaying the uploader's name
}