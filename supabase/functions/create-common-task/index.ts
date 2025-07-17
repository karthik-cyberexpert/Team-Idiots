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
    const { title, description, dueDate, assignedBy, customXpAward, customDueDays } = await req.json()
    if (!title || !assignedBy) {
      throw new Error("Title and assigner ID are required.")
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Fetch all user IDs from the profiles table
    const { data: users, error: usersError } = await supabaseAdmin
      .from('profiles')
      .select('id');

    if (usersError) throw usersError;
    if (!users || users.length === 0) throw new Error("No users found to assign tasks to.");

    const tasksToInsert = users.map(user => ({
      title,
      description: description || null,
      due_date: dueDate, // dueDate is already calculated in the frontend
      assigned_by: assignedBy,
      assigned_to: user.id,
      status: 'pending',
      is_common_task: true,
      custom_xp_award: customXpAward || null,
      custom_due_days: customDueDays || null,
    }));

    const { error: insertError } = await supabaseAdmin
      .from('tasks')
      .insert(tasksToInsert);

    if (insertError) throw insertError;

    return new Response(
      JSON.stringify({ message: "Common task created successfully for all users." }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})