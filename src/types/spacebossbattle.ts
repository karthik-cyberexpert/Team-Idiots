import { User } from "./user";

export type ChallengeMode = 'programming' | 'software' | 'learning';
export type BattleStatus = 'scheduled' | 'lobby' | 'in_progress' | 'ended';

export interface ChallengeSet {
  id: string;
  title: string;
  mode: ChallengeMode;
  // Placeholder for complex challenge data (JSON/HTML reference)
  data_reference_id: string; 
}

export interface PlayerShip {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  damage_dealt: number;
  streak: number;
  is_host: boolean;
  // Real-time state for visual updates
  is_firing: boolean;
}

export interface BossBattle {
  id: string;
  title: string;
  status: BattleStatus;
  challenge_set_id: string;
  challenge_set: ChallengeSet;
  host_id: string;
  difficulty: 'easy' | 'medium' | 'hard' | 'global';
  start_time: string;
  duration_minutes: number;
  base_hp: number;
  current_hp: number;
  max_players: number;
  // Real-time game state
  game_state: {
    boss_hp: number;
    total_damage: number;
    dda_multiplier: number; // Dynamic Difficulty Adjustment
    battle_feed: { message: string; timestamp: string }[];
  };
  players: PlayerShip[];
  host?: Pick<User, 'id' | 'full_name'>;
}