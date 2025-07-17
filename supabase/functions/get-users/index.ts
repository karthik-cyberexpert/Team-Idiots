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
    const { page, perPage } = await req.json();
    const pageNumber = page ? parseInt(page, 10) : 1;
    const itemsPerPage = perPage ? parseInt(perPage, 10) : 10; // Default to 10 items per page

    // Create a Supabase client with the service role key to bypass RLS
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Get users from auth with pagination
    const { data: { users }, error: usersError } = await supabaseAdmin.auth.admin.listUsers({
      page: pageNumber,
      perPage: itemsPerPage,
    });
    if (usersError) throw usersError;

    // Get all profiles (or consider paginating profiles if there are many)
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from('profiles')
      .select('id, role, full_name, xp'); // Fetch XP here
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
        xp: profile?.xp || 0, // Assign XP from profile
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