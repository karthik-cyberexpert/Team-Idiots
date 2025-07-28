export interface Challenge {
  id: string;
  title: string;
  description: string | null;
  xp_reward: number;
  type: 'one-time' | 'daily' | 'weekly';
  is_active: boolean;
  created_at: string;
  expires_at: string | null;
}

export interface ChallengeCompletion {
  id: string;
  user_id: string;
  challenge_id: string;
  completed_at: string;
}