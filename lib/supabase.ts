import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseKey)

export interface Meeting {
  id: string
  date: string
  presentations: number
  actions: number
  completed: number
  pending: number
  csv_data?: string
  created_at?: string
}
