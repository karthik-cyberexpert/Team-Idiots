export interface GiftedPowerUp {
  power: PowerUpType;
  effect_value: number | null;
  uses_left: number;
}

export interface GiftPayload {
  type: 'gp' | 'xp' | 'power_up';
  amount?: number;
  power_up?: GiftedPowerUp;
  sender_name: string;
  message: string;
  is_claimed?: boolean;
}

export interface RequestPayload {
  type: 'resource_request';
  requester_id: string;
  requester_name: string;
  request_type: 'gp' | 'xp';
  amount?: number;
  status: 'pending' | 'fulfilled' | 'rejected';
  is_global?: boolean; // Added this line
}

export interface Notification {
  id: string;
  user_id: string;
  message: string;
  is_read: boolean;
  link_to: string | null;
  created_at: string;
  gift_payload: GiftPayload | RequestPayload | null;
}