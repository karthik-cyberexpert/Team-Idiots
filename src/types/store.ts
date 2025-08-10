import { PowerUpType } from "@/types/auction";

export type StoreItemType = 'power_up' | 'xp_pack' | 'mystery_box' | 'power_box';

export interface BoxContent {
  type: 'gp' | 'xp' | 'power_up' | 'nothing';
  amount?: number;
  power?: PowerUpType;
  weight: number;
}

export interface StoreItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  item_type: StoreItemType;
  is_active: boolean;
  power_up_type: PowerUpType | null;
  xp_amount: number | null;
  box_contents: BoxContent[] | null;
  created_at: string;
}