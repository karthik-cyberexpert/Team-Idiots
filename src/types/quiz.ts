export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correct_option_index: number;
}

export interface QuizSet {
  id: string;
  title: string;
  status: 'draft' | 'published' | 'inactive';
  assign_date: string | null;
  created_at: string;
  quiz_questions: QuizQuestion[];
  start_time: string | null;
  end_time: string | null;
  reward_type: 'gp' | 'xp';
  points_per_question: number;
}