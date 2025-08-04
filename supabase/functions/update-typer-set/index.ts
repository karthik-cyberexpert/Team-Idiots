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
    const { id, status, assign_date, start_time, end_time } = await req.json()
    if (!id) {
      throw new Error("ID is required.")
    }

    const updatePayload: { status?: string; assign_date?: string; start_time?: string; end_time?: string; } = {};
    if (status) updatePayload.status = status;
    if (assign_date) updatePayload.assign_date = assign_date;
    if (start_time) updatePayload.start_time = start_time;
    if (end_time) updatePayload.end_time = end_time;


    if (Object.keys(updatePayload).length === 0) {
      throw new Error("At least one field must be provided for update.")
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const { data, error } = await supabaseAdmin
      .from('typer_sets')
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