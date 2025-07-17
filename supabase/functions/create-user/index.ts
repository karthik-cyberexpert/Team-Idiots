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
    const { email, password, fullName, role } = await req.json()
    if (!email || !password || !fullName || !role) {
      throw new Error("Email, password, full name, and role are required.")
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Create the user in auth.users
    const { data: { user }, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Automatically confirm the email
      user_metadata: { full_name: fullName },
    })

    if (createError) throw createError;
    if (!user) throw new Error("User creation failed.");

    // The handle_new_user trigger automatically creates a profile with the default 'user' role.
    // If the role is 'admin', we need to update the profile.
    if (role === 'admin') {
      const { error: updateError } = await supabaseAdmin
        .from('profiles')
        .update({ role: 'admin' })
        .eq('id', user.id);

      if (updateError) {
        // If updating the role fails, we should ideally delete the created user for consistency.
        await supabaseAdmin.auth.admin.deleteUser(user.id);
        throw new Error(`Failed to set user role: ${updateError.message}`);
      }
    }

    return new Response(
      JSON.stringify({ message: "User created successfully" }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})