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
    const { userId, email, password, fullName, role, avatar_url } = await req.json()

    if (!userId) {
      throw new Error("User ID is required.")
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Prepare update data for auth.users
    const authUpdateData: { email?: string; password?: string; user_metadata?: { full_name?: string, avatar_url?: string } } = {};
    if (email) authUpdateData.email = email;
    if (password) authUpdateData.password = password;
    
    const user_metadata: { full_name?: string, avatar_url?: string } = {};
    if (fullName) user_metadata.full_name = fullName;
    if (avatar_url) user_metadata.avatar_url = avatar_url;
    if (Object.keys(user_metadata).length > 0) {
      authUpdateData.user_metadata = user_metadata;
    }

    // Update user in auth.users
    if (Object.keys(authUpdateData).length > 0) {
      const { error: authUpdateError } = await supabaseAdmin.auth.admin.updateUserById(
        userId,
        authUpdateData
      );
      if (authUpdateError) throw authUpdateError;
    }

    // Update user profile in public.profiles
    // The trigger will handle syncing full_name and avatar_url, but we still need to update the role here.
    if (role) {
      const { error: profileUpdateError } = await supabaseAdmin
        .from('profiles')
        .update({ role })
        .eq('id', userId);

      if (profileUpdateError) throw profileUpdateError;
    }

    return new Response(
      JSON.stringify({ message: "User updated successfully" }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})