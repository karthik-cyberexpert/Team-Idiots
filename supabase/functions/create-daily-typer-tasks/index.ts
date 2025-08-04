import { serve } from "https://deno.land/std@0.200.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.47.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (_req) => {
  if (_req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    // 1. Find active typer sets for today
    const { data: activeSets, error: setsError } = await supabaseAdmin
      .from('typer_sets')
      .select('id, title, assign_date, typing_texts(id)')
      .eq('status', 'published')
      .lte('assign_date', todayStr);
    if (setsError) throw setsError;

    if (!activeSets || activeSets.length === 0) {
      return new Response(JSON.stringify({ message: "No active typer sets for today." }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Filter sets that are within their 7-day window
    const validSets = activeSets.filter(set => {
      const assignDate = new Date(set.assign_date);
      const diffDays = (today.getTime() - assignDate.getTime()) / (1000 * 3600 * 24);
      return diffDays >= 0 && diffDays < 7;
    });

    if (validSets.length === 0) {
      return new Response(JSON.stringify({ message: "No valid typer sets for today's date." }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    
    // For simplicity, use the most recently assigned valid set
    const currentSet = validSets.sort((a, b) => new Date(b.assign_date).getTime() - new Date(a.assign_date).getTime())[0];
    const textIdsInSet = currentSet.typing_texts.map(t => t.id);

    // 2. Get all non-admin users
    const { data: users, error: usersError } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('role', 'user');
    if (usersError) throw usersError;
    if (!users || users.length === 0) throw new Error("No users found.");

    const tasksToInsert = [];

    for (const user of users) {
      // 3. Check if user already has a typer task for today
      const { data: existingTask } = await supabaseAdmin
        .from('tasks')
        .select('id')
        .eq('assigned_to', user.id)
        .eq('task_type', 'typer')
        .gte('created_at', `${todayStr}T00:00:00.000Z`)
        .lte('created_at', `${todayStr}T23:59:59.999Z`)
        .limit(1).single();
      
      if (existingTask) continue;

      // 4. Find texts from the current set that the user has NOT been assigned yet
      const { data: assignedTasks } = await supabaseAdmin
        .from('tasks')
        .select('related_typing_text_id')
        .eq('assigned_to', user.id)
        .in('related_typing_text_id', textIdsInSet);
      
      const assignedTextIds = new Set(assignedTasks?.map(t => t.related_typing_text_id));
      const availableTextIds = textIdsInSet.filter(id => !assignedTextIds.has(id));

      if (availableTextIds.length > 0) {
        const randomTextId = availableTextIds[Math.floor(Math.random() * availableTextIds.length)];
        
        const dueDate = new Date();
        dueDate.setHours(23, 59, 59, 999);

        tasksToInsert.push({
          title: `Daily Typing Challenge: ${currentSet.title}`,
          description: "Complete the typing test to earn XP and improve your skills!",
          assigned_to: user.id,
          assigned_by: user.id, // System assigned
          status: 'pending',
          due_date: dueDate.toISOString(),
          task_type: 'typer',
          related_typing_text_id: randomTextId,
        });
      }
    }

    // 5. Bulk insert new tasks
    if (tasksToInsert.length > 0) {
      const { error: insertError } = await supabaseAdmin.from('tasks').insert(tasksToInsert);
      if (insertError) throw insertError;
    }

    return new Response(JSON.stringify({ message: `Successfully created ${tasksToInsert.length} daily typer tasks.` }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})