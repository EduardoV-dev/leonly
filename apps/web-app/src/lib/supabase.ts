import { ENVIRONMENT_VARIABLES } from '@/constants/environment-variables';
import { createClient } from '@supabase/supabase-js';

const {
  NEXT_PUBLIC_SUPABASE_URL: supabaseUrl,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: supabasePublishableKey,
} = ENVIRONMENT_VARIABLES;

if (!supabaseUrl) {
  throw new Error('NEXT_PUBLIC_SUPABASE_URL is required');
}

if (!supabasePublishableKey) {
  throw new Error('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY is required');
}

export const supabase = createClient(supabaseUrl, supabasePublishableKey);
