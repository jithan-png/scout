import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL!;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!url || !key) {
  console.warn("Supabase env vars not set — permit features will be unavailable.");
}

// Server-side only — uses service role key, never expose to client
export const supabase = createClient(url ?? "", key ?? "");
