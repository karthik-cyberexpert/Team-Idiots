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
    const tasksToUpload = await req.json()
    if (!Array.isArray(tasksToUpload)) {
      throw new Error("Request body must be an array of tasks.");
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Fetch all user profiles to map emails to IDs
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name'); // Fetch full_name for better error messages
    
    if (profilesError) throw profilesError;
    const profileMap = new Map(profiles.map(p => [p.full_name.toLowerCase(), p.id]));

    const tasksToInsert = [];
    for (const task of tasksToUpload) {
      if (!task.title || !task.assignedToFullName || !task.assignedByUserId) {
        throw new Error("Each task object must have 'title', 'assignedToFullName', and 'assignedByUserId' properties.");
      }

      const assignedToId = profileMap.get(task.assignedToFullName.toLowerCase());
      if (!assignedToId) {
        throw new Error(`User with full name '${task.assignedToFullName}' not found.`);
      }

      tasksToInsert.push({
        title: task.title,
        description: task.description || null,
        assigned_to: assignedToId,
        assigned_by: task.assignedByUserId, // Assuming assignedByUserId is the UUID of the admin uploading
        status: 'pending',
        due_date: task.dueDate || null, // dueDate should be ISO string or null
      });
    }

    if (tasksToInsert.length === 0) {
      return new Response(
        JSON.stringify({ message: "No valid tasks to upload." }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { error: insertError } = await supabaseAdmin
      .from('tasks')
      .insert(tasksToInsert);

    if (insertError) throw insertError;

    return new Response(
      JSON.stringify({ message: `${tasksToInsert.length} tasks uploaded successfully.` }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})