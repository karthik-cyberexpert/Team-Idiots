import { serve } from "https://deno.land/std@0.200.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.47.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { userId, xpChange, reason, relatedTaskId } = await req.json() // Added relatedTaskId

    if (!userId || typeof xpChange !== 'number' || !reason) {
      throw new Error("User ID, XP change amount, and reason are required.")
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Update user's XP in the profiles table
    const { data: profile, error: fetchProfileError } = await supabaseAdmin
      .from('profiles')
      .select('xp')
      .eq('id', userId)
      .single();

    if (fetchProfileError) throw fetchProfileError;
    if (!profile) throw new Error("User profile not found.");

    const newXp = Math.max(0, profile.xp + xpChange); // Ensure XP doesn't go below 0

    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({ xp: newXp })
      .eq('id', userId);

    if (updateError) throw updateError;

    // Log the XP change in xp_history
    const { error: logError } = await supabaseAdmin
      .from('xp_history')
      .insert({
        user_id: userId,
        xp_change: xpChange,
        reason: reason, // Use the provided reason directly
        related_task_id: relatedTaskId || null, // Log related task ID if provided
      });

    if (logError) throw logError;

    return new Response(
      JSON.stringify({ message: "User XP updated successfully" }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})