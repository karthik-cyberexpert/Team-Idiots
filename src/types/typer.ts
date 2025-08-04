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
  start_time: string | null;
  end_time: string | null;
}

export interface TypingTextWithSet extends TypingText {
  typer_sets: TyperSet | null;
}