import { PowerUpType } from "./auction";

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

export interface Notification {
  id: string;
  user_id: string;
  message: string;
  is_read: boolean;
  link_to: string | null;
  created_at: string;
  gift_payload: GiftPayload | null;
}