export interface TypingText {
  id: string;
  title: string;
  content: string;
}

export interface TyperSet {
  id: string;
  title: string;
  status: 'draft' | 'published' | 'inactive';
  assign_date: string | null;
  created_at: string;
  typing_texts: TypingText[];
}