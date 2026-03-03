import { createClient as createSupabaseClient } from "@supabase/supabase-js";

let supabaseClient: any = null;

export const createClient = () => {
  if (!supabaseClient) {
    supabaseClient = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }
  return supabaseClient;
};

