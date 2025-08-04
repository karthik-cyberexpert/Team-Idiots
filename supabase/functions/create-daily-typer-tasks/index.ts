import { serve } from "https://deno.land/std@0.200.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.47.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (_req) => {
  // This function should be triggered by a cron job.
  if (_req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // 1. Get all non-admin users
    const { data: users, error: usersError } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('role', 'user');
    if (usersError) throw usersError;
    if (!users || users.length === 0) throw new Error("No users found.");

    // 2. Get all available typing texts
    const { data: allTexts, error: textsError } = await supabaseAdmin
      .from('typing_texts')
      .select('id');
    if (textsError) throw textsError;
    if (!allTexts || allTexts.length === 0) throw new Error("No typing texts available to create tasks.");

    const tasksToInsert = [];
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    for (const user of users) {
      // 3. Check if user already has a typer task for today
      const { data: existingTask, error: existingTaskError } = await supabaseAdmin
        .from('tasks')
        .select('id')
        .eq('assigned_to', user.id)
        .eq('task_type', 'typer')
        .gte('created_at', `${today}T00:00:00.000Z`)
        .lte('created_at', `${today}T23:59:59.999Z`)
        .limit(1)
        .single();

      if (existingTaskError && existingTaskError.code !== 'PGRST116') { // Ignore 'No rows found' error
        console.error(`Error checking existing task for user ${user.id}:`, existingTaskError.message);
        continue; // Skip to next user
      }

      if (!existingTask) {
        // 4. Select a random text for the new task
        const randomText = allTexts[Math.floor(Math.random() * allTexts.length)];
        
        const dueDate = new Date();
        dueDate.setHours(23, 59, 59, 999); // End of today

        tasksToInsert.push({
          title: "Daily Typing Challenge",
          description: "Complete the typing test to earn XP and improve your skills!",
          assigned_to: user.id,
          assigned_by: user.id, // Self-assigned by the system
          status: 'pending',
          due_date: dueDate.toISOString(),
          task_type: 'typer',
          related_typing_text_id: randomText.id,
        });
      }
    }

    // 5. Bulk insert new tasks
    if (tasksToInsert.length > 0) {
      const { error: insertError } = await supabaseAdmin
        .from('tasks')
        .insert(tasksToInsert);
      if (insertError) throw insertError;
    }

    return new Response(
      JSON.stringify({ message: `Successfully created ${tasksToInsert.length} daily typer tasks.` }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})