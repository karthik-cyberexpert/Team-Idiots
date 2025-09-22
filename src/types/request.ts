import { User } from './user';
import { PowerUpType } from './auction';

export interface Request {
  id: string;
  requester_id: string;
  recipient_id: string | null;
  is_global: boolean;
  request_type: 'gp' | 'xp' | 'power_up';
  amount: number | null;
  power_up_type: PowerUpType | null;
  message: string;
  status: 'pending' | 'approved' | 'denied' | 'cancelled';
  created_at: string;
  requester: Pick<User, 'id' | 'full_name'>;
  recipient: Pick<User, 'id' | 'full_name'> | null;
}