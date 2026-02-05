import { createClient } from '@supabase/supabase-js';

// Using the credentials provided
const supabaseUrl = process.env.SUPABASE_URL || 'https://ftaiqcvtxguxwomjujuh.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY || 'sb_publishable_mowRG5xUq3caYwTFeE_RTg_l_p-EV0G';

if (!supabaseUrl || !supabaseKey) {
  console.warn("Supabase credentials might be missing or invalid.");
}

export const supabase = createClient(supabaseUrl, supabaseKey);
