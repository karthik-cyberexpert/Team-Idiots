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
  created_at: string;
  quiz_questions: QuizQuestion[];
  reward_type: 'gp' | 'xp';
  points_per_question: number;
  time_limit_minutes: number | null;
  enrollment_deadline: string | null;
}