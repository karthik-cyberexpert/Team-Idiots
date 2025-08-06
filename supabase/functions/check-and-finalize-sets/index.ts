import { serve } from "https://deno.land/std@0.200.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.47.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // This function should be called by a cron job.
  const authHeader = req.headers.get('Authorization')
  const functionSecret = Deno.env.get('FINALIZE_CHALLENGE_SECRET')

  if (!functionSecret || authHeader !== `Bearer ${functionSecret}`) {
    return new Response("Unauthorized: Incorrect or missing secret.", { status: 401 })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // 1. Find sets that are published, not yet finalized, and have an end time.
    const { data: sets, error: fetchError } = await supabaseAdmin
      .from('typer_sets')
      .select('id, assign_date, end_time')
      .eq('status', 'published')
      .eq('is_finalized', false)
      .not('assign_date', 'is', null)
      .not('end_time', 'is', null);

    if (fetchError) throw fetchError;

    const now = new Date();
    let finalizedCount = 0;

    for (const set of sets) {
      const [endH, endM] = set.end_time.split(':').map(Number);
      const endDateTime = new Date(set.assign_date);
      endDateTime.setUTCHours(endH, endM, 0, 0); // Assuming end_time is in UTC

      // 2. Check if the set's end time has passed
      if (now > endDateTime) {
        console.log(`Finalizing set ${set.id} which ended at ${endDateTime.toISOString()}`);

        // 3. Call the existing finalization function
        const { error: invokeError } = await supabaseAdmin.functions.invoke('finalize-daily-typer-challenge', {
          headers: {
            Authorization: `Bearer ${functionSecret}`
          }
        });

        if (invokeError) {
          console.error(`Error invoking finalize function for set ${set.id}:`, invokeError);
          continue;
        }

        // 4. Mark the set as finalized to prevent re-running
        const { error: updateError } = await supabaseAdmin
          .from('typer_sets')
          .update({ is_finalized: true })
          .eq('id', set.id);

        if (updateError) {
          console.error(`Error marking set ${set.id} as finalized:`, updateError);
        } else {
          finalizedCount++;
          // The daily bonus logic runs for the whole day, so we only need to run it once.
          break;
        }
      }
    }

    return new Response(
      JSON.stringify({ message: `Checked for sets to finalize. Finalized ${finalizedCount} set(s).` }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})