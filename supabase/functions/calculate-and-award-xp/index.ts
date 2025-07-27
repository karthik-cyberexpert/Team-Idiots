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
    const payload = await req.json();
    const oldRecord = payload.old_record;
    const newRecord = payload.new_record;

    // Create a Supabase client with the service role key to bypass RLS
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    let xp_amount = 0;
    let reason_text = '';

    // Handle task completion
    if (newRecord.status === 'completed' && oldRecord.status !== 'completed') {
      // If completed_at is not already set, set it to the current time.
      if (!newRecord.completed_at) {
        newRecord.completed_at = new Date().toISOString();
      }

      // Determine XP amount: prioritize manual award, then due date calculation, then default
      if (typeof newRecord.xp_awarded_manual === 'number' && newRecord.xp_awarded_manual !== null) {
        xp_amount = newRecord.xp_awarded_manual;
        reason_text = `Task completed (manual award): ${newRecord.title}`;
      } else if (newRecord.due_date) {
        const time_diff_hours = (new Date(newRecord.due_date).getTime() - new Date(newRecord.completed_at).getTime()) / (1000 * 60 * 60);

        if (time_diff_hours >= 48) { // More than 2 days early
          xp_amount = 10;
        } else if (time_diff_hours >= 24) { // 1 to 2 days early
          xp_amount = 8;
        } else if (time_diff_hours > 0) { // Less than 1 day early
          xp_amount = 5;
        } else { // Completed late or on time
          xp_amount = 3;
        }
        reason_text = `Task completed: ${newRecord.title}`;
      } else { // If there's no due date and no manual XP, award a standard amount.
        xp_amount = 3;
        reason_text = `Task completed: ${newRecord.title}`;
      }

      // Update the user's profile with the calculated XP.
      const { data: profile, error: fetchProfileError } = await supabaseAdmin
        .from('profiles')
        .select('xp')
        .eq('id', newRecord.assigned_to)
        .single();

      if (fetchProfileError) throw fetchProfileError;
      if (!profile) throw new Error("User profile not found.");

      const { error: updateProfileError } = await supabaseAdmin
        .from('profiles')
        .update({ xp: profile.xp + xp_amount })
        .eq('id', newRecord.assigned_to);

      if (updateProfileError) throw updateProfileError;

      // Log XP change
      const { error: logXpError } = await supabaseAdmin
        .from('xp_history')
        .insert({ user_id: newRecord.assigned_to, xp_change: xp_amount, reason: reason_text, related_task_id: newRecord.id });

      if (logXpError) throw logXpError;

    } else if (newRecord.status === 'rejected' && oldRecord.status !== 'rejected') {
      xp_amount = -50; // Deduct 50 XP
      reason_text = `Task rejected: ${newRecord.title}`;

      // Update the user's profile by deducting XP. Ensure XP doesn't go below 0.
      const { data: profile, error: fetchProfileError } = await supabaseAdmin
        .from('profiles')
        .select('xp')
        .eq('id', newRecord.assigned_to)
        .single();

      if (fetchProfileError) throw fetchProfileError;
      if (!profile) throw new Error("User profile not found.");

      const { error: updateProfileError } = await supabaseAdmin
        .from('profiles')
        .update({ xp: Math.max(0, profile.xp + xp_amount) })
        .eq('id', newRecord.assigned_to);

      if (updateProfileError) throw updateProfileError;

      // Log XP change
      const { error: logXpError } = await supabaseAdmin
        .from('xp_history')
        .insert({ user_id: newRecord.assigned_to, xp_change: xp_amount, reason: reason_text, related_task_id: newRecord.id });

      if (logXpError) throw logXpError;
    }

    return new Response(
      JSON.stringify({ message: "XP calculation and award processed" }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})