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
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const { orderedIds } = await req.json()
    if (!Array.isArray(orderedIds)) {
      throw new Error("An array of ordered section IDs is required.")
    }

    const updates = orderedIds.map((id, index) => 
      supabaseAdmin.from('store_sections').update({ position: index }).eq('id', id)
    );

    const results = await Promise.all(updates);
    const firstError = results.find(res => res.error);
    if (firstError) throw firstError.error;

    return new Response(
      JSON.stringify({ message: "Section order updated successfully." }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})