import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { gameId } = await req.json()
    if (!gameId) {
      throw new Error("Game ID is required.")
    }

    // Use service role key for admin actions to bypass RLS
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // First, get the file_url from the game entry
    const { data: game, error: fetchError } = await supabaseAdmin
      .from('games')
      .select('file_url')
      .eq('id', gameId)
      .single();

    if (fetchError) {
      throw new Error(`Failed to fetch game: ${fetchError.message}`);
    }
    if (!game) {
      throw new Error("Game not found.");
    }

    // Extract the file path from the URL
    const urlParts = game.file_url.split('/public/games/');
    let filePathToDelete: string | undefined;
    if (urlParts.length > 1) {
      filePathToDelete = urlParts[1];
    }

    // Delete the game entry from the database
    const { error: deleteDbError } = await supabaseAdmin
      .from('games')
      .delete()
      .eq('id', gameId);

    if (deleteDbError) {
      throw new Error(`Failed to delete game from database: ${deleteDbError.message}`);
    }

    // If a file path was found, delete the file from storage
    if (filePathToDelete) {
      const { error: deleteFileError } = await supabaseAdmin.storage
        .from('games')
        .remove([filePathToDelete]);

      if (deleteFileError) {
        console.error(`Failed to delete file from storage: ${deleteFileError.message}`);
        // Continue even if file deletion fails, as the database entry is already removed
      }
    }

    return new Response(
      JSON.stringify({ message: "Game deleted successfully" }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})