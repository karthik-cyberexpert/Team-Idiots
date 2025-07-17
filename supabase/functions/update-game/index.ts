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
    const gameId = formData.get('gameId') as string;
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const gameFile = formData.get('gameFile') as File | null; // Can be null if not updating file

    if (!gameId || !title) {
      throw new Error("Game ID and title are required.");
    }

    let newFileUrl: string | undefined;
    let oldFilePath: string | undefined;

    if (gameFile) {
      // Fetch current game to get old file_url
      const { data: currentGame, error: fetchError } = await supabase
        .from('games')
        .select('file_url')
        .eq('id', gameId)
        .single();

      if (fetchError) throw new Error(`Failed to fetch current game: ${fetchError.message}`);
      if (!currentGame) throw new Error("Game not found.");

      // Extract old file path from URL
      const urlParts = currentGame.file_url.split('/public/games/');
      if (urlParts.length > 1) {
        oldFilePath = urlParts[1];
      }

      // Upload new file
      const filePath = `${user.id}/${Date.now()}-${gameFile.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('games')
        .upload(filePath, gameFile, {
          contentType: gameFile.type,
          upsert: true, // Upsert to replace if file with same name exists (though timestamp makes it unique)
        });

      if (uploadError) {
        throw new Error(`File upload failed: ${uploadError.message}`);
      }
      newFileUrl = `${Deno.env.get('SUPABASE_URL')}/storage/v1/object/public/games/${filePath}`;
    }

    // Update game metadata in the public.games table
    const updateData: { title: string; description: string; file_url?: string; updated_at: string } = {
      title,
      description,
      updated_at: new Date().toISOString(),
    };
    if (newFileUrl) {
      updateData.file_url = newFileUrl;
    }

    const { data: gameData, error: updateError } = await supabase
      .from('games')
      .update(updateData)
      .eq('id', gameId)
      .select()
      .single();

    if (updateError) {
      // If database update fails, try to delete the newly uploaded file if any
      if (newFileUrl && oldFilePath) {
        await supabase.storage.from('games').remove([newFileUrl.split('/public/games/')[1]]);
      }
      throw new Error(`Failed to update game entry: ${updateError.message}`);
    }

    // If a new file was uploaded and the old file path exists, delete the old file
    if (newFileUrl && oldFilePath) {
      await supabase.storage.from('games').remove([oldFilePath]);
    }

    return new Response(
      JSON.stringify({ message: "Game updated successfully", game: gameData }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})