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
    const { taskId, marksAwarded, xpAwarded } = await req.json()

    if (!taskId || typeof marksAwarded !== 'number' || typeof xpAwarded !== 'number') {
      throw new Error("Task ID, marks awarded, and XP awarded are required.")
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const { error } = await supabaseAdmin
      .from('tasks')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        marks_awarded: marksAwarded,
        xp_awarded_manual: xpAwarded,
      })
      .eq('id', taskId);

    if (error) throw error;

    return new Response(
      JSON.stringify({ message: "Task completion details updated successfully" }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})