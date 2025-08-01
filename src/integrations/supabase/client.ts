// This file is automatically generated. Do not edit it directly.
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://dlzrqqbksdookwdllydp.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRsenJxcWJrc2Rvb2t3ZGxseWRwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI0OTU5NTIsImV4cCI6MjA2ODA3MTk1Mn0.R6LPbAVLpjkdLAsi5O3EMvkI_6eLzY6fTX7lcLrEGSg";

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});