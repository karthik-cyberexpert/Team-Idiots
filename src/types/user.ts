export interface User {
  id: string;
  full_name: string;
  email: string;
  role: 'admin' | 'user';
  xp: number;
  game_points: number;
  created_at: string;
  avatar_url?: string;
}