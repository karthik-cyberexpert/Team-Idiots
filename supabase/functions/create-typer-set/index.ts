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
    const { title, texts } = await req.json()
    if (!title || !Array.isArray(texts) || texts.length === 0) {
      throw new Error("Title and a non-empty array of texts are required.")
    }
    if (texts.length !== 35) {
      throw new Error("Exactly 35 typing texts must be provided for a weekly set.");
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // 1. Create the typer set
    const { data: set, error: setError } = await supabaseAdmin
      .from('typer_sets')
      .insert({ title: title, status: 'draft' })
      .select()
      .single()
    if (setError) throw setError

    // 2. Prepare texts with the new set_id
    const textsToInsert = texts.map(text => {
      if (!text.header || !text.code) {
        throw new Error("Each text object must have 'header' and 'code' properties.");
      }
      return {
        title: text.header,
        content: text.code,
        set_id: set.id,
      }
    })

    // 3. Insert the texts
    const { error: textsError } = await supabaseAdmin
      .from('typing_texts')
      .insert(textsToInsert)
    if (textsError) {
      // Rollback: delete the set if texts fail to insert
      await supabaseAdmin.from('typer_sets').delete().eq('id', set.id)
      throw textsError
    }

    return new Response(
      JSON.stringify({ message: "Typer set created successfully." }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})