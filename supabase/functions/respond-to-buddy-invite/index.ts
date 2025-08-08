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
    const { invitationId, response } = await req.json();
    if (!invitationId || !response) throw new Error("Invitation ID and response are required.");
    if (response !== 'accepted' && response !== 'rejected') throw new Error("Invalid response.");

    const supabase = await getAuthenticatedClient(req);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated.");

    if (response === 'accepted') {
      const { error } = await supabase.rpc('accept_buddy_invite', { invitation_id: invitationId });
      if (error) throw error;
    } else { // rejected
      const { error } = await supabase
        .from('buddy_invitations')
        .update({ status: 'rejected', updated_at: new Date().toISOString() })
        .eq('id', invitationId)
        .eq('receiver_id', user.id);
      if (error) throw error;
    }

    return new Response(JSON.stringify({ message: `Invitation ${response}.` }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
})