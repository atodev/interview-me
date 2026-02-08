import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL ?? '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY ?? '';

/**
 * Server-side Supabase client using the service-role key.
 * Has full access — bypasses RLS. Only use on the server.
 */
export const supabase = createClient(supabaseUrl, supabaseServiceKey);
