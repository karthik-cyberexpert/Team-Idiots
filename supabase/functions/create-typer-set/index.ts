import { serve } from "https://deno.land/std@0.200.0/http/server.ts"
import { createClient } 'https://esm.sh/@supabase/supabase-js@2.47.0'

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
    
    if (setError) {
      console.error('Error creating typer set:', setError)
      throw setError
    }

    // 2. Prepare texts with the new set_id
    const textsToInsert = texts.map((text, index) => {
      if (!text.title || !text.content) {
        throw new Error(`Text at index ${index} must have 'title' and 'content' properties.`);
      }
      return {
        title: text.title,
        content: text.content,
        set_id: set.id,
      }
    })

    // 3. Insert the texts in batches to avoid exceeding query limits
    const batchSize = 500;
    for (let i = 0; i < textsToInsert.length; i += batchSize) {
      const batch = textsToInsert.slice(i, i + batchSize);
      const { error: batchError } = await supabaseAdmin
        .from('typing_texts')
        .insert(batch);

      if (batchError) {
        console.error(`Error inserting batch of texts:`, batchError);
        // Rollback: delete the set if any batch fails to insert
        await supabaseAdmin.from('typer_sets').delete().eq('id', set.id);
        throw batchError;
      }
    }

    return new Response(
      JSON.stringify({ message: "Typer set created successfully." }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Create Typer Set Edge Function Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})