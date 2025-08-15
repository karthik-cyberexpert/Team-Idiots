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

export interface LudoSession {
  id: string;
  join_code: string;
  host_id: string;
  status: 'waiting' | 'in_progress' | 'completed';
  max_players: number;
  current_player_index: number;
  game_state: {
    dice: number;
    players: {
      [playerNumber: string]: {
        pieces: number[]; // Array of piece positions (0-56, 0 for home, 57 for finished)
        finished_pieces: number;
      };
    };
  };
  winner_id: string | null;
  created_at: string;
  updated_at: string;
  host?: Pick<User, 'id' | 'full_name'>;
  winner?: Pick<User, 'id' | 'full_name'>;
}

export interface LudoParticipant {
  session_id: string;
  user_id: string;
  player_number: number;
  is_ready: boolean;
  created_at: string;
  profile?: Pick<User, 'id' | 'full_name' | 'avatar_url'>;
}