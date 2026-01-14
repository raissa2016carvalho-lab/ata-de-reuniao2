import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseKey)

// Interface para Reuniões de Segurança (tabela: meetings)
export interface Meeting {
  id: string;
  date: string;
  presentations: number;
  actions: number;
  completed: number;
  pending: number;
  csv_data?: string;
  created_at?: string;
  tipo?: string;
}

// Interface para Atas Gerais (tabela: meetings_general)
export interface MeetingGeneral {
  id: string;
  date: string;
  participants: Array<{
    id: string;
    name: string;
    area: string;
  }>;
  objetivo?: string;
  pauta: string[];
  transcript?: string;
  actions: Array<{
    text: string;
    area: string;
    done: boolean;
  }>;
  total_actions: number;
  completed_actions: number;
  pending_actions: number;
  csv_data?: string;
  created_at?: string;
}
