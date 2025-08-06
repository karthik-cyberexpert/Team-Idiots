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
    console.log('Edge function called - create-typer-set')
    
    // Check environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    console.log('Environment check:', {
      hasUrl: !!supabaseUrl,
      hasKey: !!supabaseKey,
      urlLength: supabaseUrl?.length ?? 0,
      keyLength: supabaseKey?.length ?? 0
    })
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing required environment variables: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
    }
    
    const { title, texts } = await req.json()
    console.log('Request data:', { title, textsCount: texts?.length, hasTexts: Array.isArray(texts) })
    
    if (!title || !Array.isArray(texts) || texts.length === 0) {
      throw new Error("Title and a non-empty array of texts are required.")
    }

    const supabaseAdmin = createClient(
      supabaseUrl,
      supabaseKey,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )
    
    console.log('Supabase client created successfully')

    // 1. Create the typer set
    console.log('Creating typer set with title:', title)
    const { data: set, error: setError } = await supabaseAdmin
      .from('typer_sets')
      .insert({ title: title, status: 'draft' })
      .select()
      .single()
    
    if (setError) {
      console.error('Error creating typer set:', setError)
      throw setError
    }
    console.log('Typer set created successfully:', set)

    // 2. Prepare texts with the new set_id
    console.log('Preparing texts for insertion, count:', texts.length)
    const textsToInsert = texts.map((text, index) => {
      if (!text.title || !text.content) {
        console.error(`Text at index ${index} is missing required fields:`, { title: !!text.title, content: !!text.content })
        throw new Error(`Text at index ${index} must have 'title' and 'content' properties.`);
      }
      return {
        title: text.title,
        content: text.content,
        set_id: set.id,
      }
    })
    console.log('Texts prepared for insertion:', textsToInsert.length)

    // 3. Insert the texts
    console.log('Inserting texts into database')
    const { error: textsError } = await supabaseAdmin
      .from('typing_texts')
      .insert(textsToInsert)
    
    if (textsError) {
      console.error('Error inserting texts:', textsError)
      // Rollback: delete the set if texts fail to insert
      console.log('Rolling back typer set creation')
      await supabaseAdmin.from('typer_sets').delete().eq('id', set.id)
      throw textsError
    }
    
    console.log('All texts inserted successfully')

    return new Response(
      JSON.stringify({ message: "Typer set created successfully." }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Edge function error:', error)
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    })
    
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})