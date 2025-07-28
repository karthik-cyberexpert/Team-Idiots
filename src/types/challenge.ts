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
  challenge_type: 'manual' | 'task_completion' | 'typer_goal';
  related_task_id: string | null;
  typer_wpm_goal: number | null;
  typer_accuracy_goal: number | null;
}

export interface ChallengeCompletion {
  id: string;
  user_id: string;
  challenge_id: string;
  completed_at: string;
}