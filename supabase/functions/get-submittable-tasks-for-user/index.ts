import { serve } from "https://deno.land/std@0.200.0/http/server.ts"
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.47.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function getAuthenticatedClient(req: Request): Promise<SupabaseClient> {
  const authHeader = req.headers.get('Authorization')!
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { global: { headers: { Authorization: authHeader } } }
  )
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = await getAuthenticatedClient(req);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated.");

    const now = new Date().toISOString();

    // Fetch tasks that are pending or rejected, not yet submitted, and not overdue.
    const { data, error } = await supabase
      .from('tasks')
      .select('id, title, task_submissions!left(id)')
      .eq('assigned_to', user.id)
      .in('status', ['pending', 'rejected'])
      .is('task_submissions.id', null)
      .or(`due_date.is.null,due_date.gte.${now}`);

    if (error) throw error;
    
    const submittableTasks = data?.filter(task => !task.task_submissions || task.task_submissions.length === 0)
      .map(({ task_submissions, ...rest }) => rest);

    return new Response(JSON.stringify(submittableTasks), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
})