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
    const { noteId } = await req.json();
    if (!noteId) {
      throw new Error("Note ID is required.");
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const { data: note, error: fetchError } = await supabaseAdmin
      .from('notes')
      .select('document_url')
      .eq('id', noteId)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return new Response(JSON.stringify({ message: "Note not found, assumed already deleted." }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      throw fetchError;
    }

    if (note.document_url) {
      const urlParts = note.document_url.split('/note_documents/');
      if (urlParts.length > 1) {
        const filePath = decodeURIComponent(urlParts[1]);
        const { error: storageError } = await supabaseAdmin.storage
          .from('note_documents')
          .remove([filePath]);
        
        if (storageError) {
          console.error(`Failed to delete file from storage: ${storageError.message}`);
        }
      }
    }

    const { error: dbError } = await supabaseAdmin
      .from('notes')
      .delete()
      .eq('id', noteId);

    if (dbError) {
      throw dbError;
    }

    return new Response(
      JSON.stringify({ message: "Note and associated document deleted successfully" }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})