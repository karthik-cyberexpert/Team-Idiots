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
    const { id, status, reward_type, points_per_question, time_limit_minutes, enrollment_deadline } = await req.json()
    if (!id) {
      throw new Error("ID is required.")
    }

    const updatePayload: { 
        status?: string; 
        reward_type?: 'gp' | 'xp';
        points_per_question?: number;
        time_limit_minutes?: number | null;
        enrollment_deadline?: string | null;
    } = {};
    if (status) updatePayload.status = status;
    if (reward_type) updatePayload.reward_type = reward_type;
    if (points_per_question !== undefined) updatePayload.points_per_question = points_per_question;
    if (time_limit_minutes !== undefined) updatePayload.time_limit_minutes = time_limit_minutes;
    if (enrollment_deadline !== undefined) updatePayload.enrollment_deadline = enrollment_deadline;


    if (Object.keys(updatePayload).length === 0) {
      throw new Error("At least one field must be provided for update.")
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const { data, error } = await supabaseAdmin
      .from('quiz_sets')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error;

    return new Response(
      JSON.stringify(data),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})