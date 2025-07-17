import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

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

      const customAwards = newRecord.custom_awards;
      let awarded = false;

      if (customAwards && customAwards.length > 0) {
        const time_diff_hours = newRecord.due_date 
          ? (new Date(newRecord.due_date).getTime() - new Date(newRecord.completed_at).getTime()) / (1000 * 60 * 60)
          : null;

        // Sort custom awards by dueDays in ascending order to find the best match
        customAwards.sort((a: any, b: any) => (a.due_days || Infinity) - (b.due_days || Infinity));

        for (const award of customAwards) {
          if (award.due_days !== null) {
            // If due_days is set, check if completed within that many days from creation
            const created_at_date = new Date(newRecord.created_at);
            const due_date_from_creation = new Date(created_at_date.getTime() + award.due_days * 24 * 60 * 60 * 1000);
            
            if (new Date(newRecord.completed_at) <= due_date_from_creation) {
              xp_amount = award.xp;
              reason_text = `Task completed early (within ${award.due_days} days): ${newRecord.title}`;
              awarded = true;
              break; // Take the first matching award (which is the earliest due_days due to sorting)
            }
          } else {
            // If due_days is null, it's a general award for completion
            xp_amount = award.xp;
            reason_text = `Task completed: ${newRecord.title}`;
            awarded = true;
            break; // Take this general award if no time-based award was met
          }
        }
      }

      if (!awarded) {
        // Fallback to original XP calculation if no custom awards or no match
        if (newRecord.due_date) {
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
        } else { // If there's no due date and no custom XP, award a standard amount.
          xp_amount = 3;
        }
        reason_text = `Task completed: ${newRecord.title}`;
      }

      // Update the user's profile with the calculated XP.
      const { error: updateProfileError } = await supabaseAdmin
        .from('profiles')
        .update({ xp: (oldRecord.xp || 0) + xp_amount }) // Assuming oldRecord.xp is available or default to 0
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
      const { error: updateProfileError } = await supabaseAdmin
        .from('profiles')
        .update({ xp: Math.max(0, (oldRecord.xp || 0) + xp_amount) })
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