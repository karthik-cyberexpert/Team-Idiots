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

    const { taskId, content, fileUrl } = await req.json();
    if (!taskId) throw new Error("Task ID is required.");

    // Server-side validation to check if the task is overdue
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .select('due_date, status')
      .eq('id', taskId)
      .single();

    if (taskError) throw taskError;
    if (!task) throw new Error("Task not found.");

    if (task.due_date && new Date(task.due_date) < new Date()) {
        throw new Error("This task is overdue and can no longer be submitted.");
    }

    const submissionData = {
      task_id: taskId,
      user_id: user.id,
      content: content || null,
      file_url: fileUrl || null,
      submitted_at: new Date().toISOString(),
    };

    const { error: upsertError } = await supabase
      .from('task_submissions')
      .upsert(submissionData, { onConflict: 'task_id,user_id' });

    if (upsertError) throw upsertError;

    const { error: taskUpdateError } = await supabase
      .from('tasks')
      .update({ status: 'waiting_for_approval', completed_at: new Date().toISOString() })
      .eq('id', taskId);

    if (taskUpdateError) throw taskUpdateError;

    return new Response(JSON.stringify({ message: "Submission saved successfully." }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
})