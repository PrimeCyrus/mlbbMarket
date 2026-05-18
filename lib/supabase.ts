
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export const supabaseEnabled = !!supabaseUrl && !!supabaseKey

// Create a dummy client if not configured to prevent crashes
export const supabase = supabaseEnabled
  ? createClient(supabaseUrl!, supabaseKey!)
  : createClient('https://placeholder.supabase.co', 'placeholder-key')
