import { serve } from "https://deno.land/std@0.200.0/http/server.ts"
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.47.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function getAuthenticatedAdminClient(req: Request): Promise<SupabaseClient> {
  const authHeader = req.headers.get('Authorization')!
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { global: { headers: { Authorization: authHeader } } }
  )
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Not authenticated")

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') {
    throw new Error("Not authorized")
  }
  
  // Return admin client for subsequent operations
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { taskId } = await req.json()
    if (!taskId) {
      throw new Error("Task ID is required.")
    }

    const supabaseAdmin = await getAuthenticatedAdminClient(req);

    // 1. Delete the submission
    const { error: deleteError } = await supabaseAdmin
      .from('task_submissions')
      .delete()
      .eq('task_id', taskId);

    if (deleteError) throw deleteError;

    // 2. Update the task status back to 'pending'
    const { data: taskData, error: updateError } = await supabaseAdmin
      .from('tasks')
      .update({ status: 'pending', completed_at: null })
      .eq('id', taskId)
      .select('assigned_to, title')
      .single();

    if (updateError) throw updateError;

    // 3. Send a notification to the user
    if (taskData) {
        await supabaseAdmin.from('notifications').insert({
            user_id: taskData.assigned_to,
            message: `Your submission for "${taskData.title}" was returned. Please review and resubmit.`,
            link_to: '/dashboard/tasks'
        });
    }

    return new Response(
      JSON.stringify({ message: "Task returned to user for revision." }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})