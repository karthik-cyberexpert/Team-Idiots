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
    const { userId, email, password, fullName, role } = await req.json()

    if (!userId) {
      throw new Error("User ID is required.")
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Prepare update data for auth.users
    const authUpdateData: { email?: string; password?: string; user_metadata?: { full_name?: string } } = {};
    if (email) authUpdateData.email = email;
    if (password) authUpdateData.password = password;
    if (fullName) authUpdateData.user_metadata = { full_name: fullName };

    // Update user in auth.users
    if (Object.keys(authUpdateData).length > 0) {
      const { error: authUpdateError } = await supabaseAdmin.auth.admin.updateUserById(
        userId,
        authUpdateData
      );
      if (authUpdateError) throw authUpdateError;
    }

    // Update user profile in public.profiles
    const { error: profileUpdateError } = await supabaseAdmin
      .from('profiles')
      .update({ full_name: fullName, role })
      .eq('id', userId);

    if (profileUpdateError) throw profileUpdateError;

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