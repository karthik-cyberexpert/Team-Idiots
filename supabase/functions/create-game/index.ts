import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Function to get an authenticated Supabase client
async function getSupabaseClient(req: Request): Promise<SupabaseClient> {
  const authHeader = req.headers.get('Authorization')!
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { global: { headers: { Authorization: authHeader } } }
  )
  return supabase
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = await getSupabaseClient(req);
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new Error("User not authenticated.");
    }

    const formData = await req.formData();
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const gameFile = formData.get('gameFile') as File;

    if (!title || !gameFile) {
      throw new Error("Title and game file are required.");
    }

    // Upload file to Supabase Storage
    const filePath = `${user.id}/${Date.now()}-${gameFile.name}`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('games')
      .upload(filePath, gameFile, {
        contentType: gameFile.type,
        upsert: false,
      });

    if (uploadError) {
      throw new Error(`File upload failed: ${uploadError.message}`);
    }

    const fileUrl = `${Deno.env.get('SUPABASE_URL')}/storage/v1/object/public/games/${filePath}`;

    // Insert game metadata into the public.games table
    const { data: gameData, error: insertError } = await supabase
      .from('games')
      .insert({
        title,
        description,
        file_url: fileUrl,
        uploaded_by: user.id,
      })
      .select()
      .single();

    if (insertError) {
      // If database insert fails, try to delete the uploaded file to clean up
      await supabase.storage.from('games').remove([filePath]);
      throw new Error(`Failed to create game entry: ${insertError.message}`);
    }

    return new Response(
      JSON.stringify({ message: "Game created successfully", game: gameData }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})