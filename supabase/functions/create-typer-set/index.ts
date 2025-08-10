import { serve } from "https://deno.land/std@0.200.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.47.0"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Create a Supabase client with the user's auth token to check their role
    const userSupabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { data: { user } } = await userSupabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: 'Not authenticated' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { data: profile, error: profileError } = await userSupabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile || profile.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Not authorized' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Now that the user is verified as an admin, proceed with the service_role client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { title, texts } = await req.json()
    if (!title || !Array.isArray(texts) || texts.length === 0) {
      throw new Error("Title and a non-empty array of texts are required.")
    }

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