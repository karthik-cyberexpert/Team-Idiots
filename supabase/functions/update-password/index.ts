import { serve } from "https://deno.land/std@0.200.0/http/server.ts"
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.47.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function getAuthenticatedClient(req: Request): Promise<SupabaseClient> {
  const authHeader = req.headers.get('Authorization')!
  if (!authHeader) {
    throw new Error("Missing Authorization header");
  }
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
    const { oldPassword, newPassword } = await req.json()
    if (!oldPassword || !newPassword) {
      throw new Error("Old and new passwords are required.")
    }

    const supabase = await getAuthenticatedClient(req);
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new Error("User not authenticated.");
    }

    // Verify the old password by attempting to sign in with it.
    // This is a secure way to check credentials without exposing a direct verification endpoint.
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email!,
      password: oldPassword,
    });

    if (signInError) {
      // Return a clear error if the old password is not correct.
      return new Response(
        JSON.stringify({ error: "Incorrect old password." }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // If the old password was correct, create an admin client to update the password.
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      user.id,
      { password: newPassword }
    )

    if (updateError) {
      throw updateError;
    }

    return new Response(
      JSON.stringify({ message: "Password updated successfully" }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})