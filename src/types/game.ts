import { User } from './user';

export interface GameSession {
  id: string;
  game_type: 'tic-tac-toe';
  host_id: string;
  opponent_id: string | null;
  status: 'waiting' | 'in_progress' | 'completed';
  game_state: {
    board: (string | null)[];
    current_turn: string; // user id
    // 'X' is host, 'O' is opponent
  };
  winner_id: string | null;
  join_code: string;
  created_at: string;
  host?: Pick<User, 'id' | 'full_name'>;
  opponent?: Pick<User, 'id' | 'full_name'>;
}