import { serve } from "https://deno.land/std@0.200.0/http/server.ts"
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.47.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function getAuthenticatedClient(req: Request): Promise<SupabaseClient> {
  const authHeader = req.headers.get('Authorization')!
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { global: { headers: { Authorization: authHeader } } }
  )
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = await getAuthenticatedClient(req);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated.");

    const { pairId } = await req.json();
    if (!pairId) throw new Error("Buddy pair ID is required.");

    const today = new Date().toISOString().split('T')[0];
    const weekStartDate = new Date();
    weekStartDate.setDate(weekStartDate.getDate() - (weekStartDate.getDay() + 6) % 7);
    const weekStartString = weekStartDate.toISOString().split('T')[0];

    const { data: myActivity } = await supabase
      .from('buddy_daily_activity')
      .select('*')
      .eq('user_id', user.id)
      .eq('activity_date', today)
      .single();

    const { data: buddyPair } = await supabase.from('buddies').select('user_one_id, user_two_id').eq('id', pairId).single();
    if (!buddyPair) throw new Error("Buddy pair not found.");
    const buddyId = buddyPair.user_one_id === user.id ? buddyPair.user_two_id : buddyPair.user_one_id;

    const { data: buddyActivity } = await supabase
      .from('buddy_daily_activity')
      .select('*')
      .eq('user_id', buddyId)
      .eq('activity_date', today)
      .single();

    const { data: dailyRewards } = await supabase.from('buddy_daily_rewards').select('*').eq('buddy_pair_id', pairId).eq('reward_date', today).single();

    const { data: progress } = await supabase.from('buddy_weekly_progress').select('*').eq('buddy_pair_id', pairId).eq('week_start_date', weekStartString).single();

    return new Response(JSON.stringify({
      myActivity: myActivity || null,
      buddyActivity: buddyActivity || null,
      dailyRewards: dailyRewards || null,
      progress: progress || null,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
})