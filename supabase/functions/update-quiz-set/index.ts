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
    const { id, status, assign_date, start_time, end_time, reward_type, points_per_question } = await req.json()
    if (!id) {
      throw new Error("ID is required.")
    }

    const updatePayload: { 
        status?: string; 
        assign_date?: string | null; 
        start_time?: string | null; 
        end_time?: string | null; 
        reward_type?: 'gp' | 'xp';
        points_per_question?: number;
    } = {};
    if (status) updatePayload.status = status;
    if (assign_date !== undefined) updatePayload.assign_date = assign_date;
    if (start_time !== undefined) updatePayload.start_time = start_time;
    if (end_time !== undefined) updatePayload.end_time = end_time;
    if (reward_type) updatePayload.reward_type = reward_type;
    if (points_per_question !== undefined) updatePayload.points_per_question = points_per_question;


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