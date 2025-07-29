export interface Challenge {
  id: string;
  title: string;
  description: string | null;
  xp_reward: number;
  game_points_reward: number;
  type: 'one-time' | 'daily' | 'weekly';
  is_active: boolean;
  created_at: string;
  expires_at: string | null;
  challenge_type: 'manual' | 'task_completion' | 'typer_goal' | 'typer_multi_text_timed'; // Added new type
  related_task_id: string | null;
  typer_wpm_goal: number | null;
  typer_accuracy_goal: number | null;
  typing_text_id: string | null;
  typing_text_ids: string[] | null; // New: Array of typing text IDs for multi-text challenges
  time_limit_seconds: number | null; // New: Overall time limit for multi-text challenges
}

export interface ChallengeCompletion {
  id: string;
  user_id: string;
  challenge_id: string;
  completed_at: string;
}