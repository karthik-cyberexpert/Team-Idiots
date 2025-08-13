// @ts-nocheck
import { serve } from "https://deno.land/std@0.200.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.47.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // This function is designed to be called by a scheduled job (cron).
  const authHeader = req.headers.get('Authorization')
  const functionSecret = Deno.env.get('FINALIZE_CHALLENGE_SECRET')

  if (!functionSecret || authHeader !== `Bearer ${functionSecret}`) {
    return new Response("Unauthorized", { status: 401 })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const now = new Date().toISOString();

    // Find published quizzes whose enrollment deadline has passed and update their status.
    const { data: updatedQuizzes, error } = await supabaseAdmin
      .from('quiz_sets')
      .update({ status: 'inactive' })
      .eq('status', 'published')
      .not('enrollment_deadline', 'is', null)
      .lte('enrollment_deadline', now)
      .select('id');

    if (error) {
      console.error("Error updating quiz statuses:", error);
      throw error;
    }

    const message = `Quiz status update complete. ${updatedQuizzes?.length || 0} quiz(zes) moved to inactive.`;

    return new Response(
      JSON.stringify({ message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})