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

    // 1. Check for an existing buddy pair
    const { data: buddyPairData, error: buddyError } = await supabase
      .from('buddies')
      .select('id, user_one_id, user_two_id')
      .or(`user_one_id.eq.${user.id},user_two_id.eq.${user.id}`)
      .single();
    if (buddyError && buddyError.code !== 'PGRST116') throw buddyError;

    let buddyPair = null;
    if (buddyPairData) {
      const buddyId = buddyPairData.user_one_id === user.id ? buddyPairData.user_two_id : buddyPairData.user_one_id;
      const { data: buddyProfile, error: profileError } = await supabase.from('profiles').select('id, full_name, avatar_url').eq('id', buddyId).single();
      if (profileError) throw profileError;
      buddyPair = { id: buddyPairData.id, buddy: buddyProfile };
    }

    // 2. Get incoming invitations
    const { data: receivedInvitations, error: receivedError } = await supabase
      .from('buddy_invitations')
      .select('id, sender:sender_id(full_name)')
      .eq('receiver_id', user.id)
      .eq('status', 'pending');
    if (receivedError) throw receivedError;

    // 3. Get outgoing invitations
    const { data: sentInvitations, error: sentError } = await supabase
      .from('buddy_invitations')
      .select('id, receiver:receiver_id(full_name)')
      .eq('sender_id', user.id)
      .eq('status', 'pending');
    if (sentError) throw sentError;

    // 4. Get available users to invite
    let availableUsers = [];
    if (!buddyPair) {
      const { data: users, error: usersError } = await supabase.rpc('get_available_buddies');
      if (usersError) throw usersError;
      availableUsers = users;
    }

    return new Response(JSON.stringify({
      buddyPair,
      receivedInvitations,
      sentInvitations,
      availableUsers
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
})