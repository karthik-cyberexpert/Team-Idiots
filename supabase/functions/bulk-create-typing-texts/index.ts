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
    const textsToUpload = await req.json()
    if (!Array.isArray(textsToUpload)) {
      throw new Error("Request body must be an array of texts.");
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const textsToInsert = textsToUpload.map(text => {
      if (!text.header || !text.code) {
        throw new Error("Each text object must have 'header' and 'code' properties.");
      }
      return {
        title: text.header,
        content: text.code,
      };
    });

    if (textsToInsert.length === 0) {
      return new Response(
        JSON.stringify({ message: "No texts to upload." }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { error } = await supabaseAdmin
      .from('typing_texts')
      .insert(textsToInsert);

    if (error) throw error;

    return new Response(
      JSON.stringify({ message: `${textsToInsert.length} texts uploaded successfully.` }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})