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
    let page = 1;
    let perPage = 10;

    // Safely parse JSON body if it exists and is not empty
    if (req.headers.get('content-type')?.includes('application/json') && req.body) {
      const body = await req.json();
      page = body.page ? parseInt(body.page, 10) : 1;
      perPage = body.perPage ? parseInt(body.perPage, 10) : 10;
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Get users from auth with pagination
    const { data: { users }, error: usersError } = await supabaseAdmin.auth.admin.listUsers({
      page: page,
      perPage: perPage,
    });
    if (usersError) throw usersError;

    // Get all profiles (or consider paginating profiles if there are many)
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from('profiles')
      .select('id, role, full_name, xp, game_points'); // Fetch game_points here
    if (profilesError) throw profilesError;

    // Create a map of profiles for efficient lookup
    const profilesMap = new Map(profiles.map(p => [p.id, p]));

    // Combine user and profile data
    const combinedUsers = users.map(user => {
      const profile = profilesMap.get(user.id);
      return {
        id: user.id,
        email: user.email,
        full_name: profile?.full_name || user.user_metadata?.full_name || 'N/A',
        role: profile?.role || 'user',
        xp: profile?.xp || 0,
        game_points: profile?.game_points || 0, // Assign game_points from profile
        created_at: user.created_at,
      };
    });

    // Get total count for pagination metadata
    const { count, error: countError } = await supabaseAdmin
      .from('profiles')
      .select('*', { count: 'exact', head: true });
    if (countError) throw countError;

    return new Response(
      JSON.stringify({ users: combinedUsers, totalCount: count }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})