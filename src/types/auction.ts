export interface AuctionItem {
  id: string;
  name: string;
  description: string | null;
  starting_price: number;
  created_by: string;
  created_at: string;
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
  auction_items: {
    name: string;
    description: string | null;
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