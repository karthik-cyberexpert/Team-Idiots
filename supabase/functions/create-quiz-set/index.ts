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
    const { title, questions } = await req.json()
    if (!title || !Array.isArray(questions) || questions.length === 0) {
      throw new Error("Title and a non-empty array of questions are required.")
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // 1. Create the quiz set
    const { data: set, error: setError } = await supabaseAdmin
      .from('quiz_sets')
      .insert({ title: title, status: 'draft' })
      .select()
      .single()
    
    if (setError) throw setError

    // 2. Prepare questions with the new set_id
    const questionsToInsert = questions.map((q, index) => {
      if (!q.question || !Array.isArray(q.options) || q.options.length < 2 || typeof q.correct_option_index !== 'number') {
        throw new Error(`Question at index ${index} is malformed.`);
      }
      return {
        question: q.question,
        options: q.options,
        correct_option_index: q.correct_option_index,
        set_id: set.id,
      }
    })

    // 3. Insert the questions
    const { error: questionsError } = await supabaseAdmin
      .from('quiz_questions')
      .insert(questionsToInsert);

    if (questionsError) {
      // Rollback: delete the set if questions fail to insert
      await supabaseAdmin.from('quiz_sets').delete().eq('id', set.id);
      throw questionsError;
    }

    return new Response(
      JSON.stringify({ message: "Quiz set created successfully." }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})