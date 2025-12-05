
export type GameMode = 'programming' | 'software' | 'learning';
export type BattleStatus = 'scheduled' | 'active' | 'completed' | 'cancelled';
export type DifficultyLevel = 'easy' | 'medium' | 'hard' | 'insane';

export interface SpaceQuestion {
  id: string;
  title: string;
  description?: string;
  mode: GameMode;
  difficulty: DifficultyLevel;
  content: any; // JSONB content depending on mode
  created_at: string;
  created_by?: string;
}

export interface SpaceBattle {
  id: string;
  title: string;
  status: BattleStatus;
  mode: GameMode;
  difficulty: DifficultyLevel;
  start_time: string;
  end_time?: string;
  base_hp: number;
  current_hp: number;
  is_global_event: boolean;
  question_set_id?: string;
  created_at: string;
  created_by?: string;
}

export interface SpaceBattleParticipant {
  id: string;
  battle_id: string;
  user_id: string;
  score: number;
  damage_dealt: number;
  joined_at: string;
}

export interface SpaceBattleLog {
  id: string;
  battle_id: string;
  user_id?: string;
  action_type: 'hit' | 'miss' | 'join' | 'defeat';
  damage: number;
  message?: string;
  created_at: string;
}
