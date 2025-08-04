import { serve } from "https://deno.land/std@0.200.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.47.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// The scoring formula to make high scores difficult to achieve
const calculateBonusPoints = (wpm: number, accuracy: number): number => {
  if (accuracy < 80) return 0; // Minimum accuracy to qualify for bonus

  const wpmNormalized = Math.min(wpm, 150) / 150;
  const accuracyNormalized = accuracy / 100;

  // Heavily weight accuracy. (accuracy)^4 makes it so 95% accuracy is ~0.81, while 99% is ~0.96
  const score = 50 * wpmNormalized * Math.pow(accuracyNormalized, 4);
  
  return Math.round(score);
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const todayStr = new Date().toISOString().split('T')[0];

    // 1. Find all daily typer tasks for today
    const { data: dailyTasks, error: tasksError } = await supabaseAdmin
      .from('tasks')
      .select('id, assigned_to, related_typing_text_id')
      .eq('task_type', 'typer')
      .gte('created_at', `${todayStr}T00:00:00.000Z`)
      .lte('created_at', `${todayStr}T23:59:59.999Z`);

    if (tasksError) throw tasksError;
    if (!dailyTasks || dailyTasks.length === 0) {
      return new Response(JSON.stringify({ message: "No daily tasks found for today." }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const userPointsUpdates = new Map<string, number>();

    // 2. For each task, find the best game result
    for (const task of dailyTasks) {
      const { data: results, error: resultsError } = await supabaseAdmin
        .from('typing_game_results')
        .select('wpm, accuracy')
        .eq('user_id', task.assigned_to)
        .eq('text_id', task.related_typing_text_id)
        .gte('created_at', `${todayStr}T00:00:00.000Z`)
        .lte('created_at', `${todayStr}T23:59:59.999Z`);

      if (resultsError) {
        console.error(`Error fetching results for user ${task.assigned_to}:`, resultsError.message);
        continue; // Skip to next user
      }

      if (results && results.length > 0) {
        // Find the best result (e.g., highest score = wpm * accuracy)
        const bestResult = results.reduce((best, current) => {
          return (current.wpm * current.accuracy) > (best.wpm * best.accuracy) ? current : best;
        });

        // 3. Calculate bonus points
        const bonusPoints = calculateBonusPoints(bestResult.wpm, bestResult.accuracy);
        
        if (bonusPoints > 0) {
          userPointsUpdates.set(task.assigned_to, (userPointsUpdates.get(task.assigned_to) || 0) + bonusPoints);
        }
      }
    }

    // 4. Bulk update user profiles with the new points
    if (userPointsUpdates.size > 0) {
      const { data: profiles, error: fetchProfilesError } = await supabaseAdmin
        .from('profiles')
        .select('id, game_points')
        .in('id', Array.from(userPointsUpdates.keys()));

      if (fetchProfilesError) throw fetchProfilesError;

      const updates = profiles.map(p => ({
        id: p.id,
        game_points: p.game_points + (userPointsUpdates.get(p.id) || 0),
      }));

      const { error: updateError } = await supabaseAdmin
        .from('profiles')
        .upsert(updates);

      if (updateError) throw updateError;
    }

    return new Response(
      JSON.stringify({ message: `Successfully calculated and awarded daily game points for ${userPointsUpdates.size} users.` }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})