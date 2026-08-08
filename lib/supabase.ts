import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ssufeynnfgnaefolilro.supabase.co';
const supabaseAnonKey = 'sb_publishable_h8ZdnB6PKp11ExNr7hf4Yg_r5oirsUM';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
