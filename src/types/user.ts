export interface User {
  id: string;
  full_name: string;
  email: string;
  role: 'admin' | 'user';
  xp: number; // Added XP field
  created_at: string;
}