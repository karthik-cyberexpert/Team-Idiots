// @ts-nocheck
import { serve } from "https://deno.land/std@0.200.0/http/server.ts"
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.47.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// --- Reward Generation Logic ---
const REWARD_POOL = [
  { type: 'gp', amount: 1000 },
  { type: 'gp', amount: 2500 },
  { type: 'gp', amount: 5000 },
  { type: 'gp', amount: 10000 },
  { type: 'gp', amount: 25000 },
  { type: 'power_up', power: 'shield', uses: 1, effect: null },
  { type: 'power_up', power: '2x_boost', uses: 1, effect: null },
  { type: 'power_up', power: '4x_boost', uses: 1, effect: null },
  { type: 'power_up', power: 'attack', effect: 10, uses: 1 },
  { type: 'power_up', power: 'gp_transfer', effect: 10, uses: 1 },
  { type: 'nothing', amount: 0 },
  { type: 'nothing', amount: 0 },
  { type: 'nothing', amount: 0 },
];

function shuffle(array: any[]) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function generateRewards() {
  const shuffledPool = shuffle([...REWARD_POOL]);
  return shuffledPool.slice(0, 7);
}
// --- End Reward Generation Logic ---

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Dual authorization check for cron job secret or admin JWT
    const authHeader = req.headers.get('Authorization')!
    const functionSecret = Deno.env.get('FINALIZE_CHALLENGE_SECRET')
    let isAuthorized = false;

    if (authHeader === `Bearer ${functionSecret}`) {
      isAuthorized = true;
    } else {
      const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_ANON_KEY') ?? '',
        { global: { headers: { Authorization: authHeader } } }
      )
      const { data: { user } } = await supabaseClient.auth.getUser()
      if (user) {
        const { data: profile } = await supabaseClient.from('profiles').select('role').eq('id', user.id).single()
        if (profile?.role === 'admin') {
          isAuthorized = true;
        }
      }
    }

    if (!isAuthorized) {
      return new Response("Unauthorized", { status: 401, headers: corsHeaders })
    }
    // End authorization check

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const today = new Date().toISOString().split('T')[0];

    const { data: pairs, error: pairsError } = await supabaseAdmin
      .from('buddies')
      .select('id');
    if (pairsError) throw pairsError;
    if (!pairs || pairs.length === 0) {
      return new Response(JSON.stringify({ message: "No active buddy pairs found." }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { data: existingRewards, error: existingError } = await supabaseAdmin
      .from('buddy_daily_rewards')
      .select('buddy_pair_id')
      .eq('reward_date', today);
    if (existingError) throw existingError;
    const existingPairIds = new Set(existingRewards.map(r => r.buddy_pair_id));

    const pairsToProcess = pairs.filter(p => !existingPairIds.has(p.id));

    if (pairsToProcess.length === 0) {
      return new Response(JSON.stringify({ message: "All pairs already have rewards for today." }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const rewardsToInsert = pairsToProcess.map(pair => ({
      buddy_pair_id: pair.id,
      reward_date: today,
      rewards: generateRewards(),
    }));

    const { error: insertError } = await supabaseAdmin
      .from('buddy_daily_rewards')
      .insert(rewardsToInsert);
    if (insertError) throw insertError;

    return new Response(
      JSON.stringify({ message: `Successfully generated rewards for ${rewardsToInsert.length} buddy pairs.` }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})