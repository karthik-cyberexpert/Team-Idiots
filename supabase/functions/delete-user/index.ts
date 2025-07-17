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
    const { userId } = await req.json()
    if (!userId) {
      throw new Error("User ID is required.")
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Manually cascade delete all data related to the user
    await supabaseAdmin.from('messages').delete().eq('user_id', userId)
    await supabaseAdmin.from('notes').delete().eq('user_id', userId)
    await supabaseAdmin.from('code_documents').delete().eq('user_id', userId)
    await supabaseAdmin.from('tasks').delete().eq('assigned_to', userId)
    await supabaseAdmin.from('tasks').delete().eq('assigned_by', userId)
    await supabaseAdmin.from('xp_history').delete().eq('user_id', userId)
    await supabaseAdmin.from('game_session_participants').delete().eq('user_id', userId)
    await supabaseAdmin.from('game_sessions').delete().eq('host_id', userId)
    await supabaseAdmin.from('games').delete().eq('uploaded_by', userId)
    
    // Delete the profile itself
    await supabaseAdmin.from('profiles').delete().eq('id', userId)

    // Finally, delete the user from the auth schema
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId)

    if (authError) {
      throw authError
    }

    return new Response(
      JSON.stringify({ message: "User and all related data deleted successfully" }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})