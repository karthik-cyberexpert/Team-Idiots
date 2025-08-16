import { PowerUpType } from "@/types/auction";

export interface UserPowerUp {
  id: string;
  power_type: PowerUpType;
  expires_at: string | null;
  is_used: boolean;
  created_at: string;
  effect_value: number | null;
  uses_left: number;
}