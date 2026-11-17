import { createClient } from "@supabase/supabase-js";
import { validateSupabaseConfig } from "./supabaseConfig";

const url = import.meta.env.VITE_SUPABASE_URL?.trim();
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();
export const supabaseConfigurationError = validateSupabaseConfig(url, key);
export const isSupabaseConfigured = !supabaseConfigurationError;
// Nunca utilizar service_role ni secret key en el navegador.
export const supabase = isSupabaseConfigured ? createClient(url!, key!, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
}) : null;
