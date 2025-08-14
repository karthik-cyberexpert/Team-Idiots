import { BoxContent } from "./store";

export interface GiftPayload {
  type: 'gp' | 'xp' | 'power_up';
  amount?: number;
  power_up?: BoxContent;
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