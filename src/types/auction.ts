export interface MysteryBoxContent {
  type: 'gp' | 'xp';
  amount: number;
}

export interface AuctionItem {
  id: string;
  name: string;
  description: string | null;
  starting_price: number;
  created_by: string;
  created_at: string;
  is_mystery_box: boolean;
  mystery_box_contents: MysteryBoxContent[] | null;
}

export interface Auction {
  id: string;
  item_id: string;
  start_time: string;
  end_time: string;
  current_price: number;
  current_highest_bidder: string | null;
  status: 'scheduled' | 'active' | 'ended' | 'cancelled';
  created_at: string;
  is_claimed: boolean;
  auction_items: {
    name: string;
    description: string | null;
    is_mystery_box: boolean;
  };
  profiles: {
    full_name: string | null;
  } | null;
}

export interface Bid {
  id: string;
  auction_id: string;
  user_id: string;
  bid_amount: number;
  created_at: string;
}