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
    // Use service role key for admin actions to bypass RLS if needed,
    // but for fetching all games, standard client might be sufficient if RLS allows.
    // For admin view, it's safer to use admin client.
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const { data: games, error } = await supabaseAdmin
      .from('games')
      .select(`
        id,
        title,
        description,
        file_url,
        uploaded_by,
        created_at,
        updated_at,
        profiles (full_name)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch games: ${error.message}`);
    }

    // Map the data to include the uploader's full name directly
    const formattedGames = games.map(game => ({
      ...game,
      uploader_name: game.profiles?.full_name || 'Unknown',
    }));

    return new Response(
      JSON.stringify({ games: formattedGames }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})